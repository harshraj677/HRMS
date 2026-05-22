import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url    = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (payload.role !== "admin") where.createdById = payload.id;

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Enrich with creator name
  const enriched = await Promise.all(
    tickets.map(async (t) => {
      const creator = await prisma.employee.findUnique({ where: { id: t.createdById }, select: { fullName: true, department: true } });
      let assigneeName: string | null = null;
      if (t.assignedToId) {
        const as = await prisma.employee.findUnique({ where: { id: t.assignedToId }, select: { fullName: true } });
        assigneeName = as?.fullName ?? null;
      }
      return { ...t, creatorName: creator?.fullName ?? "Unknown", creatorDept: creator?.department ?? null, assigneeName };
    })
  );

  return NextResponse.json({ tickets: enriched });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.subject?.trim() || !body?.description?.trim() || !body?.category) {
    return NextResponse.json({ error: "subject, category, description are required." }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject:     body.subject.trim(),
      category:    body.category,
      priority:    body.priority ?? "medium",
      description: body.description.trim(),
      status:      "open",
      createdById: payload.id,
    },
  });

  // Notify admins
  const admins = await prisma.employee.findMany({
    where: { role: "admin", OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true },
  });
  if (admins.length > 0) {
    const emp = await prisma.employee.findUnique({ where: { id: payload.id }, select: { fullName: true } });
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        recipientId: a.id,
        title: "New Support Ticket",
        message: `${emp?.fullName ?? "An employee"} raised: "${ticket.subject}"`,
        type: "info",
        link: "/dashboard/helpdesk",
      })),
    });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
