import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const enrollment = await prisma.courseEnrollment.upsert({
    where: { courseId_employeeId: { courseId: id, employeeId: payload.id } },
    update: {},
    create: { courseId: id, employeeId: payload.id },
  });

  return NextResponse.json({ enrollment }, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const progress = Math.min(100, Math.max(0, Number(body.progress ?? 0)));
  const completed = progress === 100;

  const enrollment = await prisma.courseEnrollment.upsert({
    where: { courseId_employeeId: { courseId: id, employeeId: payload.id } },
    update: { progress, completed, completedAt: completed ? new Date() : null },
    create: { courseId: id, employeeId: payload.id, progress, completed, completedAt: completed ? new Date() : null },
  });

  return NextResponse.json({ enrollment });
}
