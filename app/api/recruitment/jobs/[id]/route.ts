import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  const strFields = ["title","department","location","experience","employmentType","description","status"];
  for (const f of strFields) if (body[f] !== undefined) data[f] = body[f]?.trim?.() ?? body[f];
  if (body.salaryMin !== undefined) data.salaryMin = body.salaryMin ? Number(body.salaryMin) : null;
  if (body.salaryMax !== undefined) data.salaryMax = body.salaryMax ? Number(body.salaryMax) : null;
  if (body.skills    !== undefined) data.skills    = Array.isArray(body.skills) ? body.skills : [];
  if (body.deadline  !== undefined) data.deadline  = body.deadline ? new Date(body.deadline) : null;

  const job = await prisma.job.update({ where: { id }, data });
  return NextResponse.json({ job });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ message: "Job deleted." });
}
