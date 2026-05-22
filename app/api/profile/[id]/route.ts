import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const emp = await prisma.employee.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true },
  });
  if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  let profile = await prisma.employeeProfile.findUnique({ where: { employeeId: id } });
  if (!profile) {
    profile = await prisma.employeeProfile.create({ data: { employeeId: id } });
  }

  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body required." }, { status: 400 });

  // Fields employees can edit on their own profile
  const personalFields = [
    "dateOfBirth", "gender", "nationality", "maritalStatus",
    "addressLine1", "addressLine2", "city", "state", "postalCode", "country",
    "emergencyName", "emergencyRelation", "emergencyPhone", "emergencyEmail",
    "highestEducation", "institution", "fieldOfStudy", "graduationYear",
    "skills", "certifications", "experience", "bio", "avatar",
  ];
  // Fields only admins can touch
  const adminFields = ["employeeType", "joiningDate", "reportingManager", "workLocation", "shiftTiming", "employmentStatus", "onboardingCompleted"];

  const allowedFields = payload.role === "admin" ? [...personalFields, ...adminFields] : personalFields;
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      if (key === "dateOfBirth" || key === "joiningDate") {
        data[key] = body[key] ? new Date(body[key]) : null;
      } else if (key === "graduationYear") {
        data[key] = body[key] !== null && body[key] !== "" ? Number(body[key]) : null;
      } else {
        data[key] = body[key];
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields." }, { status: 400 });
  }

  const profile = await prisma.employeeProfile.upsert({
    where: { employeeId: id },
    update: data,
    create: { employeeId: id, ...data },
  });

  return NextResponse.json({ profile });
}
