import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const employee = await prisma.employee.findUnique({
    where: { id: payload.id },
    select: { id: true, approvalStatus: true },
  });
  if (!employee) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const wasRejected = employee.approvalStatus === "REJECTED";

  await prisma.employee.update({
    where: { id: employee.id },
    data: { approvalStatus: "PROFILE_SUBMITTED", rejectionReason: null },
  });

  const admins = await prisma.employee.findMany({
    where: { role: "admin", OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        recipientId: admin.id,
        title: wasRejected ? "Profile resubmitted for review" : "New profile submitted for review",
        message: wasRejected
          ? "An employee has resubmitted their onboarding profile after addressing your feedback."
          : "An employee has submitted their onboarding profile for approval.",
        type: wasRejected ? "profile_resubmitted" : "profile_submitted",
        link: "/dashboard/onboarding",
      })),
    });
  }

  return NextResponse.json({ approvalStatus: "PROFILE_SUBMITTED" });
}
