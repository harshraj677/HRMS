import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // Jobs are publicly visible for the careers page; authenticated users see all
  const url    = new URL(req.url);
  const status = url.searchParams.get("status") ?? "active";
  const dept   = url.searchParams.get("department") ?? "";

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (dept) where.department = dept;

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim() || !body?.description?.trim()) {
    return NextResponse.json({ error: "title and description are required." }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      title:          body.title.trim(),
      department:     body.department?.trim() || null,
      location:       body.location?.trim()   || null,
      experience:     body.experience?.trim() || null,
      salaryMin:      body.salaryMin  ? Number(body.salaryMin)  : null,
      salaryMax:      body.salaryMax  ? Number(body.salaryMax)  : null,
      employmentType: body.employmentType ?? "Full-time",
      skills:         Array.isArray(body.skills) ? body.skills : [],
      description:    body.description.trim(),
      status:         body.status ?? "active",
      deadline:       body.deadline ? new Date(body.deadline) : null,
      createdById:    payload.id,
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
