import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// POST /api/profile/[id]/avatar
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const user = await verifyToken(token || "");
    const formData = await request.formData();
    const file = formData.get("file") as File;

    const targetId = params.id;

    // Permission check
    if (user.id !== targetId && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update or create profile with avatar
    const profile = await prisma.employeeProfile.upsert({
      where: { employeeId: targetId },
      create: {
        employeeId: targetId,
        avatar: dataUrl,
      },
      update: {
        avatar: dataUrl,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Avatar POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/[id]/avatar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const user = await verifyToken(token || "");

    const targetId = params.id;

    // Permission check
    if (user.id !== targetId && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profile = await prisma.employeeProfile.update({
      where: { employeeId: targetId },
      data: { avatar: null },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Avatar DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
