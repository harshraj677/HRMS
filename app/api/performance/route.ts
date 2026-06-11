import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken, type JWTPayload } from "@/lib/auth";
import { getActiveEmployeesFlat, getOrgScopedEmployeeIds } from "@/lib/orgHierarchy";
import {
  getCurrentPeriod, getPeriodRange, previousPeriod, countWorkingDaysInRange,
  computeAttendanceScore, computeTaskScore, computeLeaveScore, computeOverallScore,
  getPerformanceBand, getPerformanceBandStyle, classifyRecommendations,
  type PeriodType,
} from "@/lib/performance";

const PERIOD_TYPES: PeriodType[] = ["monthly", "quarterly", "yearly"];

function parsePeriodParams(req: NextRequest): { period: string; periodType: PeriodType } {
  const { searchParams } = new URL(req.url);
  const periodTypeParam = searchParams.get("periodType");
  const periodType: PeriodType = PERIOD_TYPES.includes(periodTypeParam as PeriodType)
    ? (periodTypeParam as PeriodType)
    : "monthly";
  const period = searchParams.get("period") || getCurrentPeriod(periodType);
  return { period, periodType };
}

/** Average of numeric values inside a JSON ratings object, scaled from 1-5 to 0-100. */
function averageRatingScore(ratings: unknown): number | null {
  if (!ratings || typeof ratings !== "object") return null;
  const values = Object.values(ratings as Record<string, unknown>).filter(
    (v): v is number => typeof v === "number"
  );
  if (values.length === 0) return null;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return (avg / 5) * 100;
}

function decorateRecord(rec: {
  employeeId: string;
  period: string;
  periodType: string;
  attendanceScore: number;
  taskScore: number;
  leaveScore: number;
  trainingScore: number;
  managerFeedbackScore: number;
  peerFeedbackScore: number;
  overallScore: number;
  attendancePercent: number;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  leavesTaken: number;
  trainingCompletionPercent: number;
  generatedAt: Date;
}, employee: { fullName: string; department: string | null; role: string; profile?: { avatar: string | null } | null }) {
  const band = getPerformanceBand(rec.overallScore);
  return {
    ...rec,
    fullName: employee.fullName,
    department: employee.department,
    role: employee.role,
    avatar: employee.profile?.avatar ?? null,
    band,
    ...getPerformanceBandStyle(band),
  };
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { period, periodType } = parsePeriodParams(req);
  const isPrivileged = payload.role === "admin" || payload.role === "hr" || payload.role === "manager";

  let scopedIds: string[] = [payload.id];
  let employees: Awaited<ReturnType<typeof getActiveEmployeesFlat>> = [];

  if (isPrivileged) {
    employees = await getActiveEmployeesFlat();
    scopedIds = getOrgScopedEmployeeIds(payload as JWTPayload, employees).filter((id) => {
      const emp = employees.find((e) => e.id === id);
      return emp && emp.role !== "admin";
    });
  }

  const allIds = isPrivileged ? Array.from(new Set([...scopedIds, payload.id])) : [payload.id];

  const records = await prisma.performanceRecord.findMany({
    where: { employeeId: { in: allIds }, period, periodType },
  });

  let employeeInfo = new Map(employees.map((e) => [e.id, e]));
  if (!isPrivileged) {
    const me = await prisma.employee.findUnique({
      where: { id: payload.id },
      select: { fullName: true, department: true, role: true, profile: { select: { avatar: true } } },
    });
    if (me) employeeInfo = new Map([[payload.id, me as unknown as (typeof employees)[number]]]);
  }

  const decorated = records
    .map((r) => {
      const emp = employeeInfo.get(r.employeeId);
      if (!emp) return null;
      return decorateRecord(r, emp);
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const self = decorated.find((r) => r.employeeId === payload.id) ?? null;

  if (!isPrivileged) {
    return NextResponse.json({
      period, periodType, self,
      records: [], rankings: [], departmentBreakdown: [],
      topPerformers: [], needsAttention: [], recommendations: [],
    });
  }

  const scopedRecords = decorated.filter((r) => scopedIds.includes(r.employeeId));
  const rankings = [...scopedRecords].sort((a, b) => b.overallScore - a.overallScore);

  const deptMap = new Map<string, { total: number; count: number }>();
  for (const r of scopedRecords) {
    const dept = r.department ?? "Unassigned";
    const entry = deptMap.get(dept) ?? { total: 0, count: 0 };
    entry.total += r.overallScore;
    entry.count += 1;
    deptMap.set(dept, entry);
  }
  const departmentBreakdown = Array.from(deptMap.entries())
    .map(([department, v]) => ({ department, avgScore: Math.round(v.total / v.count), count: v.count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const topPerformers = rankings.slice(0, 5);
  const needsAttention = [...scopedRecords]
    .filter((r) => r.band === "needs_improvement" || r.band === "at_risk")
    .sort((a, b) => a.overallScore - b.overallScore)
    .slice(0, 5);

  let recommendations: Awaited<ReturnType<typeof prisma.performanceRecommendation.findMany>> = [];
  if (payload.role === "admin" || payload.role === "hr") {
    const recIds = scopedRecords.map((r) => r.employeeId);
    const recs = recIds.length
      ? await prisma.performanceRecommendation.findMany({ where: { employeeId: { in: recIds }, period } })
      : [];
    recommendations = recs;
  }
  const recommendationsView = recommendations.map((r) => ({
    ...r,
    fullName: employeeInfo.get(r.employeeId)?.fullName ?? "Unknown",
    department: employeeInfo.get(r.employeeId)?.department ?? null,
  }));

  return NextResponse.json({
    period, periodType, self,
    records: scopedRecords, rankings, departmentBreakdown,
    topPerformers, needsAttention, recommendations: recommendationsView,
  });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const periodType: PeriodType = PERIOD_TYPES.includes(body?.periodType) ? body.periodType : "monthly";
  const period: string = typeof body?.period === "string" && body.period ? body.period : getCurrentPeriod(periodType);

  const { start, end } = getPeriodRange(period, periodType);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return NextResponse.json({ error: "Invalid period." }, { status: 400 });
  }

  const employees = await prisma.employee.findMany({
    where: {
      role: { not: "admin" },
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    },
    select: { id: true, fullName: true, leaveBalance: true },
  });

  const workingDays = countWorkingDaysInRange(start, end);
  const prev1 = previousPeriod(period, periodType);
  const prev2 = previousPeriod(prev1, periodType);

  let generated = 0;

  for (const emp of employees) {
    const [attendanceRecords, tasksAssignedInPeriod, tasksCompletedInPeriod, tasksOverdue, leaveRequests, trainingRecords, feedbackEntries] =
      await Promise.all([
        prisma.attendance.findMany({
          where: { employeeId: emp.id, date: { gte: start, lt: end } },
          select: { status: true, checkIn: true },
        }),
        prisma.task.count({
          where: { assignedToId: emp.id, createdAt: { gte: start, lt: end }, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
        }),
        prisma.task.count({
          where: { assignedToId: emp.id, status: "completed", completedAt: { gte: start, lt: end } },
        }),
        prisma.task.count({
          where: {
            assignedToId: emp.id,
            dueDate: { gte: start, lt: end },
            status: { notIn: ["completed", "cancelled"] },
            OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
          },
        }),
        prisma.leaveRequest.findMany({
          where: {
            employeeId: emp.id, status: "approved",
            startDate: { lt: end }, endDate: { gte: start },
          },
          select: { days: true },
        }),
        prisma.trainingRecord.findMany({
          where: {
            employeeId: emp.id, assignedAt: { lt: end },
            OR: [{ completedAt: null }, { completedAt: { gte: start } }],
          },
          select: { progress: true },
        }),
        prisma.feedbackEntry.findMany({
          where: { employeeId: emp.id, period },
          select: { ratings: true, reviewerRole: true },
        }),
      ]);

    const presentDays = attendanceRecords.filter((a) => a.checkIn !== null && ["present", "late"].includes(a.status)).length;
    const lateDays = attendanceRecords.filter((a) => a.status === "late").length;
    const attendancePercent = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
    const attendanceScore = computeAttendanceScore({ workingDays, presentDays, lateDays });

    const taskScore = computeTaskScore({
      tasksAssigned: tasksAssignedInPeriod,
      tasksCompleted: tasksCompletedInPeriod,
      tasksOverdue,
    });

    const leavesTaken = leaveRequests.reduce((sum, lr) => sum + lr.days, 0);
    const leaveScore = computeLeaveScore(leavesTaken, emp.leaveBalance);

    const hasTraining = trainingRecords.length > 0;
    const trainingCompletionPercent = hasTraining
      ? trainingRecords.reduce((sum, t) => sum + t.progress, 0) / trainingRecords.length
      : 0;

    const managerScores = feedbackEntries
      .filter((f) => f.reviewerRole === "manager" || f.reviewerRole === "hr")
      .map((f) => averageRatingScore(f.ratings))
      .filter((s): s is number => s !== null);
    const peerScores = feedbackEntries
      .filter((f) => f.reviewerRole === "peer" || f.reviewerRole === "self")
      .map((f) => averageRatingScore(f.ratings))
      .filter((s): s is number => s !== null);
    const hasFeedback = managerScores.length > 0 || peerScores.length > 0;
    const managerFeedbackScore = managerScores.length ? managerScores.reduce((s, v) => s + v, 0) / managerScores.length : 0;
    const peerFeedbackScore = peerScores.length ? peerScores.reduce((s, v) => s + v, 0) / peerScores.length : 0;

    const overallScore = computeOverallScore({
      attendanceScore, taskScore, leaveScore,
      trainingScore: trainingCompletionPercent,
      managerFeedbackScore, peerFeedbackScore,
      hasTraining, hasFeedback,
    });

    await prisma.performanceRecord.upsert({
      where: { employeeId_period_periodType: { employeeId: emp.id, period, periodType } },
      create: {
        employeeId: emp.id, period, periodType,
        attendanceScore, taskScore, leaveScore,
        trainingScore: trainingCompletionPercent,
        managerFeedbackScore, peerFeedbackScore, overallScore,
        attendancePercent,
        tasksAssigned: tasksAssignedInPeriod, tasksCompleted: tasksCompletedInPeriod, tasksOverdue,
        leavesTaken, trainingCompletionPercent,
      },
      update: {
        attendanceScore, taskScore, leaveScore,
        trainingScore: trainingCompletionPercent,
        managerFeedbackScore, peerFeedbackScore, overallScore,
        attendancePercent,
        tasksAssigned: tasksAssignedInPeriod, tasksCompleted: tasksCompletedInPeriod, tasksOverdue,
        leavesTaken, trainingCompletionPercent,
        generatedAt: new Date(),
      },
    });

    // Trend-based recommendations (advisory only — never auto-applied)
    const [prevRecord1, prevRecord2] = await Promise.all([
      prisma.performanceRecord.findUnique({ where: { employeeId_period_periodType: { employeeId: emp.id, period: prev1, periodType } } }),
      prisma.performanceRecord.findUnique({ where: { employeeId_period_periodType: { employeeId: emp.id, period: prev2, periodType } } }),
    ]);
    const previousScores = [prevRecord1?.overallScore, prevRecord2?.overallScore].filter((s): s is number => s !== undefined);
    const recs = classifyRecommendations({ overallScore, attendancePercent, tasksOverdue, previousScores });

    await prisma.performanceRecommendation.deleteMany({ where: { employeeId: emp.id, period } });
    if (recs.length > 0) {
      await prisma.performanceRecommendation.createMany({
        data: recs.map((r) => ({ employeeId: emp.id, period, type: r.type, note: r.note })),
      });
    }

    generated++;
  }

  return NextResponse.json({ message: `Performance records generated for ${generated} employees.`, period, periodType, generated });
}
