import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { insertAttendanceAudit } from "@/lib/attendanceAudit";

/**
 * POST /api/attendance/bulk-review
 * Approve or reject multiple flagged records in one request.
 *
 * Body: { ids: string[], action: "approved"|"rejected", reason: string }
 */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((id: any) => typeof id === "string") : [];

  if (!ids.length) return NextResponse.json({ error: "ids array is required." }, { status: 400 });
  if (ids.length > 200) return NextResponse.json({ error: "Maximum 200 records per bulk operation." }, { status: 400 });
  if (!["approved", "rejected"].includes(body?.action)) {
    return NextResponse.json({ error: "action must be 'approved' or 'rejected'." }, { status: 400 });
  }
  if (!body?.reason?.trim()) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }

  const now = new Date();

  // Update all records
  const updated = await prisma.attendance.updateMany({
    where: { id: { in: ids }, reviewStatus: { in: ["flagged", "auto"] } },
    data: {
      reviewStatus: body.action,
      reviewedBy: payload.id,
      reviewedAt: now,
      reviewNotes: body.reason.trim(),
      needsReview: false,
    },
  });

  // Create audit entries for each — do sequentially to avoid overwhelming DB
  const auditAction = body.action === "approved" ? "approved" : "rejected";
  await Promise.all(
    ids.map((id) =>
      insertAttendanceAudit({
        attendanceId: id,
        actorId: payload.id,
        action: auditAction,
        reason: body.reason.trim(),
        metadata: { bulk: true, totalInBatch: ids.length },
      })
    )
  );

  return NextResponse.json({ updated: updated.count, message: `${updated.count} record(s) ${body.action}.` });
}
