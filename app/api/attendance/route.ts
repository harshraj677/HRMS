import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url = new URL(req.url);
  const filterEmployeeId = url.searchParams.get("employeeId");

  let whereEmployeeId: string | undefined;
  let take: number;

  if (payload.role === "admin") {
    whereEmployeeId = filterEmployeeId ?? undefined;
    take = filterEmployeeId ? 60 : 200;
  } else {
    whereEmployeeId = payload.id;
    take = 60;
  }

  const records = await prisma.attendance.findMany({
    where: whereEmployeeId ? { employeeId: whereEmployeeId } : {},
    include: { employee: { select: { fullName: true } } },
    orderBy: { date: "desc" },
    take,
  });

  const attendance = records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    date: r.date,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    hours: r.hours,
    status: r.status,
    latitude: r.latitude,
    longitude: r.longitude,
    ipAddress: payload.role === "admin" ? r.ipAddress : undefined,
    device: payload.role === "admin" ? r.device : undefined,
    distanceFromOffice: r.distanceFromOffice,
    fullName: r.employee.fullName,
  }));

  return NextResponse.json({ attendance });
}
