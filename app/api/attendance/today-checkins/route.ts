import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") ?? undefined;
  const statusFilter = searchParams.get("status") ?? undefined;

  const todayDate = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  const records = await prisma.attendance.findMany({
    where: {
      date: todayDate,
      checkIn: { not: null },
      ...(statusFilter ? { status: statusFilter } : {}),
      employee: {
        deletedAt: null,
        ...(department ? { department } : {}),
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          department: true,
          position: true,
          profile: { select: { avatar: true } },
        },
      },
    },
    orderBy: { checkIn: "asc" },
  });

  const checkins = records.map(r => ({
    id:               r.id,
    employeeId:       r.employeeId,
    fullName:         r.employee.fullName,
    department:       r.employee.department,
    position:         r.employee.position,
    avatar:           r.employee.profile?.avatar ?? null,
    checkIn:          r.checkIn?.toISOString() ?? null,
    checkOut:         r.checkOut?.toISOString() ?? null,
    hours:            r.hours,
    status:           r.status,
    latitude:         r.latitude,
    longitude:        r.longitude,
    distanceFromOffice: r.distanceFromOffice,
    checkInAddress:   r.checkInAddress,
    checkOutAddress:  r.checkOutAddress,
    hasCheckInPhoto:  !!r.checkInPhoto,
    hasCheckOutPhoto: !!r.checkOutPhoto,
    faceVerified:     r.faceVerified,
    faceScore:        r.faceScore,
    isRemote:         r.isRemote,
    reviewStatus:     r.reviewStatus,
    needsReview:      r.needsReview,
  }));

  return NextResponse.json({ checkins, total: checkins.length });
}
