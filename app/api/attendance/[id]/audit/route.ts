import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/**
 * GET /api/attendance/:id/audit
 * Returns the immutable audit trail for one attendance record.
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

  const entries = await prisma.attendanceAudit.findMany({
    where: { attendanceId: id },
    orderBy: { createdAt: "asc" },
  });

  // Enrich with actor name
  const actorIds = [...new Set(entries.map((e) => e.actorId))];
  const actors = await prisma.employee.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, fullName: true, role: true },
  });
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

  const trail = entries.map((e) => ({
    id: e.id,
    action: e.action,
    reason: e.reason,
    metadata: e.metadata,
    createdAt: e.createdAt,
    actor: actorMap[e.actorId]
      ? { id: e.actorId, fullName: actorMap[e.actorId].fullName, role: actorMap[e.actorId].role }
      : { id: e.actorId, fullName: "Unknown", role: "unknown" },
  }));

  return NextResponse.json({ trail });
}
