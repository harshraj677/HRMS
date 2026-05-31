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

  if (payload.role === "admin") {
    const [
      totalEmployees,
      presentToday,
      lateToday,
      onLeave,
      pendingLeaveRequests,
      openJobs,
      pendingPayrolls,
      openTickets,
      activeStartups,
    ] = await Promise.all([
      prisma.employee.count({ where: { role: { not: "admin" }, status: "active", deletedAt: null } }),
      prisma.attendance.count({ where: { date: todayDate, checkIn: { not: null } } }),
      prisma.attendance.count({ where: { date: todayDate, status: "late" } }),
      prisma.leaveRequest.count({
        where: {
          status: "approved",
          startDate: { lte: todayDate },
          endDate: { gte: todayDate },
        },
      }),
      prisma.leaveRequest.count({ where: { status: "pending" } }),
      prisma.job.count({ where: { status: "active" } }),
      prisma.payroll.count({ where: { paymentStatus: "pending" } }),
      prisma.ticket.count({ where: { status: "open" } }),
      prisma.startup.count({ where: { status: "Active", deletedAt: null } }),
    ]);

    const percentPresent =
      totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    return NextResponse.json({
      totalEmployees,
      presentToday,
      lateToday,
      onLeave,
      pendingLeaveRequests,
      percentPresent,
      openJobs,
      pendingPayrolls,
      openTickets,
      activeStartups,
    });
  }

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const [monthlyAttendance, monthlyLate, monthlyLeaves, pendingRequests, emp] =
    await Promise.all([
      prisma.attendance.count({
        where: {
          employeeId: payload.id,
          date: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
      prisma.attendance.count({
        where: {
          employeeId: payload.id,
          status: "late",
          date: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          employeeId: payload.id,
          status: "approved",
          startDate: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
      prisma.leaveRequest.count({
        where: { employeeId: payload.id, status: "pending" },
      }),
      prisma.employee.findUnique({
        where: { id: payload.id },
        select: { leaveBalance: true },
      }),
    ]);

  return NextResponse.json({
    monthlyAttendance,
    monthlyLate,
    monthlyLeaves,
    pendingRequests,
    leaveBalance: emp?.leaveBalance ?? 0,
  });
}
