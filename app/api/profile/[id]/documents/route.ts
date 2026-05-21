import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/profile/[id]/documents
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const user = await verifyToken(token || "");

    const targetId = params.id;

    // Only admin or self can view
    if (user.id !== targetId && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const documents = await prisma.employeeDocument.findMany({
      where: {
        employeeId: targetId,
        deletedAt: null,
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Documents GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/profile/[id]/documents
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const user = await verifyToken(token || "");
    const formData = await request.formData();

    const targetId = params.id;

    // Permission check
    if (user.id !== targetId && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const file = formData.get("file") as File;
    const documentName = formData.get("documentName") as string;
    const documentType = formData.get("documentType") as string;

    if (!file || !documentName || !documentType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: targetId,
        documentName,
        documentType,
        documentUrl: dataUrl,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Documents POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
