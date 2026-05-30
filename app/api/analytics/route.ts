import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const now          = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const sixMonthsAgo  = new Date(now); sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
  const twelveMonthsAgo = new Date(now); twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const startOfMonth  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [
    recentAttendance, totalNonAdmins, employeesWithAttendance,
    recentLeaves, suspiciousCount,
    // New: all employees for dept distribution
    allEmployees,
    // Recruitment
    allJobs, allCandidates,
    // Payroll
    recentPayrolls,
    // Helpdesk
    allTickets,
    // Exits
    allResignations,
  ] = await Promise.all([
    prisma.attendance.findMany({ where: { date: { gte: thirtyDaysAgo } }, select: { date: true, status: true } }),
    prisma.employee.count({ where: { role: { not: "admin" } } }),
    prisma.employee.findMany({
      where: { role: { not: "admin" } },
      select: {
        id: true, fullName: true, department: true,
        attendance: { where: { date: { gte: startOfMonth, lt: startOfNextMonth } }, select: { id: true, status: true } },
      },
    }),
    prisma.leaveRequest.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true, status: true } }),
    prisma.suspiciousLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    // All employees for distribution charts
    prisma.employee.findMany({
      where: { role: { not: "admin" }, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      select: { department: true, createdAt: true },
    }),
    // Recruitment
    prisma.job.findMany({ select: { status: true, createdAt: true } }),
    prisma.candidate.findMany({ select: { stage: true, referredById: true, createdAt: true } }),
    // Payroll: last 6 months
    prisma.payroll.findMany({
      where: { generatedAt: { gte: sixMonthsAgo } },
      select: { month: true, year: true, netSalary: true, grossSalary: true, paymentStatus: true },
    }),
    // Helpdesk
    prisma.ticket.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { status: true, category: true, createdAt: true, updatedAt: true },
    }),
    // Exits
    prisma.resignation.findMany({ select: { status: true, createdAt: true } }),
  ]);

  // ── Attendance Trend (last 30 days) ──────────────────────────────────────────
  const byDate = new Map<string, { present: number; late: number }>();
  for (const r of recentAttendance) {
    const key = r.date.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, { present: 0, late: 0 });
    const d = byDate.get(key)!;
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

  // ── Department Attendance (current month) ────────────────────────────────────
  const deptMap = new Map<string, { present: number; late: number; absent: number }>();
  for (const emp of employeesWithAttendance) {
    const dept = emp.department || "Other";
    if (!deptMap.has(dept)) deptMap.set(dept, { present: 0, late: 0, absent: 0 });
    const d = deptMap.get(dept)!;
    for (const a of emp.attendance) {
      if (a.status === "present") d.present++;
      else if (a.status === "late") d.late++;
      else d.absent++;
    }
  }
  const departmentAttendance = Array.from(deptMap.entries()).map(([department, counts]) => ({ department, ...counts }));

  // ── Monthly Leave (last 6 months) ────────────────────────────────────────────
  type MonthEntry = { month: string; approved: number; rejected: number; pending: number; sortKey: number };
  const monthLeaveMap = new Map<string, MonthEntry>();
  for (const l of recentLeaves) {
    const key = `${l.createdAt.getUTCFullYear()}-${l.createdAt.getUTCMonth()}`;
    if (!monthLeaveMap.has(key)) monthLeaveMap.set(key, { month: MONTHS[l.createdAt.getUTCMonth()], approved: 0, rejected: 0, pending: 0, sortKey: l.createdAt.getUTCFullYear() * 100 + l.createdAt.getUTCMonth() });
    const m = monthLeaveMap.get(key)!;
    if (l.status === "approved") m.approved++;
    else if (l.status === "rejected") m.rejected++;
    else m.pending++;
  }
  const leaveMonthly = Array.from(monthLeaveMap.values()).sort((a, b) => a.sortKey - b.sortKey).map(({ month, approved, rejected, pending }) => ({ month, approved, rejected, pending }));

  // ── Employee Ranking ──────────────────────────────────────────────────────────
  const employeeRanking = employeesWithAttendance
    .map((emp) => ({ id: emp.id, fullName: emp.fullName, department: emp.department, presentDays: emp.attendance.filter((a) => a.status === "present").length }))
    .sort((a, b) => b.presentDays - a.presentDays)
    .slice(0, 10);

  // ── Department Distribution ────────────────────────────────────────────────────
  const deptDistMap = new Map<string, number>();
  for (const e of allEmployees) { const d = e.department || "Other"; deptDistMap.set(d, (deptDistMap.get(d) ?? 0) + 1); }
  const departmentDistribution = Array.from(deptDistMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // ── Employee Growth (monthly joins, last 12 months) ───────────────────────────
  const growthMap = new Map<string, number>();
  for (const e of allEmployees) {
    if (e.createdAt < twelveMonthsAgo) continue;
    const key = `${e.createdAt.getUTCFullYear()}-${e.createdAt.getUTCMonth()}`;
    growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
  }
  const employeeGrowth = Array.from(growthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, count]) => {
      const [yr, mo] = k.split("-").map(Number);
      return { month: `${MONTHS[mo]} ${yr}`, count };
    });

  // ── Recruitment ────────────────────────────────────────────────────────────────
  const activeJobs    = allJobs.filter((j) => j.status === "active").length;
  const closedJobs    = allJobs.filter((j) => j.status === "closed").length;
  const candidatesByStage: Record<string, number> = {};
  for (const c of allCandidates) candidatesByStage[c.stage] = (candidatesByStage[c.stage] ?? 0) + 1;
  const referredCount = allCandidates.filter((c) => c.referredById).length;
  const recruitmentFunnel = [
    { stage: "Applied",   count: candidatesByStage["applied"]   ?? 0 },
    { stage: "Screening", count: candidatesByStage["screening"] ?? 0 },
    { stage: "Interview", count: candidatesByStage["interview"] ?? 0 },
    { stage: "HR Round",  count: candidatesByStage["hr_round"]  ?? 0 },
    { stage: "Selected",  count: candidatesByStage["selected"]  ?? 0 },
  ];

  // ── Payroll Analytics (last 6 months) ─────────────────────────────────────────
  const payrollByMonth = new Map<string, { grossSalary: number; netSalary: number; count: number }>();
  for (const p of recentPayrolls) {
    const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
    if (!payrollByMonth.has(key)) payrollByMonth.set(key, { grossSalary: 0, netSalary: 0, count: 0 });
    const m = payrollByMonth.get(key)!;
    m.grossSalary += p.grossSalary;
    m.netSalary   += p.netSalary;
    m.count++;
  }
  const payrollTrend = Array.from(payrollByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      const [yr, mo] = k.split("-");
      return { month: `${MONTHS[Number(mo) - 1]} ${yr}`, grossSalary: Math.round(v.grossSalary), netSalary: Math.round(v.netSalary), count: v.count };
    });
  const totalPayrollPaid    = recentPayrolls.filter((p) => p.paymentStatus === "paid").reduce((s, p) => s + p.netSalary, 0);
  const totalPayrollPending = recentPayrolls.filter((p) => p.paymentStatus === "pending").reduce((s, p) => s + p.netSalary, 0);

  // ── Helpdesk Analytics ─────────────────────────────────────────────────────────
  const ticketsByStatus: Record<string, number> = {};
  const ticketsByCategory: Record<string, number> = {};
  for (const t of allTickets) {
    ticketsByStatus[t.status]     = (ticketsByStatus[t.status] ?? 0) + 1;
    ticketsByCategory[t.category] = (ticketsByCategory[t.category] ?? 0) + 1;
  }
  const helpdeskByCategory = Object.entries(ticketsByCategory).map(([name, value]) => ({ name, value }));
  // Avg resolution time (hours) for resolved tickets
  const resolvedTickets = allTickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const avgResolutionHours = resolvedTickets.length > 0
    ? Math.round(resolvedTickets.reduce((s, t) => s + (t.updatedAt.getTime() - t.createdAt.getTime()), 0) / resolvedTickets.length / 3600000)
    : 0;

  // ── Exit Analytics ─────────────────────────────────────────────────────────────
  const exitsByStatus: Record<string, number> = {};
  for (const r of allResignations) exitsByStatus[r.status] = (exitsByStatus[r.status] ?? 0) + 1;
  const attritionRate = totalNonAdmins > 0 ? Math.round((allResignations.length / totalNonAdmins) * 100) : 0;

  return NextResponse.json(
    {
      // Existing
      attendanceTrend, departmentAttendance, leaveMonthly, employeeRanking, suspiciousCount,
      // New
      departmentDistribution, employeeGrowth,
      totalEmployees: totalNonAdmins,
      recruitment: { activeJobs, closedJobs, totalCandidates: allCandidates.length, selected: candidatesByStage["selected"] ?? 0, referredCount, funnel: recruitmentFunnel },
      payroll: { trend: payrollTrend, totalPaid: Math.round(totalPayrollPaid), totalPending: Math.round(totalPayrollPending) },
      helpdesk: { byStatus: ticketsByStatus, byCategory: helpdeskByCategory, avgResolutionHours, openCount: ticketsByStatus["open"] ?? 0, resolvedCount: (ticketsByStatus["resolved"] ?? 0) + (ticketsByStatus["closed"] ?? 0) },
      exits: { total: allResignations.length, byStatus: exitsByStatus, attritionRate },
    },
    { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=60" } }
  );
}
