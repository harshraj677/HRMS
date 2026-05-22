import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) return NextResponse.json({ error: "Payroll record not found." }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.action === "mark_paid") {
    data.paymentStatus = "paid";
    data.paidAt = new Date();
    // Notify employee
    await prisma.notification.create({
      data: {
        recipientId: payroll.employeeId,
        title: "Salary Credited",
        message: `Your salary for ${new Date(payroll.year, payroll.month - 1).toLocaleString("default", { month: "long" })} ${payroll.year} has been processed.`,
        type: "info",
        link: "/dashboard/my-payroll",
      },
    });
  } else if (body.action === "mark_pending") {
    data.paymentStatus = "pending";
    data.paidAt = null;
  }

  if (body.managerNotes !== undefined) data.managerNotes = body.managerNotes;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields." }, { status: 400 });
  }

  const updated = await prisma.payroll.update({ where: { id }, data });
  return NextResponse.json({ payroll: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  await prisma.payroll.delete({ where: { id } });
  return NextResponse.json({ message: "Payroll record deleted." });
}
