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

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const policies = await prisma.attendancePolicy.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  const p = requireAdmin(req);
  if (!p) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const validModes = ["soft", "hard", "allow-if-matched"];
  if (body.enforcementMode && !validModes.includes(body.enforcementMode)) {
    return NextResponse.json({ error: `enforcementMode must be one of: ${validModes.join(", ")}` }, { status: 400 });
  }

  // If this policy is being set as default, unset all others
  if (body.isDefault) {
    await prisma.attendancePolicy.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const policy = await prisma.attendancePolicy.create({
    data: {
      name: body.name.trim(),
      enforcementMode: body.enforcementMode ?? "soft",
      allowedDistanceMeters: body.allowedDistanceMeters ? Number(body.allowedDistanceMeters) : null,
      remoteWorkAllowed: body.remoteWorkAllowed === true,
      manualOverrideAllowed: body.manualOverrideAllowed !== false,
      faceVerifyRequired: body.faceVerifyRequired === true,
      photoRetentionDays: body.photoRetentionDays ? Number(body.photoRetentionDays) : null,
      locationRetentionDays: body.locationRetentionDays ? Number(body.locationRetentionDays) : null,
      active: body.active !== false,
      isDefault: body.isDefault === true,
      createdBy: p.id,
    },
  });

  return NextResponse.json({ policy }, { status: 201 });
}
