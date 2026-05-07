import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const todayDate = new Date(
    new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"
  );

  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: payload.id, date: todayDate } },
  });

  if (!record) {
    return NextResponse.json({
      checkIn: null,
      checkOut: null,
      hours: null,
      status: "not-checked-in",
      distanceFromOffice: null,
    });
  }

  let currentStatus = record.status || "not-checked-in";
  if (!record.status) {
    if (record.checkIn && !record.checkOut) currentStatus = "present";
    else if (record.checkIn && record.checkOut) currentStatus = "completed";
  }

  let hours = record.hours;
  if (record.checkIn && !record.checkOut) {
    hours = parseFloat(
      ((Date.now() - record.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(1)
    );
  }

  return NextResponse.json({
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    hours,
    status: currentStatus,
    distanceFromOffice: record.distanceFromOffice,
  });
}
