import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/profile/[id]
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

    const employee = await prisma.employee.findUnique({
      where: { id: targetId },
      include: { profile: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...employee,
      profile: employee.profile || {},
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/profile/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const user = await verifyToken(token || "");
    const body = await request.json();

    const targetId = params.id;

    // Permission check
    if (user.id !== targetId && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Employees can only edit their own personal fields
    if (user.role !== "admin" && user.id === targetId) {
      // Filter to personal fields only
      const allowedFields = [
        "dateOfBirth",
        "gender",
        "nationality",
        "maritalStatus",
        "addressLine1",
        "addressLine2",
        "city",
        "state",
        "postalCode",
        "country",
        "emergencyName",
        "emergencyRelation",
        "emergencyPhone",
        "emergencyEmail",
        "highestEducation",
        "institution",
        "fieldOfStudy",
        "graduationYear",
        "skills",
        "certifications",
        "experience",
        "bio",
      ];

      Object.keys(body).forEach((key) => {
        if (!allowedFields.includes(key)) delete body[key];
      });
    }

    // Upsert profile
    const profile = await prisma.employeeProfile.upsert({
      where: { employeeId: targetId },
      create: {
        employeeId: targetId,
        ...body,
      },
      update: body,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
