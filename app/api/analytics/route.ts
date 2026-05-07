import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const startOfNextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const [recentAttendance, totalNonAdmins, employeesWithAttendance, recentLeaves, suspiciousCount] =
    await Promise.all([
      prisma.attendance.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: { date: true, status: true },
      }),
      prisma.employee.count({ where: { role: { not: "admin" } } }),
      prisma.employee.findMany({
        where: { role: { not: "admin" } },
        select: {
          id: true,
          fullName: true,
          department: true,
          attendance: {
            where: { date: { gte: startOfMonth, lt: startOfNextMonth } },
            select: { id: true, status: true },
          },
        },
      }),
      prisma.leaveRequest.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, status: true },
      }),
      prisma.suspiciousLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

  // ── Attendance Trend (last 30 days) ────────────────────────────────────────
  const byDate = new Map<string, { present: number; late: number; checkedIn: number }>();
  for (const r of recentAttendance) {
    const key = r.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, { present: 0, late: 0, checkedIn: 0 });
    const d = byDate.get(key)!;
    d.checkedIn++;
    if (r.status === "present") d.present++;
    else if (r.status === "late") d.late++;
  }
  const attendanceTrend = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, counts]) => {
      const d = new Date(dateStr);
      return {
        date: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`,
        present: counts.present,
        late: counts.late,
        absent: Math.max(0, totalNonAdmins - counts.present - counts.late),
      };
    });

  // ── Department Attendance (current month) ──────────────────────────────────
  const deptMap = new Map<string, { present: number; late: number; absent: number }>();
  for (const emp of employeesWithAttendance) {
    const dept = emp.department || "Unassigned";
    if (!deptMap.has(dept)) deptMap.set(dept, { present: 0, late: 0, absent: 0 });
    const d = deptMap.get(dept)!;
    for (const a of emp.attendance) {
      if (a.status === "present") d.present++;
      else if (a.status === "late") d.late++;
      else d.absent++;
    }
  }
  const departmentAttendance = Array.from(deptMap.entries()).map(
    ([department, counts]) => ({ department, ...counts })
  );

  // ── Monthly Leave Requests (last 6 months) ─────────────────────────────────
  type MonthEntry = {
    month: string;
    approved: number;
    rejected: number;
    pending: number;
    sortKey: number;
  };
  const monthLeaveMap = new Map<string, MonthEntry>();
  for (const l of recentLeaves) {
    const d = l.createdAt;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!monthLeaveMap.has(key)) {
      monthLeaveMap.set(key, {
        month: MONTHS[d.getUTCMonth()],
        approved: 0,
        rejected: 0,
        pending: 0,
        sortKey: d.getUTCFullYear() * 100 + d.getUTCMonth(),
      });
    }
    const m = monthLeaveMap.get(key)!;
    if (l.status === "approved") m.approved++;
    else if (l.status === "rejected") m.rejected++;
    else m.pending++;
  }
  const leaveMonthly = Array.from(monthLeaveMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ month, approved, rejected, pending }) => ({
      month,
      approved,
      rejected,
      pending,
    }));

  // ── Employee Ranking (current month) ──────────────────────────────────────
  const employeeRanking = employeesWithAttendance
    .map((emp) => ({
      id: emp.id,
      fullName: emp.fullName,
      department: emp.department,
      presentDays: emp.attendance.filter((a) => a.status === "present").length,
      lateDays: emp.attendance.filter((a) => a.status === "late").length,
      totalDays: emp.attendance.length,
    }))
    .sort((a, b) => b.presentDays - a.presentDays)
    .slice(0, 10);

  return NextResponse.json({
    attendanceTrend,
    departmentAttendance,
    leaveMonthly,
    employeeRanking,
    suspiciousCount,
  });
}
