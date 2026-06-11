import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken, type JWTPayload } from "@/lib/auth";
import { getActiveEmployeesFlat, getOrgScopedEmployeeIds } from "@/lib/orgHierarchy";
import { getPerformanceBand, getPerformanceBandStyle, type PeriodType } from "@/lib/performance";

const PERIOD_TYPES: PeriodType[] = ["monthly", "quarterly", "yearly"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const isPrivileged = payload.role === "admin" || payload.role === "hr" || payload.role === "manager";

  if (id !== payload.id) {
    if (!isPrivileged) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const employees = await getActiveEmployeesFlat();
    const scopedIds = getOrgScopedEmployeeIds(payload as JWTPayload, employees);
    if (!scopedIds.includes(id)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const periodTypeParam = searchParams.get("periodType");
  const periodType: PeriodType = PERIOD_TYPES.includes(periodTypeParam as PeriodType)
    ? (periodTypeParam as PeriodType)
    : "monthly";

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, fullName: true, department: true, role: true, profile: { select: { avatar: true } } },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  const records = await prisma.performanceRecord.findMany({
    where: { employeeId: id, periodType },
    orderBy: { period: "asc" },
    take: 12,
  });

  const history = records.map((r) => {
    const band = getPerformanceBand(r.overallScore);
    return { ...r, band, ...getPerformanceBandStyle(band) };
  });

  let recommendations: Awaited<ReturnType<typeof prisma.performanceRecommendation.findMany>> = [];
  if (payload.role === "admin" || payload.role === "hr" || id === payload.id) {
    recommendations = await prisma.performanceRecommendation.findMany({
      where: { employeeId: id },
      orderBy: { generatedAt: "desc" },
      take: 20,
    });
  }

  return NextResponse.json({
    employee: {
      id: employee.id, fullName: employee.fullName,
      department: employee.department, role: employee.role,
      avatar: employee.profile?.avatar ?? null,
    },
    periodType,
    history,
    recommendations,
  });
}
