import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const MAX_BYTES = 10 * 1024 * 1024;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const file         = form.get("file") as File | null;
  const documentName = form.get("documentName") as string | null;
  const documentType = form.get("documentType") as string | null;

  if (!file || !documentName || !documentType) {
    return NextResponse.json({ error: "file, documentName, and documentType are required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB." }, { status: 413 });
  }

  const buf    = await file.arrayBuffer();
  const dataUrl = `data:${file.type};base64,${Buffer.from(buf).toString("base64")}`;

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: id,
      documentName: documentName.trim(),
      documentType,
      documentUrl: dataUrl,
      verificationStatus: "pending",
    },
  });

  // Notify admins about new document
  const admins = await prisma.employee.findMany({
    where: { role: "admin", OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true },
  });
  if (admins.length > 0) {
    const emp = await prisma.employee.findUnique({ where: { id }, select: { fullName: true } });
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        recipientId: a.id,
        title: "New Document Uploaded",
        message: `${emp?.fullName ?? "An employee"} uploaded a ${documentType} document for verification.`,
        type: "info",
        link: `/dashboard/employees/${id}`,
      })),
    });
  }

  return NextResponse.json({ document: doc }, { status: 201 });
}
