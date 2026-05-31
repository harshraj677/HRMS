import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/**
 * GET /api/attendance/photo?id=<attendanceId>&which=in|out
 * Returns only the photo field for a single attendance record.
 * Cached for 1 hour — photos never change after capture.
 */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id    = searchParams.get("id");
  const which = searchParams.get("which") === "out" ? "out" : "in";

  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const record = await prisma.attendance.findUnique({
    where: { id },
    select: {
      employeeId:   true,
      checkInPhoto:  true,
      checkOutPhoto: true,
    },
  });

  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Employees can only see their own photos; admins see all
  if (payload.role !== "admin" && record.employeeId !== payload.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const photo = which === "out" ? record.checkOutPhoto : record.checkInPhoto;

  const res = NextResponse.json({ photo: photo ?? null });
  // Photos are immutable — cache aggressively in browser and CDN
  res.headers.set("Cache-Control", "private, max-age=3600, stale-while-revalidate=86400");
  return res;
}
