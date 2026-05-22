// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalaryComponents {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
}

export interface AttendanceInput {
  workingDays: number;   // weekdays in the month
  presentDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
}

export interface PayrollResult {
  dailyRate: number;
  grossSalary: number;
  overtimePay: number;
  leaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Count weekdays (Mon–Sat, 6-day Indian work-week) in a given month/year */
export function countWorkingDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay(); // 0=Sun
    if (dow !== 0) count++; // all days except Sunday
  }
  return count;
}

/** Months names for display */
export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function monthLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Format currency (INR) */
export function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Round to 2 decimal places */
function r2(n: number) { return Math.round(n * 100) / 100; }

// ─── Core calculator ──────────────────────────────────────────────────────────

export function calculatePayroll(
  salary: SalaryComponents,
  attendance: AttendanceInput,
): PayrollResult {
  const { basicSalary, hra, specialAllowance, bonus, pfDeduction, taxDeduction, otherDeductions } = salary;
  const { workingDays, unpaidLeaveDays, overtimeHours } = attendance;

  const totalBase = basicSalary + hra + specialAllowance + bonus;

  // Per-day rate based on working days in the month
  const dailyRate = workingDays > 0 ? r2(totalBase / workingDays) : 0;

  // Overtime: hourly rate × 1.5 multiplier
  const hourlyRate = r2(dailyRate / 8);
  const overtimePay = r2(overtimeHours * hourlyRate * 1.5);

  // Gross = base + overtime
  const grossSalary = r2(totalBase + overtimePay);

  // Leave deduction: unpaid leave only
  const leaveDeduction = r2(unpaidLeaveDays * dailyRate);

  // Total deductions
  const totalDeductions = r2(pfDeduction + taxDeduction + otherDeductions + leaveDeduction);

  // Net
  const netSalary = r2(Math.max(0, grossSalary - totalDeductions));

  return { dailyRate, grossSalary, overtimePay, leaveDeduction, totalDeductions, netSalary };
}
