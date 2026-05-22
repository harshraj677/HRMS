import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const url       = new URL(req.url);
  const startupId = url.searchParams.get("startupId") ?? "";

  const where: Record<string, unknown> = {};
  if (startupId) where.startupId = startupId;

  const reviews = await prisma.mentorReview.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    reviews.map(async (r) => {
      const reviewer = await prisma.employee.findUnique({
        where: { id: r.reviewerId },
        select: { fullName: true, position: true },
      });
      const startup = await prisma.startup.findUnique({
        where: { id: r.startupId },
        select: { startupName: true },
      });
      return { ...r, reviewerName: reviewer?.fullName ?? "Unknown", reviewerPosition: reviewer?.position ?? null, startupName: startup?.startupName ?? "Unknown" };
    })
  );

  return NextResponse.json({ reviews: enriched });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.startupId || !body?.notes?.trim() || body?.score == null) {
    return NextResponse.json({ error: "startupId, score and notes are required." }, { status: 400 });
  }

  const score = Math.min(10, Math.max(1, Number(body.score)));

  const review = await prisma.mentorReview.create({
    data: {
      startupId:  body.startupId,
      reviewerId: payload.id,
      score,
      notes:      body.notes.trim(),
      category:   body.category ?? "general",
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}
