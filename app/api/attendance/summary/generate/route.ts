import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/**
 * POST /api/attendance/summary/generate
 * Computes and upserts DailySummary rows for a date range.
 * Designed to be called by a scheduled job or manually from the admin UI.
 *
 * Body: { dateFrom?: string, dateTo?: string }  — defaults to today.
 */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const todayStr = new Date().toISOString().slice(0, 10);
  const fromStr = body?.dateFrom ?? todayStr;
  const toStr = body?.dateTo ?? todayStr;

  const from = new Date(fromStr + "T00:00:00.000Z");
  const to = new Date(toStr + "T00:00:00.000Z");

  // Build date range (one entry per day)
  const dates: Date[] = [];
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400_000)) {
    dates.push(new Date(d));
  }
  if (dates.length > 90) {
    return NextResponse.json({ error: "Maximum 90 days per generation run." }, { status: 400 });
  }

  const totalEmployees = await prisma.employee.count({
    where: { role: { not: "admin" }, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
  });

  let generated = 0;

  for (const date of dates) {
    const endOfDay = new Date(date.getTime() + 86400_000);

    const records = await prisma.attendance.findMany({
      where: { date, deletedAt: null },
      select: {
        status: true,
        isRemote: true,
        needsReview: true,
        reviewStatus: true,
        faceScore: true,
        livenessScore: true,
        policyResult: true,
      },
    });

    const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const remoteCount = records.filter((r) => r.isRemote).length;
    const flaggedCount = records.filter((r) => r.reviewStatus === "flagged").length;
    const approvedCount = records.filter((r) => r.reviewStatus === "approved").length;
    const rejectedCount = records.filter((r) => r.reviewStatus === "rejected").length;

    const policyViolationCount = records.filter((r) => {
      const pr = r.policyResult as any;
      return pr?.status === "outside" || pr?.status === "blocked";
    }).length;

    const faceScores = records.filter((r) => r.faceScore != null).map((r) => r.faceScore!);
    const livenessScores = records.filter((r) => r.livenessScore != null).map((r) => r.livenessScore!);
    const avgFaceScore = faceScores.length
      ? Math.round(faceScores.reduce((s, v) => s + v, 0) / faceScores.length)
      : null;
    const avgLivenessScore = livenessScores.length
      ? Math.round(livenessScores.reduce((s, v) => s + v, 0) / livenessScores.length)
      : null;

    await prisma.dailySummary.upsert({
      where: { date },
      update: {
        totalEmployees,
        presentCount,
        lateCount,
        absentCount: Math.max(0, totalEmployees - presentCount),
        remoteCount,
        flaggedCount,
        approvedCount,
        rejectedCount,
        avgFaceScore,
        avgLivenessScore,
        policyViolationCount,
        generatedAt: new Date(),
      },
      create: {
        date,
        totalEmployees,
        presentCount,
        lateCount,
        absentCount: Math.max(0, totalEmployees - presentCount),
        remoteCount,
        flaggedCount,
        approvedCount,
        rejectedCount,
        avgFaceScore,
        avgLivenessScore,
        policyViolationCount,
      },
    });
    generated++;
  }

  return NextResponse.json({ generated, message: `${generated} daily summary row(s) upserted.` });
}
