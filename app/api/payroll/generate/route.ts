import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { calculatePayroll, countWorkingDays } from "@/lib/payrollCalculator";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.month || !body?.year) {
    return NextResponse.json({ error: "month and year are required." }, { status: 400 });
  }

  const month = Number(body.month);
  const year  = Number(body.year);

  if (month < 1 || month > 12 || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Invalid month or year." }, { status: 400 });
  }

  // All active non-admin employees
  const employees = await prisma.employee.findMany({
    where: {
      role: { not: "admin" },
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    },
    select: { id: true, fullName: true, department: true },
  });

  // Working days for this month
  const workingDays = countWorkingDays(year, month);

  // Date range for the payroll month
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate   = new Date(Date.UTC(year, month, 1));

  const results: { employeeId: string; fullName: string; status: string; netSalary?: number }[] = [];

  for (const emp of employees) {
    // Skip if payroll already generated for this month
    const existing = await prisma.payroll.findUnique({
      where: { employeeId_month_year: { employeeId: emp.id, month, year } },
    });
    if (existing) {
      results.push({ employeeId: emp.id, fullName: emp.fullName, status: "skipped" });
      continue;
    }

    // Get salary structure
    const structure = await prisma.salaryStructure.findUnique({ where: { employeeId: emp.id } });
    if (!structure) {
      results.push({ employeeId: emp.id, fullName: emp.fullName, status: "no_structure" });
      continue;
    }

    // Count attendance for the month
    const attendanceRecords = await prisma.attendance.findMany({
      where: { employeeId: emp.id, date: { gte: startDate, lt: endDate } },
      select: { status: true, checkIn: true, checkOut: true, hours: true },
    });

    const presentDays = attendanceRecords.filter((a) =>
      a.checkIn !== null && ["present","late"].includes(a.status)
    ).length;

    const overtimeHours = attendanceRecords.reduce((sum, a) => {
      if (a.hours && a.hours > 9) return sum + (a.hours - 9);
      return sum;
    }, 0);

    // Get leave requests for the month
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: emp.id,
        status: "approved",
        startDate: { lt: endDate },
        endDate: { gte: startDate },
      },
      select: { days: true, category: true },
    });

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    for (const lr of leaveRequests) {
      if (lr.category === "unpaid") unpaidLeaveDays += lr.days;
      else paidLeaveDays += lr.days;
    }

    const leaveDays = paidLeaveDays + unpaidLeaveDays;
    const absentDays = Math.max(0, workingDays - presentDays - leaveDays);

    // Calculate payroll
    const calc = calculatePayroll(
      {
        basicSalary:      structure.basicSalary,
        hra:              structure.hra,
        specialAllowance: structure.specialAllowance,
        bonus:            structure.bonus,
        pfDeduction:      structure.pfDeduction,
        taxDeduction:     structure.taxDeduction,
        otherDeductions:  structure.otherDeductions,
      },
      { workingDays, presentDays, unpaidLeaveDays, overtimeHours },
    );

    const payroll = await prisma.payroll.create({
      data: {
        employeeId:      emp.id,
        month,
        year,
        workingDays,
        presentDays,
        leaveDays,
        absentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        overtimeHours:   Math.round(overtimeHours * 100) / 100,
        basicSalary:     structure.basicSalary,
        hra:             structure.hra,
        specialAllowance: structure.specialAllowance,
        bonus:           structure.bonus,
        overtimePay:     calc.overtimePay,
        pfDeduction:     structure.pfDeduction,
        taxDeduction:    structure.taxDeduction,
        leaveDeduction:  calc.leaveDeduction,
        otherDeductions: structure.otherDeductions,
        grossSalary:     calc.grossSalary,
        totalDeductions: calc.totalDeductions,
        netSalary:       calc.netSalary,
        paymentStatus:   "pending",
      },
    });

    // Notify employee
    await prisma.notification.create({
      data: {
        recipientId: emp.id,
        title: "Payslip Available",
        message: `Your payslip for ${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year} is now ready.`,
        type: "info",
        link: "/dashboard/my-payroll",
      },
    });

    results.push({ employeeId: emp.id, fullName: emp.fullName, status: "generated", netSalary: payroll.netSalary });
  }

  const generated = results.filter((r) => r.status === "generated").length;
  return NextResponse.json({ message: `Payroll generated for ${generated} employees.`, results });
}
