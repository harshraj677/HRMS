import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const designations = await prisma.designation.findMany({ orderBy: [{ level: "asc" }, { title: "asc" }] });
  return NextResponse.json({ designations });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const desig = await prisma.designation.create({
    data: {
      title: body.title.trim(),
      level: Number(body.level) || 1,
      departmentId: body.departmentId || null,
    },
  });

  return NextResponse.json({ designation: desig }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  await prisma.designation.delete({ where: { id } });
  return NextResponse.json({ message: "Designation deleted." });
}
