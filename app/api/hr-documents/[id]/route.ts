import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

// GET single doc with file content (for download/preview)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.hRDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!doc.isPublic && payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  return NextResponse.json({ document: doc });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  await prisma.hRDocument.delete({ where: { id } });
  return NextResponse.json({ message: "Document deleted." });
}
