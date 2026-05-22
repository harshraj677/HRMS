import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Accept multipart form OR JSON { imageData: "data:..." }
  let dataUrl: string | null = null;

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image exceeds 2 MB." }, { status: 413 });
    const buf = await file.arrayBuffer();
    dataUrl = `data:${file.type};base64,${Buffer.from(buf).toString("base64")}`;
  } else {
    const body = await req.json().catch(() => null);
    if (!body?.imageData) return NextResponse.json({ error: "imageData required." }, { status: 400 });
    dataUrl = body.imageData as string;
    const base64Part = dataUrl.split(",")[1] ?? "";
    if (Math.ceil((base64Part.length * 3) / 4) > MAX_BYTES) {
      return NextResponse.json({ error: "Image exceeds 2 MB." }, { status: 413 });
    }
  }

  const profile = await prisma.employeeProfile.upsert({
    where: { employeeId: id },
    update: { avatar: dataUrl },
    create: { employeeId: id, avatar: dataUrl },
  });

  return NextResponse.json({ profile });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.employeeProfile.upsert({
    where: { employeeId: id },
    update: { avatar: null },
    create: { employeeId: id },
  });

  return NextResponse.json({ message: "Avatar removed." });
}
