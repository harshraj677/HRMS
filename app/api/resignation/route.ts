import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  if (payload.role === "admin") {
    const resignations = await prisma.resignation.findMany({
      orderBy: { createdAt: "desc" },
    });
    const enriched = await Promise.all(
      resignations.map(async (r) => {
        const emp = await prisma.employee.findUnique({ where: { id: r.employeeId }, select: { fullName: true, department: true, position: true } });
        return { ...r, employeeName: emp?.fullName, department: emp?.department, position: emp?.position };
      })
    );
    return NextResponse.json({ resignations: enriched });
  }

  // Employee sees only their own
  const resignation = await prisma.resignation.findUnique({ where: { employeeId: payload.id } });
  return NextResponse.json({ resignation });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  // Check if already submitted
  const existing = await prisma.resignation.findUnique({ where: { employeeId: payload.id } });
  if (existing) return NextResponse.json({ error: "You have already submitted a resignation." }, { status: 409 });

  const body = await req.json().catch(() => null);
  if (!body?.reason?.trim() || !body?.lastWorkingDay) {
    return NextResponse.json({ error: "reason and lastWorkingDay are required." }, { status: 400 });
  }

  const lwd = new Date(body.lastWorkingDay);
  if (isNaN(lwd.getTime()) || lwd <= new Date()) {
    return NextResponse.json({ error: "lastWorkingDay must be a future date." }, { status: 400 });
  }

  const resignation = await prisma.resignation.create({
    data: {
      employeeId:    payload.id,
      reason:        body.reason.trim(),
      lastWorkingDay: lwd,
      status:        "submitted",
    },
  });

  // Notify admins
  const admins = await prisma.employee.findMany({
    where: { role: "admin", OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true },
  });
  const emp = await prisma.employee.findUnique({ where: { id: payload.id }, select: { fullName: true } });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        recipientId: a.id,
        title: "Resignation Submitted",
        message: `${emp?.fullName ?? "An employee"} has submitted their resignation.`,
        type: "warning",
        link: "/dashboard/exits",
      })),
    });
  }

  return NextResponse.json({ resignation }, { status: 201 });
}
