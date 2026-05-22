import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const courses = await prisma.course.findMany({
    include: {
      enrollments: { where: { employeeId: payload.id }, select: { progress: true, completed: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = courses.map((c) => ({
    id:            c.id,
    title:         c.title,
    description:   c.description,
    category:      c.category,
    level:         c.level,
    durationMins:  c.durationMins,
    isRequired:    c.isRequired,
    createdAt:     c.createdAt,
    enrolledCount: c._count.enrollments,
    myProgress:    c.enrollments[0]?.progress ?? null,
    myCompleted:   c.enrollments[0]?.completed ?? false,
    isEnrolled:    c.enrollments.length > 0,
  }));

  return NextResponse.json({ courses: enriched });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const course = await prisma.course.create({
    data: {
      title:       body.title.trim(),
      description: body.description?.trim() || null,
      category:    body.category ?? "general",
      content:     body.content?.trim() || null,
      durationMins: body.durationMins ? Number(body.durationMins) : null,
      level:       body.level ?? "beginner",
      isRequired:  !!body.isRequired,
      createdById: payload.id,
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}
