import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { sendCredentialsEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const employees = await prisma.employee.findMany({
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

  const existing = await prisma.employee.findUnique({
    where: { email: emailAddr },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An employee with this email already exists." },
      { status: 409 }
    );
  }

  const randomPassword = crypto.randomBytes(4).toString("hex") + "A1!";
  const passwordHash = await bcrypt.hash(randomPassword, 12);

  const employee = await prisma.employee.create({
    data: {
      fullName: body.fullName.trim(),
      email: emailAddr,
      phone: body.phone?.trim() || null,
      department: body.department?.trim() || null,
      position: body.position?.trim() || null,
      role: body.role || "employee",
      passwordHash,
      leaveBalance: body.leaveBalance ?? 18,
      mustChangePassword: true,
      status: "active",
    },
  });

  sendCredentialsEmail({
    email: emailAddr,
    fullName: body.fullName.trim(),
    password: randomPassword,
  }).catch(() => {});

  return NextResponse.json(
    {
      id: employee.id,
      message: "Employee created. Login credentials have been sent via email.",
      generatedPassword: randomPassword,
    },
    { status: 201 }
  );
}
