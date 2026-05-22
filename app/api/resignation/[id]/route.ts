import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const VALID_STATUSES = ["submitted","manager_review","hr_review","clearance_pending","completed","rejected"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const resign = await prisma.resignation.findUnique({ where: { id } });
  if (!resign) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (payload.role === "admin") {
    if (body.status && VALID_STATUSES.includes(body.status)) data.status = body.status;
    if (body.managerComment !== undefined) data.managerComment = body.managerComment;
    if (body.hrComment      !== undefined) data.hrComment      = body.hrComment;
    // Checklist items
    for (const f of ["laptopReturned","idCardReturned","payrollCleared","docsHandedOver"]) {
      if (body[f] !== undefined) data[f] = !!body[f];
    }
  } else {
    // Employee can only add exit feedback
    if (resign.employeeId !== payload.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    if (body.exitFeedback !== undefined) data.exitFeedback = body.exitFeedback;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No updatable fields." }, { status: 400 });

  const updated = await prisma.resignation.update({ where: { id }, data });

  // Notify employee on status change
  if (body.status && body.status !== resign.status) {
    const msg = body.status === "completed" ? "Your exit process is complete." :
                body.status === "rejected"  ? "Your resignation has been rejected." :
                `Your resignation status updated to: ${body.status.replace(/_/g," ")}.`;
    await prisma.notification.create({
      data: {
        recipientId: resign.employeeId,
        title: "Exit Status Update",
        message: msg,
        type: body.status === "rejected" ? "warning" : "info",
        link: "/dashboard/resignation",
      },
    });
  }

  return NextResponse.json({ resignation: updated });
}
