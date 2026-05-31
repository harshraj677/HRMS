import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { insertAttendanceAudit } from "@/lib/attendanceAudit";

/**
 * POST /api/attendance/:id/review
 * Approve or reject a flagged attendance record with a reason.
 * Creates an immutable AttendanceAudit entry.
 *
 * Body: { action: "approved"|"rejected", reason: string, notes?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body?.action || !["approved", "rejected"].includes(body.action)) {
    return NextResponse.json({ error: "action must be 'approved' or 'rejected'." }, { status: 400 });
  }
  if (!body?.reason || typeof body.reason !== "string" || !body.reason.trim()) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }

  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });

  const updatedRecord = await prisma.attendance.update({
    where: { id },
    data: {
      reviewStatus: body.action,
      reviewedBy: payload.id,
      reviewedAt: new Date(),
      reviewNotes: body.reason.trim() + (body.notes ? ` — ${body.notes}` : ""),
      needsReview: false,
    },
  });

  // Immutable audit entry
  await insertAttendanceAudit({
    attendanceId: id,
    actorId: payload.id,
    action: body.action === "approved" ? "approved" : "rejected",
    reason: body.reason.trim(),
    metadata: {
      previousStatus: record.reviewStatus,
      faceScore: record.faceScore,
      livenessScore: record.livenessScore,
      policyStatus: (record.policyResult as any)?.status ?? null,
    },
  });

  return NextResponse.json({
    message: `Record ${body.action}.`,
    reviewStatus: updatedRecord.reviewStatus,
  });
}

/**
 * GET /api/attendance/:id/review — return the full detail of one record for the review panel.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const record = await prisma.attendance.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true, department: true, email: true } } },
  });
  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ record });
}
