import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id, docId } = await params;
  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const doc = await prisma.employeeDocument.findFirst({
    where: { id: docId, employeeId: id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
  });
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  await prisma.employeeDocument.update({ where: { id: docId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ message: "Document deleted." });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  if (payload.role !== "admin") {
    return NextResponse.json({ error: "Only admins can verify documents." }, { status: 403 });
  }

  const { id, docId } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.verificationStatus as string;

  if (!["verified", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "verificationStatus must be verified, rejected, or pending." }, { status: 400 });
  }

  const doc = await prisma.employeeDocument.update({
    where: { id: docId },
    data: {
      verificationStatus: status,
      verifiedAt: status !== "pending" ? new Date() : null,
      verifiedBy: status !== "pending" ? payload.id : null,
      rejectionReason: status === "rejected" ? (body.rejectionReason ?? null) : null,
    },
  });

  // Notify employee
  const admin = await prisma.employee.findUnique({ where: { id: payload.id }, select: { fullName: true } });
  const msg = status === "verified"
    ? `Your ${doc.documentType} document has been verified.`
    : `Your ${doc.documentType} document was rejected${body.rejectionReason ? `: ${body.rejectionReason}` : "."}`;

  await prisma.notification.create({
    data: {
      recipientId: id,
      title: status === "verified" ? "Document Verified ✓" : "Document Rejected",
      message: msg,
      type: status === "verified" ? "info" : "warning",
      link: "/dashboard/profile",
    },
  });

  return NextResponse.json({ document: doc });
}
