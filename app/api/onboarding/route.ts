import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const notDeleted = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };

  const employees = await prisma.employee.findMany({
    where: { approvalStatus: { isSet: true }, ...notDeleted },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      department: true,
      approvalStatus: true,
      approvalDate: true,
      approvedBy: true,
      rejectionReason: true,
      createdAt: true,
      profile: true,
      documents: { where: notDeleted },
    },
    orderBy: { createdAt: "desc" },
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [pendingInvitations, pendingReviews, approved, rejected, recentlyJoined] = await Promise.all([
    prisma.employee.count({ where: { approvalStatus: { in: ["PENDING_INVITATION", "INVITED"] } } }),
    prisma.employee.count({ where: { approvalStatus: "PROFILE_SUBMITTED" } }),
    prisma.employee.count({ where: { approvalStatus: "ACTIVE", approvedBy: { isSet: true } } }),
    prisma.employee.count({ where: { approvalStatus: "REJECTED" } }),
    prisma.employee.count({ where: { createdAt: { gte: sevenDaysAgo }, ...notDeleted } }),
  ]);

  return NextResponse.json({
    employees,
    stats: { pendingInvitations, pendingReviews, approved, rejected, recentlyJoined },
  });
}
