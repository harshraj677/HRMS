import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const ACTIVE_TASK_FILTER = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const tasks = await prisma.task.findMany({ where: ACTIVE_TASK_FILTER });
  const now = new Date();

  let completed = 0;
  let overdue = 0;
  let blocked = 0;
  const statusBreakdown: Record<string, number> = {
    todo: 0, in_progress: 0, under_review: 0, completed: 0, blocked: 0, on_hold: 0, cancelled: 0,
  };

  const deptMap = new Map<string, { total: number; completed: number; overdue: number }>();
  const empMap = new Map<string, { total: number; completed: number; overdue: number }>();

  for (const t of tasks) {
    statusBreakdown[t.status] = (statusBreakdown[t.status] ?? 0) + 1;
    if (t.status === "completed") completed++;
    if (t.status === "blocked") blocked++;
    const isOverdue = !!t.dueDate && t.dueDate < now && !["completed", "cancelled"].includes(t.status);
    if (isOverdue) overdue++;

    const dept = t.department ?? "Unassigned";
    if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, completed: 0, overdue: 0 });
    const d = deptMap.get(dept)!;
    d.total++;
    if (t.status === "completed") d.completed++;
    if (isOverdue) d.overdue++;

    if (!empMap.has(t.assignedToId)) empMap.set(t.assignedToId, { total: 0, completed: 0, overdue: 0 });
    const e = empMap.get(t.assignedToId)!;
    e.total++;
    if (t.status === "completed") e.completed++;
    if (isOverdue) e.overdue++;
  }

  const total = tasks.length;
  const pending = total - completed - statusBreakdown.cancelled;

  const byDepartment = Array.from(deptMap.entries())
    .map(([department, v]) => ({
      department,
      total: v.total,
      completed: v.completed,
      overdue: v.overdue,
      completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const employeeIds = Array.from(empMap.keys());
  const employees = employeeIds.length
    ? await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, fullName: true, department: true },
      })
    : [];
  const empInfo = new Map(employees.map((e) => [e.id, e]));

  const byEmployee = Array.from(empMap.entries())
    .map(([employeeId, v]) => ({
      employeeId,
      fullName: empInfo.get(employeeId)?.fullName ?? "Unknown",
      department: empInfo.get(employeeId)?.department ?? null,
      assigned: v.total,
      completed: v.completed,
      overdue: v.overdue,
      completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.completionRate - a.completionRate || b.assigned - a.assigned);

  const topPerformers = byEmployee.slice(0, 10);
  const needsAttention = byEmployee.filter((e) => e.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 10);

  // 30-day completion trend
  const trendMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of tasks) {
    if (t.status === "completed" && t.completedAt) {
      const key = t.completedAt.toISOString().slice(0, 10);
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
  }
  const trend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, completed: count }));

  return NextResponse.json({
    totals: { total, completed, pending, overdue, blocked },
    statusBreakdown,
    byDepartment,
    topPerformers,
    needsAttention,
    trend,
  });
}
