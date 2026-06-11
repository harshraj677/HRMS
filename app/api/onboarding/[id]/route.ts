import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "Action required." }, { status: 400 });

  const employee = await prisma.employee.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  if (body.action === "approve") {
    await prisma.employee.update({
      where: { id },
      data: {
        approvalStatus: "ACTIVE",
        approvalDate: new Date(),
        approvedBy: payload.id,
        rejectionReason: null,
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: id,
        title: "Your profile has been approved! 🎉",
        message: "Your onboarding profile has been reviewed and approved. Welcome aboard!",
        type: "onboarding_approved",
        link: "/dashboard",
      },
    });

    return NextResponse.json({ approvalStatus: "ACTIVE" });
  }

  if (body.action === "reject") {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return NextResponse.json({ error: "Rejection reason required." }, { status: 400 });

    await prisma.employee.update({
      where: { id },
      data: { approvalStatus: "REJECTED", rejectionReason: reason },
    });

    await prisma.notification.create({
      data: {
        recipientId: id,
        title: "Profile changes requested",
        message: `Your onboarding profile needs some changes before it can be approved: ${reason}`,
        type: "onboarding_rejected",
        link: "/dashboard",
      },
    });

    return NextResponse.json({ approvalStatus: "REJECTED" });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
