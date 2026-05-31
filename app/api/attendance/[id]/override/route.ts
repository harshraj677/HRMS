import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/** Admin: approve or reject a flagged / manual-override attendance record. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });
  if (!record.needsReview && !record.manualOverride) {
    return NextResponse.json({ error: "Record does not require review." }, { status: 400 });
  }

  const action: "approve" | "reject" = body?.action;
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });
  }

  await prisma.attendance.update({
    where: { id },
    data: {
      needsReview: false,
      manualOverride: action === "approve",
      manualOverrideBy: payload.id,
      manualOverrideAt: new Date(),
      overrideNote: body?.note ? String(body.note).trim() : record.overrideNote,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminId: payload.id,
      action: action === "approve" ? "APPROVE_OVERRIDE" : "REJECT_OVERRIDE",
      resource: "Attendance",
      resourceId: id,
      details: { note: body?.note },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      userAgent: req.headers.get("user-agent") ?? null,
    },
  });

  return NextResponse.json({ message: `Record ${action}d.` });
}
