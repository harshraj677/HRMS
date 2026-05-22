import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const milestones = await prisma.startupMilestone.findMany({
    where: { startupId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ milestones });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) return NextResponse.json({ error: "title required." }, { status: 400 });

  const milestone = await prisma.startupMilestone.create({
    data: {
      startupId:   id,
      title:       body.title.trim(),
      description: body.description?.trim() || null,
      targetDate:  body.targetDate ? new Date(body.targetDate) : null,
      status:      body.status ?? "pending",
    },
  });
  return NextResponse.json({ milestone }, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { milestoneId, ...data } = body;
  if (!milestoneId) return NextResponse.json({ error: "milestoneId required." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (data.status) { update.status = data.status; if (data.status === "completed") update.completedAt = new Date(); }
  if (data.title)  update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.targetDate  !== undefined) update.targetDate  = data.targetDate ? new Date(data.targetDate) : null;

  const milestone = await prisma.startupMilestone.update({ where: { id: milestoneId }, data: update });
  return NextResponse.json({ milestone });
}
