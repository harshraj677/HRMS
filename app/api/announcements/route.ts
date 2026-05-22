import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  // Employee sees "all" + their own department; admin/manager sees all
  const emp = await prisma.employee.findUnique({
    where: { id: payload.id },
    select: { department: true, role: true },
  });

  const where: Record<string, unknown> = {};
  if (emp?.role !== "admin") {
    where.OR = [
      { audience: "all" },
      { audience: "dept", targetDept: emp?.department ?? "" },
    ];
  }

  const announcements = await prisma.announcement.findMany({
    where,
    include: { createdBy: { select: { fullName: true, position: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Only admins can post announcements." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim() || !body?.content?.trim()) {
    return NextResponse.json({ error: "title and content are required." }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: {
      title:      body.title.trim(),
      content:    body.content.trim(),
      audience:   ["all","dept","managers"].includes(body.audience) ? body.audience : "all",
      targetDept: body.targetDept?.trim() || null,
      isPinned:   !!body.isPinned,
      createdById: payload.id,
    },
    include: { createdBy: { select: { fullName: true, position: true } } },
  });

  // Fan-out notifications
  const empWhere: Record<string, unknown> = {
    OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    id: { not: payload.id },
  };
  if (announcement.audience === "dept" && announcement.targetDept) {
    empWhere.department = announcement.targetDept;
  }
  const recipients = await prisma.employee.findMany({ where: empWhere, select: { id: true } });
  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        recipientId: r.id,
        title: `📢 ${announcement.title}`,
        message: announcement.content.slice(0, 120),
        type: "info",
        link: "/dashboard/announcements",
      })),
    });
  }

  return NextResponse.json({ announcement }, { status: 201 });
}
