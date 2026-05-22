import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (event.status === "completed" || event.status === "cancelled") {
    return NextResponse.json({ error: "Event is no longer open for registration." }, { status: 400 });
  }

  // Check capacity
  if (event.maxCapacity) {
    const count = await prisma.eventRegistration.count({ where: { eventId: id } });
    if (count >= event.maxCapacity) return NextResponse.json({ error: "Event is at full capacity." }, { status: 400 });
  }

  const reg = await prisma.eventRegistration.upsert({
    where: { eventId_employeeId: { eventId: id, employeeId: payload.id } },
    update: {},
    create: { eventId: id, employeeId: payload.id },
  });

  return NextResponse.json({ registration: reg }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  await prisma.eventRegistration.deleteMany({ where: { eventId: id, employeeId: payload.id } });
  return NextResponse.json({ message: "Unregistered." });
}
