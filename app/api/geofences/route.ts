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
  const p = requireAdmin(req);
  if (!p) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const geofences = await prisma.geofence.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ geofences });
}

export async function POST(req: NextRequest) {
  const p = requireAdmin(req);
  if (!p) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.type || !body?.geometry) {
    return NextResponse.json({ error: "name, type, and geometry are required." }, { status: 400 });
  }
  if (!["circle", "polygon"].includes(body.type)) {
    return NextResponse.json({ error: "type must be 'circle' or 'polygon'." }, { status: 400 });
  }
  // Validate circle geometry
  if (body.type === "circle") {
    const g = body.geometry;
    if (typeof g.lat !== "number" || typeof g.lng !== "number" || typeof g.radiusMeters !== "number" || g.radiusMeters <= 0) {
      return NextResponse.json({ error: "Circle geometry needs lat, lng, radiusMeters > 0." }, { status: 400 });
    }
  }
  // Validate polygon geometry
  if (body.type === "polygon") {
    const coords = body.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 3) {
      return NextResponse.json({ error: "Polygon needs at least 3 coordinate pairs." }, { status: 400 });
    }
    for (const c of coords) {
      if (typeof c.lat !== "number" || typeof c.lng !== "number") {
        return NextResponse.json({ error: "Each coordinate must have numeric lat and lng." }, { status: 400 });
      }
    }
  }

  const geofence = await prisma.geofence.create({
    data: {
      name: body.name.trim(),
      type: body.type,
      geometry: body.type === "circle"
        ? { type: "circle", lat: body.geometry.lat, lng: body.geometry.lng, radiusMeters: body.geometry.radiusMeters }
        : { type: "polygon", coordinates: body.geometry.coordinates },
      address: body.address?.trim() || null,
      active: body.active !== false,
      createdBy: p.id,
    },
  });

  return NextResponse.json({ geofence }, { status: 201 });
}
