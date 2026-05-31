import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/**
 * GET /api/attendance/summary
 * Returns pre-computed DailySummary rows for dashboard charts.
 * Query params: dateFrom, dateTo (ISO dates, defaults to last 30 days).
 */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const u = new URL(req.url);
  const dateTo = u.searchParams.get("dateTo")
    ? new Date(u.searchParams.get("dateTo")!)
    : new Date();
  const dateFrom = u.searchParams.get("dateFrom")
    ? new Date(u.searchParams.get("dateFrom")!)
    : new Date(Date.now() - 30 * 86400 * 1000);

  const summaries = await prisma.dailySummary.findMany({
    where: { date: { gte: dateFrom, lte: dateTo } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ summaries });
}
