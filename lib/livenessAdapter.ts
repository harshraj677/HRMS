/**
 * Phase 4 — Liveness detection adapter.
 *
 * Architecture
 * ───────────
 * The client captures 6 video frames at 500 ms intervals (3 s total) while the
 * user is prompted to blink.  For each consecutive pair it computes a per-pixel
 * average absolute-difference value in [0, 1].  Those statistics are sent to
 * the server inside the attendance submission body; the server calls
 * `getDefaultLivenessAdapter().verify(evidence)` and stores the result.
 *
 * Swap the default adapter by changing `getDefaultLivenessAdapter()` to return
 * a different implementation — e.g. a FaceTec or Azure Face SDK wrapper.
 *
 * Thresholds (calibrated for 160 × 120 px front-camera frames):
 *   frameDiff < 0.004  → near-zero motion  → possible photo/print spoof
 *   frameDiff ≥ 0.025  → blink-level event → strong liveness signal
 *   frameDiff > 0.35   → excessive motion  → possible replay/glitch
 */

// ── Public types ───────────────────────────────────────────────────────────

/** Statistics the client computes from the captured frame sequence. */
export interface LivenessClientEvidence {
  challengeType: "blink" | "passive";
  frameCount: number;
  /** Maximum consecutive frame-to-frame diff, normalised [0, 1]. */
  maxFrameDiff: number;
  /** Mean  consecutive frame-to-frame diff, normalised [0, 1]. */
  avgFrameDiff: number;
  /** Interval in ms between each captured frame. */
  frameIntervalMs: number;
  /** Per-consecutive-pair diff values (length = frameCount - 1). */
  diffs: number[];
  /** Unix timestamp (ms) when the sequence was captured. */
  capturedAt: number;
}

export type LivenessResultStatus = "passed" | "failed" | "unknown";

export interface LivenessResult {
  result: LivenessResultStatus;
  /** 0 – 100 composite score. */
  score: number;
  /** Adapter identifier stored in the attendance record for traceability. */
  method: string;
  /** Human-readable reason (present on failure/unknown). */
  reason?: string;
}

/** Pluggable adapter interface — swap implementations without touching callers. */
export interface LivenessAdapter {
  readonly methodName: string;
  verify(evidence: LivenessClientEvidence): Promise<LivenessResult>;
}

// ── FrameDiffLivenessAdapter (default, no external dependencies) ──────────

const METHOD = "frame-diff-v1";

/** Minimum avg diff expected from a living person (micro-movements, breathing). */
const MIN_MOTION = 0.004;
/** Diff level that suggests a blink or deliberate movement occurred. */
const BLINK_PEAK = 0.025;
/** Above this → suspicious (screen-replay glitch or excessive movement). */
const MAX_MOTION = 0.35;
/** Minimum frames required for reliable analysis. */
const MIN_FRAMES = 4;
/** Composite score threshold to pass. */
const PASS_SCORE = 55;

export class FrameDiffLivenessAdapter implements LivenessAdapter {
  readonly methodName = METHOD;

  async verify(e: LivenessClientEvidence): Promise<LivenessResult> {
    // ── Sanity checks ───────────────────────────────────────────────────────
    if (e.frameCount < MIN_FRAMES || e.diffs.length === 0) {
      return {
        result: "unknown",
        score: 0,
        method: METHOD,
        reason: "Insufficient frames captured for analysis",
      };
    }

    // Reject clearly impossible values (client tampering)
    if (
      typeof e.maxFrameDiff !== "number" ||
      typeof e.avgFrameDiff !== "number" ||
      e.maxFrameDiff < 0 ||
      e.maxFrameDiff > 1 ||
      e.avgFrameDiff < 0 ||
      e.avgFrameDiff > 1 ||
      e.avgFrameDiff > e.maxFrameDiff + 0.001
    ) {
      return {
        result: "failed",
        score: 0,
        method: METHOD,
        reason: "Evidence statistics are inconsistent",
      };
    }

    // ── Anti-spoof rules ────────────────────────────────────────────────────
    if (e.maxFrameDiff < MIN_MOTION) {
      return {
        result: "failed",
        score: 10,
        method: METHOD,
        reason: "No natural motion detected — possible photo or print spoof",
      };
    }

    if (e.maxFrameDiff > MAX_MOTION) {
      return {
        result: "failed",
        score: 15,
        method: METHOD,
        reason: "Excessive motion detected — possible replay or screen attack",
      };
    }

    // ── Scoring (components sum to 100) ─────────────────────────────────────
    let score = 0;

    // 1. Natural micro-motion present (40 pts)
    if (e.avgFrameDiff >= MIN_MOTION) {
      score += 40;
    } else if (e.avgFrameDiff >= MIN_MOTION / 2) {
      score += 20;
    }

    // 2. Blink-like event detected — at least one diff ≥ BLINK_PEAK (30 pts)
    const hasBlink = e.diffs.some((d) => d >= BLINK_PEAK);
    if (hasBlink) score += 30;

    // 3. Adequate frame count (15 pts)
    if (e.frameCount >= MIN_FRAMES) score += 10;
    if (e.frameCount >= 6) score += 5;

    // 4. Frame interval is realistic for a live session (15 pts)
    if (e.frameIntervalMs >= 200 && e.frameIntervalMs <= 1000) score += 10;
    if (e.capturedAt > 0 && Date.now() - e.capturedAt < 5 * 60 * 1000) score += 5;

    score = Math.min(score, 100);
    const passed = score >= PASS_SCORE;

    return {
      result: passed ? "passed" : "failed",
      score,
      method: METHOD,
      ...(passed ? {} : { reason: `Liveness score ${score} below threshold (${PASS_SCORE})` }),
    };
  }
}

/**
 * Returns the active liveness adapter.
 * Replace the body to swap implementations (e.g. FaceTec):
 *   return new FaceTecAdapter({ apiKey: process.env.FACETEC_KEY });
 */
export function getDefaultLivenessAdapter(): LivenessAdapter {
  return new FrameDiffLivenessAdapter();
}

// ── Enforcement helpers ────────────────────────────────────────────────────

export type LivenessEnforcement = "off" | "soft" | "hard";

/**
 * Given a liveness result and the configured enforcement level, returns
 * whether the attendance submission should be blocked.
 */
export function shouldBlockOnLiveness(
  result: LivenessResult,
  enforcement: LivenessEnforcement
): boolean {
  if (enforcement !== "hard") return false;
  return result.result === "failed";
}

/**
 * Given a liveness result and enforcement level, returns whether the
 * attendance record should be flagged for review.
 */
export function shouldFlagLiveness(
  result: LivenessResult,
  enforcement: LivenessEnforcement
): boolean {
  if (enforcement === "off") return false;
  return result.result === "failed" || result.result === "unknown";
}
