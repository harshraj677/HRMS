import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/**
 * GET /api/attendance/review-queue
 * Paginated, filtered list of attendance records needing or having had review.
 *
 * Query params:
 *   page          (default 1)
 *   limit         (default 20, max 100)
 *   reviewStatus  "flagged"|"approved"|"rejected"|"auto" (default "flagged")
 *   department    employee department filter
 *   employeeId    specific employee
 *   dateFrom      ISO date string
 *   dateTo        ISO date string
 *   minFaceScore  number 0–100 — only records below this score
 *   liveness      "passed"|"failed"|"unknown"
 */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const u = new URL(req.url);
  const page = Math.max(1, Number(u.searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(u.searchParams.get("limit") ?? 20)));
  const skip = (page - 1) * limit;

  const reviewStatus = u.searchParams.get("reviewStatus") ?? "flagged";
  const department = u.searchParams.get("department");
  const employeeId = u.searchParams.get("employeeId");
  const dateFrom = u.searchParams.get("dateFrom");
  const dateTo = u.searchParams.get("dateTo");
  const minFaceScore = u.searchParams.get("minFaceScore") ? Number(u.searchParams.get("minFaceScore")) : null;
  const liveness = u.searchParams.get("liveness");

  // Build where clause
  const where: any = { reviewStatus };

  if (employeeId) where.employeeId = employeeId;

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  // Face score filter: records with score BELOW threshold (low confidence = suspicious)
  if (minFaceScore !== null) {
    where.OR = [
      { faceScore: null },
      { faceScore: { lt: minFaceScore } },
    ];
  }

  if (liveness) where.livenessResult = liveness;

  // Department filter requires joining to employee
  let employeeIdsForDept: string[] | undefined;
  if (department) {
    const emps = await prisma.employee.findMany({
      where: { department, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      select: { id: true },
    });
    employeeIdsForDept = emps.map((e) => e.id);
    where.employeeId = { in: employeeIdsForDept };
  }

  const [total, records] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      include: { employee: { select: { fullName: true, department: true, email: true } } },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const queue = records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    fullName: r.employee.fullName,
    department: r.employee.department ?? null,
    email: r.employee.email,
    date: r.date,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    hours: r.hours,
    status: r.status,
    reviewStatus: r.reviewStatus,
    reviewedAt: r.reviewedAt ?? null,
    reviewNotes: r.reviewNotes ?? null,
    needsReview: r.needsReview,
    faceVerified: r.faceVerified ?? null,
    faceScore: r.faceScore ?? null,
    livenessResult: r.livenessResult ?? null,
    livenessScore: r.livenessScore ?? null,
    policyResult: r.policyResult ?? null,
    isRemote: r.isRemote,
    manualOverride: r.manualOverride,
    overrideNote: r.overrideNote ?? null,
    distanceFromOffice: r.distanceFromOffice ?? null,
    checkInPhoto: r.checkInPhoto ?? null,
    device: r.device ?? null,
  }));

  return NextResponse.json({
    queue,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
