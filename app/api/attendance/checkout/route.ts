import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const photo = typeof body?.photo === "string" && body.photo.length > 0 ? body.photo : null;
  const accuracy = body?.accuracy != null ? Number(body.accuracy) : null;

  const now = new Date();
  const todayDate = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");

  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: payload.id, date: todayDate } },
  });

  if (!record) {
    return NextResponse.json({ error: "You haven't checked in today." }, { status: 400 });
  }
  if (record.checkOut) {
    return NextResponse.json(
      { error: "Already checked out today.", checkOut: record.checkOut },
      { status: 400 }
    );
  }

  const checkInTime = new Date(record.checkIn!);
  const hours = parseFloat(
    ((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
  );

  await prisma.attendance.update({
    where: { id: record.id },
    data: { checkOut: now, hours, checkOutPhoto: photo, checkOutAccuracy: accuracy },
  });

  return NextResponse.json({
    message: "Checked out successfully.",
    checkOut: now.toISOString(),
    hours,
  });
}
