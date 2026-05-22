import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const records = await prisma.payroll.findMany({
    where: { employeeId: payload.id },
    include: {
      employee: { select: { fullName: true, email: true, department: true, position: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const payrolls = records.map((r) => ({
    id: r.id,
    employeeId:      r.employeeId,
    fullName:        r.employee.fullName,
    email:           r.employee.email,
    department:      r.employee.department,
    position:        r.employee.position,
    month:           r.month,
    year:            r.year,
    workingDays:     r.workingDays,
    presentDays:     r.presentDays,
    leaveDays:       r.leaveDays,
    absentDays:      r.absentDays,
    paidLeaveDays:   r.paidLeaveDays,
    unpaidLeaveDays: r.unpaidLeaveDays,
    overtimeHours:   r.overtimeHours,
    basicSalary:     r.basicSalary,
    hra:             r.hra,
    specialAllowance: r.specialAllowance,
    bonus:           r.bonus,
    overtimePay:     r.overtimePay,
    pfDeduction:     r.pfDeduction,
    taxDeduction:    r.taxDeduction,
    leaveDeduction:  r.leaveDeduction,
    otherDeductions: r.otherDeductions,
    grossSalary:     r.grossSalary,
    totalDeductions: r.totalDeductions,
    netSalary:       r.netSalary,
    paymentStatus:   r.paymentStatus,
    generatedAt:     r.generatedAt,
    paidAt:          r.paidAt,
  }));

  return NextResponse.json({ payrolls });
}
