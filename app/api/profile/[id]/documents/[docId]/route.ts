import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// DELETE /api/profile/[id]/documents/[docId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const user = await verifyToken(token || "");

    const { id: targetId, docId } = params;

    // Permission check
    if (user.id !== targetId && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Soft delete
    const document = await prisma.employeeDocument.update({
      where: { id: docId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Document DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/profile/[id]/documents/[docId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const user = await verifyToken(token || "");
    const body = await request.json();

    const { id: targetId, docId } = params;

    // Only admin can verify
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const document = await prisma.employeeDocument.update({
      where: { id: docId },
      data: {
        verificationStatus: body.verificationStatus,
        verifiedAt: new Date(),
        verifiedBy: user.id,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Document PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
