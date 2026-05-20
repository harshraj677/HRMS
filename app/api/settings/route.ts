import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const DEFAULT_SETTINGS = {
  wifiName: "",
  officeIp: "",
  latitude: 13.962271577211828,
  longitude: 75.50897323054004,
  radiusMeters: 1000,
};

export async function GET() {
  try {
    const record = await prisma.settings.findUnique({ where: { key: "office" } });
    if (!record) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }
    return NextResponse.json(record.value);
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const { wifiName, officeIp, latitude, longitude, radiusMeters } = body as {
    wifiName: string;
    officeIp: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };

  const value = {
    wifiName: wifiName ?? "",
    officeIp: officeIp ?? "",
    latitude: Number(latitude) || DEFAULT_SETTINGS.latitude,
    longitude: Number(longitude) || DEFAULT_SETTINGS.longitude,
    radiusMeters: Number(radiusMeters) || DEFAULT_SETTINGS.radiusMeters,
  };

  await prisma.settings.upsert({
    where: { key: "office" },
    update: { value },
    create: { key: "office", value },
  });

  await prisma.auditLog.create({
    data: {
      adminId: payload.id,
      action: "UPDATE",
      resource: "Settings",
      resourceId: "office",
      details: value,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: req.headers.get("user-agent") || null,
    },
  });

  return NextResponse.json({ message: "Settings saved successfully." });
}
