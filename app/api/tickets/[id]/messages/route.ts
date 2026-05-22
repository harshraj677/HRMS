import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true, createdById: true, subject: true, status: true } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  if (payload.role !== "admin" && ticket.createdById !== payload.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.content?.trim()) return NextResponse.json({ error: "content required." }, { status: 400 });

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId:   id,
      senderId:   payload.id,
      content:    body.content.trim(),
      isInternal: payload.role === "admin" && !!body.isInternal,
    },
  });

  // Mark ticket as in_progress if it was open
  if (ticket.status === "open" && payload.role === "admin") {
    await prisma.ticket.update({ where: { id }, data: { status: "in_progress" } });
  }

  // Notify the other party
  const notifyId = payload.role === "admin" ? ticket.createdById : null;
  if (notifyId && notifyId !== payload.id) {
    const sender = await prisma.employee.findUnique({ where: { id: payload.id }, select: { fullName: true } });
    await prisma.notification.create({
      data: {
        recipientId: notifyId,
        title: "Ticket Reply",
        message: `${sender?.fullName ?? "Support"} replied to "${ticket.subject}"`,
        type: "info",
        link: `/dashboard/tickets`,
      },
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
