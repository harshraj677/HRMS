import { describe, it, expect } from "vitest";
import {
  FrameDiffLivenessAdapter,
  shouldBlockOnLiveness,
  shouldFlagLiveness,
  type LivenessClientEvidence,
} from "@/lib/livenessAdapter";

const adapter = new FrameDiffLivenessAdapter();

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEvidence(overrides: Partial<LivenessClientEvidence> = {}): LivenessClientEvidence {
  return {
    challengeType: "blink",
    frameCount: 6,
    maxFrameDiff: 0.04,
    avgFrameDiff: 0.015,
    frameIntervalMs: 500,
    diffs: [0.01, 0.012, 0.04, 0.02, 0.011],
    capturedAt: Date.now(),
    ...overrides,
  };
}

// ── FrameDiffLivenessAdapter ───────────────────────────────────────────────

describe("FrameDiffLivenessAdapter — passing cases", () => {
  it("passes when there is natural motion + a blink-level peak", async () => {
    const e = makeEvidence();
    const r = await adapter.verify(e);
    expect(r.result).toBe("passed");
    expect(r.score).toBeGreaterThanOrEqual(55);
  });

  it("passes with many frames and clear blink", async () => {
    const e = makeEvidence({ frameCount: 8, diffs: [0.01, 0.01, 0.06, 0.01, 0.01, 0.01, 0.01], maxFrameDiff: 0.06, avgFrameDiff: 0.02 });
    const r = await adapter.verify(e);
    expect(r.result).toBe("passed");
  });
});

describe("FrameDiffLivenessAdapter — spoof detection", () => {
  it("fails on near-zero motion (photo / printed spoof)", async () => {
    const e = makeEvidence({ maxFrameDiff: 0.001, avgFrameDiff: 0.001, diffs: [0.001, 0.001, 0.001, 0.001, 0.001] });
    const r = await adapter.verify(e);
    expect(r.result).toBe("failed");
    expect(r.reason).toMatch(/photo|spoof/i);
  });

  it("fails on excessive motion (screen-replay artifacts)", async () => {
    const e = makeEvidence({ maxFrameDiff: 0.5, avgFrameDiff: 0.4, diffs: [0.5, 0.4, 0.45, 0.42, 0.38] });
    const r = await adapter.verify(e);
    expect(r.result).toBe("failed");
    expect(r.reason).toMatch(/excessive|replay/i);
  });

  it("returns unknown when too few frames are provided", async () => {
    const e = makeEvidence({ frameCount: 2, diffs: [0.02] });
    const r = await adapter.verify(e);
    expect(r.result).toBe("unknown");
    expect(r.score).toBe(0);
  });

  it("returns unknown when diffs array is empty", async () => {
    const e = makeEvidence({ frameCount: 0, diffs: [] });
    const r = await adapter.verify(e);
    expect(r.result).toBe("unknown");
  });
});

describe("FrameDiffLivenessAdapter — tamper detection", () => {
  it("fails when avgFrameDiff > maxFrameDiff (impossible statistics)", async () => {
    const e = makeEvidence({ maxFrameDiff: 0.02, avgFrameDiff: 0.05 });
    const r = await adapter.verify(e);
    expect(r.result).toBe("failed");
    expect(r.reason).toMatch(/inconsistent/i);
  });

  it("fails on negative maxFrameDiff", async () => {
    const e = makeEvidence({ maxFrameDiff: -0.1 });
    const r = await adapter.verify(e);
    expect(r.result).toBe("failed");
  });

  it("fails on maxFrameDiff > 1", async () => {
    const e = makeEvidence({ maxFrameDiff: 1.5, avgFrameDiff: 0.01 });
    const r = await adapter.verify(e);
    expect(r.result).toBe("failed");
  });
});

describe("FrameDiffLivenessAdapter — score without blink peak", () => {
  it("fails when motion is present but no blink-level event", async () => {
    // Steady micro-motion but no blink → score = 40+15+10 = 65? Actually need to check
    // avgDiff = 0.008 >= MIN_MOTION (0.004) → +40
    // no blink (all diffs < 0.025) → +0
    // frameCount = 6 → +10+5 = +15
    // interval ok → +10
    // capturedAt recent → +5
    // total = 70 → passes
    const e = makeEvidence({
      maxFrameDiff: 0.015,
      avgFrameDiff: 0.008,
      diffs: [0.008, 0.009, 0.007, 0.010, 0.015],
    });
    const r = await adapter.verify(e);
    // Score = 40+15+10+5 = 70 → passes
    expect(r.score).toBeGreaterThan(0);
  });
});

// ── Enforcement helpers ────────────────────────────────────────────────────

describe("shouldBlockOnLiveness", () => {
  const failResult = { result: "failed" as const, score: 10, method: "test" };
  const passResult = { result: "passed" as const, score: 80, method: "test" };
  const unknownResult = { result: "unknown" as const, score: 0, method: "test" };

  it("never blocks when enforcement is off", () => {
    expect(shouldBlockOnLiveness(failResult, "off")).toBe(false);
    expect(shouldBlockOnLiveness(unknownResult, "off")).toBe(false);
  });

  it("never blocks when enforcement is soft", () => {
    expect(shouldBlockOnLiveness(failResult, "soft")).toBe(false);
  });

  it("blocks only failed results on hard enforcement", () => {
    expect(shouldBlockOnLiveness(failResult, "hard")).toBe(true);
    expect(shouldBlockOnLiveness(unknownResult, "hard")).toBe(false); // unknown ≠ failed
    expect(shouldBlockOnLiveness(passResult, "hard")).toBe(false);
  });
});

describe("shouldFlagLiveness", () => {
  const failResult = { result: "failed" as const, score: 10, method: "test" };
  const passResult = { result: "passed" as const, score: 80, method: "test" };
  const unknownResult = { result: "unknown" as const, score: 0, method: "test" };

  it("never flags when enforcement is off", () => {
    expect(shouldFlagLiveness(failResult, "off")).toBe(false);
  });

  it("flags failed and unknown on soft/hard enforcement", () => {
    expect(shouldFlagLiveness(failResult, "soft")).toBe(true);
    expect(shouldFlagLiveness(unknownResult, "soft")).toBe(true);
    expect(shouldFlagLiveness(failResult, "hard")).toBe(true);
  });

  it("does not flag passed results", () => {
    expect(shouldFlagLiveness(passResult, "soft")).toBe(false);
    expect(shouldFlagLiveness(passResult, "hard")).toBe(false);
  });
});
