/**
 * Phase 5 — Immutable attendance audit trail.
 *
 * Every attendance state change creates an AttendanceAudit row.
 * All writes are fire-and-forget (non-blocking, won't fail the main operation).
 *
 * Audit actions:
 *   "created"     — attendance record first written (check-in)
 *   "checked_out" — checkout recorded
 *   "flagged"     — system automatically flagged for review
 *   "approved"    — admin/manager approved the record
 *   "rejected"    — admin/manager rejected the record
 *   "override"    — employee submitted a manual override request
 *   "comment"     — reviewer added a comment without changing status
 *   "purged"      — media (photo/location) removed per retention policy
 */

import { prisma } from "@/lib/db";

export type AuditAction =
  | "created"
  | "checked_out"
  | "flagged"
  | "approved"
  | "rejected"
  | "override"
  | "comment"
  | "purged";

interface AuditParams {
  attendanceId: string;
  actorId: string;
  action: AuditAction;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert an AttendanceAudit row.  Never throws — audit failures are logged
 * to stderr but must never break the caller.
 */
export async function insertAttendanceAudit(p: AuditParams): Promise<void> {
  try {
    await prisma.attendanceAudit.create({
      data: {
        attendanceId: p.attendanceId,
        actorId: p.actorId,
        action: p.action,
        reason: p.reason ?? null,
        metadata: (p.metadata ?? null) as any,
      },
    });
  } catch (err) {
    console.error("[attendanceAudit] insert failed:", err);
  }
}

/**
 * Fire-and-forget version — schedules the insert without awaiting.
 * Use this inside API routes where you don't want to add latency.
 */
export function fireAttendanceAudit(p: AuditParams): void {
  insertAttendanceAudit(p).catch(() => {});
}
