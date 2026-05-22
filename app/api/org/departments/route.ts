import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });

  // Enrich with employee count
  const enriched = await Promise.all(
    departments.map(async (d) => {
      const count = await prisma.employee.count({
        where: {
          department: d.name,
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      });
      let managerName: string | null = null;
      if (d.managerId) {
        const mgr = await prisma.employee.findUnique({ where: { id: d.managerId }, select: { fullName: true } });
        managerName = mgr?.fullName ?? null;
      }
      return { ...d, employeeCount: count, managerName };
    })
  );

  return NextResponse.json({ departments: enriched });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const dept = await prisma.department.create({
    data: {
      name: body.name.trim(),
      code: body.code?.trim() || null,
      description: body.description?.trim() || null,
      managerId: body.managerId || null,
      status: "active",
    },
  });

  return NextResponse.json({ department: dept }, { status: 201 });
}
