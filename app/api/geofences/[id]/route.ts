import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const p = verifyToken(token);
  if (!p || p.role !== "admin") return null;
  return p;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const gf = await prisma.geofence.findUnique({ where: { id } });
  if (!gf) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ geofence: gf });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body required." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name.trim();
  if (body.address !== undefined) data.address = body.address?.trim() || null;
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.geometry) data.geometry = body.geometry;

  const gf = await prisma.geofence.update({ where: { id }, data });
  return NextResponse.json({ geofence: gf });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  // Soft-delete: set active = false instead of hard delete
  // (policies may still reference it; hard-delete would break those)
  await prisma.geofence.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ message: "Geofence deactivated." });
}
