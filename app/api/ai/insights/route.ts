import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export interface AIInsight {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  module: string;
  title: string;
  description: string;
  value?: number;
  href?: string;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const now           = new Date();
  const thirtyAgo     = new Date(now); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const sevenAgo      = new Date(now); sevenAgo.setDate(sevenAgo.getDate() - 7);
  const fourteenAgo   = new Date(now); fourteenAgo.setDate(fourteenAgo.getDate() - 14);
  const startOfWeek   = new Date(now); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const insights: AIInsight[] = [];
  let id = 0;
  const nextId = () => String(++id);

  // ── Attendance ────────────────────────────────────────────────────────────

  // Employees with 5+ absences in last 30 days (potential burnout/disengagement)
  const employees = await prisma.employee.findMany({
    where: { role: { not: "admin" }, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true, fullName: true, department: true },
  });

  const absentRisk: string[] = [];
  for (const emp of employees) {
    const absentCount = await prisma.attendance.count({
      where: { employeeId: emp.id, date: { gte: thirtyAgo }, status: { in: ["absent"] } },
    });
    if (absentCount >= 5) absentRisk.push(emp.fullName);
  }
  if (absentRisk.length > 0) {
    insights.push({
      id: nextId(), severity: "warning", module: "Attendance",
      title: `${absentRisk.length} employee(s) with high absence rate`,
      description: `${absentRisk.slice(0, 3).join(", ")}${absentRisk.length > 3 ? ` and ${absentRisk.length - 3} more` : ""} had 5+ absences in the last 30 days.`,
      value: absentRisk.length, href: "/dashboard/attendance",
    });
  }

  // Employees with no check-in this week
  const noCheckinThisWeek = await Promise.all(employees.map(async (emp) => {
    const count = await prisma.attendance.count({ where: { employeeId: emp.id, date: { gte: startOfWeek }, checkIn: { not: null } } });
    return count === 0 ? emp.fullName : null;
  }));
  const missingThisWeek = noCheckinThisWeek.filter(Boolean);
  if (missingThisWeek.length > 0 && missingThisWeek.length < employees.length) {
    insights.push({
      id: nextId(), severity: "info", module: "Attendance",
      title: `${missingThisWeek.length} employee(s) haven't checked in this week`,
      description: `${missingThisWeek.slice(0, 3).join(", ")}${missingThisWeek.length > 3 ? ` +${missingThisWeek.length - 3} more` : ""} have no attendance records this week.`,
      value: missingThisWeek.length, href: "/dashboard/attendance",
    });
  }

  // ── Payroll ────────────────────────────────────────────────────────────────

  const pendingPayrolls = await prisma.payroll.count({
    where: { paymentStatus: "pending", generatedAt: { lt: sevenAgo } },
  });
  if (pendingPayrolls > 0) {
    insights.push({
      id: nextId(), severity: pendingPayrolls > 5 ? "critical" : "warning", module: "Payroll",
      title: `${pendingPayrolls} payroll record(s) pending payment`,
      description: `${pendingPayrolls} payroll(s) generated more than 7 days ago are still marked as pending. Consider marking them as paid.`,
      value: pendingPayrolls, href: "/dashboard/payroll",
    });
  }

  // Employees without salary structure
  const noSalary: string[] = [];
  for (const emp of employees) {
    const has = await prisma.salaryStructure.findUnique({ where: { employeeId: emp.id }, select: { id: true } });
    if (!has) noSalary.push(emp.fullName);
  }
  if (noSalary.length > 0) {
    insights.push({
      id: nextId(), severity: "warning", module: "Payroll",
      title: `${noSalary.length} employee(s) have no salary structure`,
      description: `${noSalary.slice(0, 3).join(", ")}${noSalary.length > 3 ? ` +${noSalary.length - 3} more` : ""} are missing salary configurations. Payroll cannot be generated for them.`,
      value: noSalary.length, href: "/dashboard/employees",
    });
  }

  // ── Helpdesk ──────────────────────────────────────────────────────────────

  const staleTickets = await prisma.ticket.count({
    where: { status: { in: ["open", "in_progress"] }, createdAt: { lt: sevenAgo } },
  });
  if (staleTickets > 0) {
    insights.push({
      id: nextId(), severity: staleTickets > 5 ? "critical" : "warning", module: "Helpdesk",
      title: `${staleTickets} ticket(s) unresolved for 7+ days`,
      description: `${staleTickets} support ticket(s) have been open for more than a week. Consider reviewing and closing older requests.`,
      value: staleTickets, href: "/dashboard/helpdesk",
    });
  }

  // ── Recruitment ──────────────────────────────────────────────────────────

  const stuckCandidates = await prisma.candidate.count({
    where: { stage: { notIn: ["selected", "rejected"] }, updatedAt: { lt: fourteenAgo } },
  });
  if (stuckCandidates > 0) {
    insights.push({
      id: nextId(), severity: "info", module: "Recruitment",
      title: `${stuckCandidates} candidate(s) stuck in pipeline`,
      description: `${stuckCandidates} candidate(s) haven't progressed in their recruitment stage for over 14 days. Review the hiring pipeline.`,
      value: stuckCandidates, href: "/dashboard/recruitment",
    });
  }

  const activeJobs = await prisma.job.count({ where: { status: "active" } });
  if (activeJobs === 0) {
    insights.push({
      id: nextId(), severity: "info", module: "Recruitment",
      title: "No active job openings",
      description: "There are currently no active job postings. Create new openings to attract candidates.",
      href: "/dashboard/recruitment",
    });
  }

  // ── Startups ──────────────────────────────────────────────────────────────

  const startups = await prisma.startup.findMany({
    where: { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }], status: "Active" },
    select: { id: true, startupName: true, progress: true, mentor: true },
  });

  const lowProgressStartups = startups.filter((s) => s.progress < 25);
  if (lowProgressStartups.length > 0) {
    insights.push({
      id: nextId(), severity: "warning", module: "Startups",
      title: `${lowProgressStartups.length} startup(s) with low progress`,
      description: `${lowProgressStartups.map((s) => s.startupName).slice(0, 3).join(", ")} are below 25% progress. Consider scheduling mentor sessions.`,
      value: lowProgressStartups.length, href: "/dashboard/startups",
    });
  }

  const noMentorStartups = startups.filter((s) => !s.mentor);
  if (noMentorStartups.length > 0) {
    insights.push({
      id: nextId(), severity: "info", module: "Startups",
      title: `${noMentorStartups.length} startup(s) without a mentor`,
      description: `${noMentorStartups.map((s) => s.startupName).slice(0, 3).join(", ")} don't have mentors assigned yet.`,
      value: noMentorStartups.length, href: "/dashboard/startups",
    });
  }

  // ── Training ──────────────────────────────────────────────────────────────

  try {
    const requiredCourses = await prisma.course.findMany({ where: { isRequired: true }, select: { id: true, title: true } });
    for (const course of requiredCourses) {
      const enrolledCount = await prisma.courseEnrollment.count({ where: { courseId: course.id } });
      if (enrolledCount < employees.length / 2) {
        insights.push({
          id: nextId(), severity: "info", module: "Training",
          title: `Low enrollment: "${course.title}"`,
          description: `Only ${enrolledCount} of ${employees.length} employees have enrolled in this required course.`,
          value: enrolledCount, href: "/dashboard/training",
        });
      }
    }
  } catch { /* courses table may not exist yet */ }

  // ── Positive insights ─────────────────────────────────────────────────────

  const presentToday = await prisma.attendance.count({
    where: { date: new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z"), checkIn: { not: null } },
  });
  if (employees.length > 0 && presentToday / employees.length >= 0.9) {
    insights.push({
      id: nextId(), severity: "success", module: "Attendance",
      title: `Great attendance today — ${Math.round((presentToday / employees.length) * 100)}%`,
      description: `${presentToday} out of ${employees.length} employees have checked in today.`,
      value: presentToday, href: "/dashboard/attendance",
    });
  }

  // Sort: critical → warning → info → success
  const order = { critical: 0, warning: 1, info: 2, success: 3 };
  insights.sort((a, b) => order[a.severity] - order[b.severity]);

  return NextResponse.json({ insights });
}
