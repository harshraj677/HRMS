import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/**
 * GET /api/attendance/export
 * Server-side streaming export for attendance records.
 *
 * Query params:
 *   format        "csv" (default) | "xlsx"
 *   dateFrom      ISO date
 *   dateTo        ISO date
 *   employeeId    specific employee
 *   department    filter
 *   reviewStatus  "flagged"|"approved"|"rejected"|"auto"
 *   includeEvidence "true" — include face/liveness/policy columns
 */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const u = new URL(req.url);
  const format = (u.searchParams.get("format") ?? "csv").toLowerCase();
  const dateFrom = u.searchParams.get("dateFrom");
  const dateTo = u.searchParams.get("dateTo");
  const employeeId = u.searchParams.get("employeeId");
  const department = u.searchParams.get("department");
  const reviewStatus = u.searchParams.get("reviewStatus");
  const includeEvidence = u.searchParams.get("includeEvidence") === "true";

  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (reviewStatus) where.reviewStatus = reviewStatus;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  let empFilter: string[] | undefined;
  if (department) {
    const emps = await prisma.employee.findMany({
      where: { department, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      select: { id: true },
    });
    empFilter = emps.map((e) => e.id);
    where.employeeId = { in: empFilter };
  }

  const records = await prisma.attendance.findMany({
    where,
    include: { employee: { select: { fullName: true, department: true, email: true } } },
    orderBy: { date: "desc" },
    take: 5000, // safety cap
  });

  const fmt = (iso: Date | string | null | undefined) =>
    iso ? new Date(iso).toLocaleString("en-IN") : "";

  const rows = records.map((r) => {
    const base: Record<string, unknown> = {
      Employee: r.employee.fullName,
      Department: r.employee.department ?? "",
      Email: r.employee.email,
      Date: new Date(r.date).toLocaleDateString("en-IN"),
      "Check In": fmt(r.checkIn),
      "Check Out": fmt(r.checkOut),
      Hours: r.hours ?? "",
      Status: r.status,
      "Review Status": r.reviewStatus,
      "Review Notes": r.reviewNotes ?? "",
      "Reviewed At": fmt(r.reviewedAt),
      Remote: r.isRemote ? "Yes" : "No",
      "Manual Override": r.manualOverride ? "Yes" : "No",
      "Override Note": r.overrideNote ?? "",
    };
    if (includeEvidence) {
      base["Face Verified"] = r.faceVerified === true ? "Yes" : r.faceVerified === false ? "No" : "";
      base["Face Score"] = r.faceScore ?? "";
      base["Liveness"] = r.livenessResult ?? "";
      base["Liveness Score"] = r.livenessScore ?? "";
      base["Distance (m)"] = r.distanceFromOffice != null ? Math.round(r.distanceFromOffice) : "";
      const policy = r.policyResult as any;
      base["Policy Status"] = policy?.status ?? "";
      base["Device"] = r.device ?? "";
      base["IP"] = r.ipAddress ?? "";
    }
    return base;
  });

  const dateLabel = `${dateFrom ?? "all"}_${dateTo ?? "now"}`.replace(/[T:]/g, "-").slice(0, 30);
  const filename = `attendance_export_${dateLabel}`;

  if (format === "xlsx") {
    // Dynamic import — xlsx is already in dependencies
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  // CSV (default)
  if (!rows.length) {
    return new NextResponse("No data found for the selected filters.", {
      headers: { "Content-Type": "text/plain" },
    });
  }
  const headers = Object.keys(rows[0]);
  const csvRows = rows.map((row) =>
    headers.map((h) => {
      const val = row[h] ?? "";
      const str = String(val);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  const csv = "﻿" + [headers.join(","), ...csvRows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
