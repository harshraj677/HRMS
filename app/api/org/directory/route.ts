import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? "";
  const dept   = url.searchParams.get("department") ?? "";

  const where: Record<string, unknown> = {
    OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
  };

  if (dept) where.department = dept;

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true, fullName: true, email: true, phone: true,
      department: true, position: true, role: true, createdAt: true,
      reportingManagerId: true,
      profile: { select: { avatar: true, skills: true, workLocation: true, employmentStatus: true } },
    },
    orderBy: { fullName: "asc" },
  });

  let result = employees;
  if (search) {
    const q = search.toLowerCase();
    result = employees.filter((e) =>
      e.fullName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q) ||
      e.phone?.includes(q) ||
      (e.profile?.skills ?? []).some((s) => s.toLowerCase().includes(q))
    );
  }

  const enriched = await Promise.all(
    result.map(async (e) => {
      let managerName: string | null = null;
      if (e.reportingManagerId) {
        const mgr = await prisma.employee.findUnique({
          where: { id: e.reportingManagerId },
          select: { fullName: true },
        });
        managerName = mgr?.fullName ?? null;
      }
      return { ...e, managerName };
    })
  );

  return NextResponse.json({ employees: enriched });
}
