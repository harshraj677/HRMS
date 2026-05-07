import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const todayDate = new Date(
    new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"
  );

  const records = await prisma.attendance.findMany({
    where: {
      date: todayDate,
      latitude: { not: null },
      longitude: { not: null },
    },
    include: { employee: { select: { fullName: true } } },
    orderBy: { checkIn: "desc" },
  });

  const markers = records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    fullName: r.employee.fullName,
    latitude: r.latitude,
    longitude: r.longitude,
    checkIn: r.checkIn,
    distanceFromOffice: r.distanceFromOffice,
  }));

  return NextResponse.json({ markers });
}
