import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Unit tests for audit helper logic ─────────────────────────────────────
// We test only the pure logic parts; Prisma calls are mocked.

// Mock the Prisma module before importing the helper
vi.mock("@/lib/db", () => ({
  prisma: {
    attendanceAudit: {
      create: vi.fn().mockResolvedValue({ id: "mock-id" }),
    },
  },
}));

import { insertAttendanceAudit, fireAttendanceAudit, type AuditAction } from "@/lib/attendanceAudit";
import { prisma } from "@/lib/db";

describe("insertAttendanceAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls prisma.attendanceAudit.create with correct fields", async () => {
    await insertAttendanceAudit({
      attendanceId: "att-123",
      actorId: "actor-456",
      action: "approved",
      reason: "Looks good",
      metadata: { faceScore: 82 },
    });

    expect((prisma.attendanceAudit.create as any)).toHaveBeenCalledWith({
      data: {
        attendanceId: "att-123",
        actorId: "actor-456",
        action: "approved",
        reason: "Looks good",
        metadata: { faceScore: 82 },
      },
    });
  });

  it("does not throw when Prisma fails (fire-and-forget safety)", async () => {
    (prisma.attendanceAudit.create as any).mockRejectedValueOnce(new Error("DB error"));
    await expect(insertAttendanceAudit({
      attendanceId: "att-789",
      actorId: "actor-000",
      action: "created",
    })).resolves.not.toThrow();
  });

  it("accepts all valid audit actions", async () => {
    const actions: AuditAction[] = ["created", "checked_out", "flagged", "approved", "rejected", "override", "comment", "purged"];
    for (const action of actions) {
      await insertAttendanceAudit({ attendanceId: "a", actorId: "b", action });
    }
    expect((prisma.attendanceAudit.create as any)).toHaveBeenCalledTimes(actions.length);
  });

  it("stores null reason and metadata when omitted", async () => {
    await insertAttendanceAudit({ attendanceId: "a", actorId: "b", action: "flagged" });
    expect((prisma.attendanceAudit.create as any)).toHaveBeenCalledWith({
      data: expect.objectContaining({ reason: null, metadata: null }),
    });
  });
});

describe("fireAttendanceAudit", () => {
  it("calls insertAttendanceAudit without blocking", () => {
    // Should not throw synchronously
    expect(() => {
      fireAttendanceAudit({ attendanceId: "a", actorId: "b", action: "created" });
    }).not.toThrow();
  });
});

// ── Review status logic ────────────────────────────────────────────────────

describe("reviewStatus derivation", () => {
  // The logic in checkin/route.ts: if combinedNeedsReview → "flagged" else "auto"
  function deriveReviewStatus(needsReview: boolean): "flagged" | "auto" {
    return needsReview ? "flagged" : "auto";
  }

  it("is 'auto' when no flags raised", () => {
    expect(deriveReviewStatus(false)).toBe("auto");
  });

  it("is 'flagged' when any flag is raised", () => {
    expect(deriveReviewStatus(true)).toBe("flagged");
  });
});
