"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Users, CalendarCheck, Banknote, Briefcase, Loader2, ShieldCheck } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { cn } from "@/lib/utils";
import { downloadCSV, fmtCSVDate } from "@/lib/exportUtils";
import { toast } from "sonner";

interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  color: string;
  fetch: () => Promise<Record<string, unknown>[]>;
  filename: string;
}

// Server-side exports (stream from /api/attendance/export)
function downloadServerExport(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  window.open(`/api/attendance/export?${search.toString()}`, "_blank");
}

const reports: ReportDef[] = [
  {
    id: "employees",
    title: "Employee Directory",
    description: "All active employees with department, role and contact info",
    icon: Users,
    color: "bg-indigo-100 text-indigo-600",
    filename: "employees",
    fetch: async () => {
      const res = await fetch("/api/employees");
      const json = await res.json();
      return (json.employees ?? []).map((e: any) => ({
        Name:        e.fullName,
        Email:       e.email,
        Phone:       e.phone ?? "",
        Department:  e.department ?? "",
        Position:    e.position ?? "",
        Role:        e.role,
        "Leave Balance": e.leaveBalance,
        "Joined":    fmtCSVDate(e.createdAt),
      }));
    },
  },
  {
    id: "payroll",
    title: "Payroll Summary",
    description: "Monthly payroll records with gross, deductions and net salary",
    icon: Banknote,
    color: "bg-emerald-100 text-emerald-600",
    filename: "payroll_summary",
    fetch: async () => {
      const now = new Date();
      const res = await fetch(`/api/payroll?year=${now.getFullYear()}`);
      const json = await res.json();
      return (json.payrolls ?? []).map((p: any) => ({
        Employee:    p.fullName,
        Department:  p.department ?? "",
        Month:       p.month,
        Year:        p.year,
        "Working Days": p.workingDays,
        "Present Days": p.presentDays,
        "Gross (₹)": p.grossSalary,
        "Deductions (₹)": p.totalDeductions,
        "Net (₹)":   p.netSalary,
        Status:      p.paymentStatus,
        "Paid On":   fmtCSVDate(p.paidAt),
      }));
    },
  },
  {
    id: "attendance",
    title: "Attendance Report",
    description: "Attendance records for all employees (last 60 days)",
    icon: CalendarCheck,
    color: "bg-violet-100 text-violet-600",
    filename: "attendance_report",
    fetch: async () => {
      const res = await fetch("/api/attendance");
      const json = await res.json();
      return (json.attendance ?? []).map((a: any) => ({
        Employee:   a.fullName,
        Date:       fmtCSVDate(a.date),
        "Check In": a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : "",
        "Check Out": a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : "",
        Hours:      a.hours ?? "",
        Status:     a.status,
      }));
    },
  },
  {
    id: "leaves",
    title: "Leave Requests",
    description: "All leave requests with status and reason",
    icon: FileText,
    color: "bg-amber-100 text-amber-600",
    filename: "leave_requests",
    fetch: async () => {
      const res = await fetch("/api/leave");
      const json = await res.json();
      return (json.leaves ?? []).map((l: any) => ({
        Employee:    l.fullName,
        Department:  l.department ?? "",
        "Start Date": fmtCSVDate(l.startDate),
        "End Date":  fmtCSVDate(l.endDate),
        Days:        l.days,
        Category:    l.category,
        Reason:      l.reason,
        Status:      l.status,
        "Applied On": fmtCSVDate(l.createdAt),
      }));
    },
  },
  {
    id: "attendance_evidence",
    title: "Attendance Evidence Report",
    description: "All records with face score, liveness score, policy result and review status (last 30 days)",
    icon: ShieldCheck,
    color: "bg-emerald-100 text-emerald-600",
    filename: "attendance_evidence",
    fetch: async () => {
      const dateTo = new Date().toISOString().slice(0, 10);
      const dateFrom = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      const res = await fetch(`/api/attendance/export?includeEvidence=true&dateFrom=${dateFrom}&dateTo=${dateTo}`);
      if (!res.ok) throw new Error("Export failed");
      const text = await res.text();
      const lines = text.split("\r\n").filter(Boolean);
      if (lines.length < 2) return [];
      const headers = lines[0].replace(/^﻿/, "").split(",");
      return lines.slice(1).map((line) => {
        const vals = line.split(",");
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
      });
    },
  },
  {
    id: "candidates",
    title: "Recruitment Pipeline",
    description: "All job candidates with current stage and job applied for",
    icon: Briefcase,
    color: "bg-sky-100 text-sky-600",
    filename: "recruitment_pipeline",
    fetch: async () => {
      const res = await fetch("/api/recruitment/candidates");
      const json = await res.json();
      return (json.candidates ?? []).map((c: any) => ({
        Name:        c.fullName,
        Email:       c.email,
        Phone:       c.phone ?? "",
        "Job Title": c.jobTitle ?? "",
        Stage:       c.stage,
        "Referred":  c.referredById ? "Yes" : "No",
        "Applied On": fmtCSVDate(c.createdAt),
      }));
    },
  },
];

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleDownload(report: ReportDef) {
    setLoading(report.id);
    try {
      const data = await report.fetch();
      if (!data.length) {
        toast.info("No data available for this report.");
        return;
      }
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      downloadCSV(data, `${report.filename}_${dateStr}`);
      toast.success(`${report.title} exported.`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">Export data as CSV for analysis in Excel or Google Sheets</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report, i) => {
            const Icon = report.icon;
            const isLoading = loading === report.id;
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-slate-200 transition-all"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", report.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{report.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{report.description}</p>
                  </div>
                </div>

                {report.id === "attendance_evidence" ? (
                  <div className="flex gap-2">
                    <button type="button" disabled={!!loading}
                      onClick={() => { const d = new Date(); downloadServerExport({ format: "csv", includeEvidence: "true", dateFrom: new Date(d.getTime()-30*86400_000).toISOString().slice(0,10), dateTo: d.toISOString().slice(0,10) }); }}
                      className="flex-1 h-9 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button type="button" disabled={!!loading}
                      onClick={() => { const d = new Date(); downloadServerExport({ format: "xlsx", includeEvidence: "true", dateFrom: new Date(d.getTime()-30*86400_000).toISOString().slice(0,10), dateTo: d.toISOString().slice(0,10) }); }}
                      className="flex-1 h-9 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50">
                      <Download className="w-4 h-4" /> XLSX
                    </button>
                  </div>
                ) : (
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => handleDownload(report)}
                  className={cn(
                    "w-full h-9 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                    "border border-slate-200 text-slate-700 hover:bg-slate-50",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
                  ) : (
                    <><Download className="w-4 h-4" /> Export CSV</>
                  )}
                </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Info note */}
        <div className="bg-sky-50 border border-sky-100 rounded-2xl px-5 py-4 text-sm text-sky-700">
          <strong>Note:</strong> All exported files include a UTF-8 BOM for correct display in Excel. Open with
          &quot;Data → From Text/CSV&quot; in Excel, or just double-click the file on most systems.
        </div>
      </div>
    </RoleGuard>
  );
}
