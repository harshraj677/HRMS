import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { assignedToId: true, assignedById: true },
  });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (payload.role !== "admin" && task.assignedToId !== payload.id && task.assignedById !== payload.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const logs = await prisma.activityLog.findMany({
    where: { module: "tasks", entityId: id },
    orderBy: { createdAt: "desc" },
  });

  const userIds = Array.from(new Set(logs.map((l) => l.userId)));
  const users = userIds.length
    ? await prisma.employee.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
    : [];
  const nameMap = new Map(users.map((u) => [u.id, u.fullName]));

  const enriched = logs.map((l) => ({ ...l, userName: nameMap.get(l.userId) ?? "Unknown" }));

  return NextResponse.json({ activity: enriched });
}
