import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (payload.role !== "admin" && ticket.createdById !== payload.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Enrich messages with sender names
  const messages = await Promise.all(
    ticket.messages.map(async (m) => {
      const sender = await prisma.employee.findUnique({ where: { id: m.senderId }, select: { fullName: true, role: true } });
      return { ...m, senderName: sender?.fullName ?? "Unknown", senderRole: sender?.role ?? "employee" };
    })
  );

  return NextResponse.json({ ticket: { ...ticket, messages } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (payload.role !== "admin" && ticket.createdById !== payload.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (payload.role === "admin") {
    if (body.status)       data.status       = body.status;
    if (body.priority)     data.priority     = body.priority;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  }

  const updated = await prisma.ticket.update({ where: { id }, data });

  // Notify employee if status changed
  if (body.status && body.status !== ticket.status) {
    await prisma.notification.create({
      data: {
        recipientId: ticket.createdById,
        title: `Ticket ${body.status === "resolved" ? "Resolved ✓" : "Updated"}`,
        message: `Your ticket "${ticket.subject}" is now ${body.status}.`,
        type: "info",
        link: "/dashboard/tickets",
      },
    });
  }

  return NextResponse.json({ ticket: updated });
}
