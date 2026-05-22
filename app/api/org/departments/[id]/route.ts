import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (body.name      !== undefined) data.name      = body.name?.trim();
  if (body.code      !== undefined) data.code      = body.code?.trim() || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.managerId !== undefined) data.managerId = body.managerId || null;
  if (body.status    !== undefined) data.status    = body.status;

  const dept = await prisma.department.update({ where: { id }, data });
  return NextResponse.json({ department: dept });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ message: "Department deleted." });
}
