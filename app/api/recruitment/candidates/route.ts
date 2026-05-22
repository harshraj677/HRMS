import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url   = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const stage = url.searchParams.get("stage");

  const where: Record<string, unknown> = {};
  if (jobId) where.appliedJobId = jobId;
  if (stage) where.stage = stage;

  // Employees only see candidates they referred
  if (payload.role !== "admin") where.referredById = payload.id;

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ candidates });
}

export async function POST(req: NextRequest) {
  // Anyone can submit a candidate (public apply or employee referral)
  const body = await req.json().catch(() => null);
  if (!body?.fullName?.trim() || !body?.email?.trim()) {
    return NextResponse.json({ error: "fullName and email are required." }, { status: 400 });
  }

  let referredById: string | null = null;
  const token = getTokenFromRequest(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload && payload.role !== "admin") referredById = payload.id;
  }

  // Encode resume if provided as base64
  let resumeBase64: string | null = null;
  if (body.resumeBase64) resumeBase64 = body.resumeBase64;

  const candidate = await prisma.candidate.create({
    data: {
      fullName:      body.fullName.trim(),
      email:         body.email.trim().toLowerCase(),
      phone:         body.phone?.trim()     || null,
      jobTitle:      body.jobTitle?.trim()  || null,
      appliedJobId:  body.appliedJobId      || null,
      stage:         "applied",
      resumeBase64,
      referredById,
    },
  });

  return NextResponse.json({ candidate }, { status: 201 });
}
