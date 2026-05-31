import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { sendEmployeeEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const employees = await prisma.employee.findMany({
    where: { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      department: true,
      position: true,
      role: true,
      leaveBalance: true,
      status: true,
      createdAt: true,
      reportingManagerId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.fullName || !body?.email) {
    return NextResponse.json({ error: "fullName and email are required." }, { status: 400 });
  }

  const emailAddr = body.email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr)) {
    return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { email: emailAddr }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "An employee with this email already exists." }, { status: 409 });
  }

  const randomPassword = crypto.randomBytes(4).toString("hex") + "A1!";
  const passwordHash = await bcrypt.hash(randomPassword, 12);

  const role: string = body.role || "employee";

  const employee = await prisma.employee.create({
    data: {
      fullName: body.fullName.trim(),
      email: emailAddr,
      phone: body.phone?.trim() || null,
      department: body.department?.trim() || null,
      position: body.position?.trim() || null,
      role,
      passwordHash,
      leaveBalance: body.leaveBalance ?? 18,
      mustChangePassword: true,
      status: "active",
    },
  });

  // Admin accounts skip automated email — the creator sees the password on screen
  // and shares it through a secure channel of their choice.
  let emailSent = false;
  if (role !== "admin") {
    const emailResult = await sendEmployeeEmail(emailAddr, body.fullName.trim(), randomPassword);
    emailSent = emailResult.success;
  }

  await prisma.notification.create({
    data: {
      recipientId: employee.id,
      title: "Welcome to Anvesync!",
      message: "Your account is ready. Check your email for login credentials.",
      type: "welcome",
      link: "/dashboard",
    },
  });

  return NextResponse.json(
    {
      id: employee.id,
      email: emailAddr,
      role,
      emailSent,
      generatedPassword: randomPassword,
    },
    { status: 201 }
  );
}
