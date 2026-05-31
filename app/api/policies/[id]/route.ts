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
  const policy = await prisma.attendancePolicy.findUnique({ where: { id } });
  if (!policy) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ policy });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body required." }, { status: 400 });

  if (body.isDefault === true) {
    await prisma.attendancePolicy.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
  }

  const data: Record<string, unknown> = {};
  const allowed = [
    "name", "enforcementMode", "allowedGeofenceIds", "allowedDistanceMeters",
    "remoteWorkAllowed", "manualOverrideAllowed", "faceVerifyRequired",
    "photoRetentionDays", "locationRetentionDays", "active", "isDefault",
  ];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) data[key] = body[key];
  }

  const policy = await prisma.attendancePolicy.update({ where: { id }, data });
  return NextResponse.json({ policy });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  await prisma.attendancePolicy.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ message: "Policy deactivated." });
}
