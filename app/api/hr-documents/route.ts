import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url      = new URL(req.url);
  const search   = url.searchParams.get("search") ?? "";
  const category = url.searchParams.get("category") ?? "";

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  // Non-admins only see public documents
  if (payload.role !== "admin") where.isPublic = true;

  const docs = await prisma.hRDocument.findMany({
    where,
    select: {
      id: true, title: true, description: true, category: true,
      fileName: true, fileType: true, isPublic: true,
      uploadedById: true, createdAt: true,
      // Omit fileBase64 from list view for performance
    },
    orderBy: { createdAt: "desc" },
  });

  let result = docs;
  if (search) {
    const q = search.toLowerCase();
    result = docs.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ documents: result });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form data required." }, { status: 400 });

  const file     = form.get("file") as File | null;
  const title    = form.get("title") as string | null;
  const category = form.get("category") as string | null;
  const desc     = form.get("description") as string | null;
  const isPublic = form.get("isPublic") !== "false";

  if (!file || !title?.trim()) return NextResponse.json({ error: "file and title required." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File exceeds 10 MB." }, { status: 413 });

  const buf        = await file.arrayBuffer();
  const fileBase64 = `data:${file.type};base64,${Buffer.from(buf).toString("base64")}`;

  const doc = await prisma.hRDocument.create({
    data: {
      title: title.trim(),
      description: desc?.trim() || null,
      category: category ?? "general",
      fileBase64,
      fileName: file.name,
      fileType: file.type,
      isPublic,
      uploadedById: payload.id,
    },
  });

  // Notify all employees
  if (isPublic) {
    const emps = await prisma.employee.findMany({
      where: { role: "employee", OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      select: { id: true },
    });
    if (emps.length > 0) {
      await prisma.notification.createMany({
        data: emps.map((e) => ({
          recipientId: e.id,
          title: "New HR Document",
          message: `"${doc.title}" has been added to the HR Documents library.`,
          type: "info",
          link: "/dashboard/hr-documents",
        })),
      });
    }
  }

  return NextResponse.json({ document: { ...doc, fileBase64: undefined } }, { status: 201 });
}
