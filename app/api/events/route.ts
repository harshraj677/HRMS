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

  const events = await prisma.event.findMany({
    where,
    include: { registrations: { select: { employeeId: true } }, _count: { select: { registrations: true } } },
    orderBy: { startDate: "asc" },
  });

  const enriched = events.map((e) => ({
    ...e,
    registrationCount: e._count.registrations,
    isRegistered: e.registrations.some((r) => r.employeeId === payload.id),
  }));

  return NextResponse.json({ events: enriched });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim() || !body?.startDate) return NextResponse.json({ error: "title and startDate required." }, { status: 400 });

  const event = await prisma.event.create({
    data: {
      title:       body.title.trim(),
      description: body.description?.trim() || null,
      eventType:   body.eventType ?? "workshop",
      startDate:   new Date(body.startDate),
      endDate:     body.endDate ? new Date(body.endDate) : null,
      location:    body.location?.trim() || null,
      isOnline:    !!body.isOnline,
      maxCapacity: body.maxCapacity ? Number(body.maxCapacity) : null,
      status:      "upcoming",
      createdById: payload.id,
    },
  });

  // Notify all employees
  const emps = await prisma.employee.findMany({
    where: { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true },
  });
  if (emps.length > 0) {
    await prisma.notification.createMany({
      data: emps.map((e) => ({
        recipientId: e.id,
        title:       `📅 New Event: ${event.title}`,
        message:     `Register now for ${event.title} on ${new Date(event.startDate).toLocaleDateString("en-IN")}.`,
        type:        "info",
        link:        "/dashboard/events",
      })),
    });
  }

  return NextResponse.json({ event }, { status: 201 });
}
