"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign, Users, CheckCircle2, Clock, Download,
  Search, Filter, Trash2, ChevronDown, Loader2,
  TrendingUp, Banknote, BadgeCheck, XCircle,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { usePayrolls, useUpdatePayroll, useDeletePayroll, type PayrollRecord } from "@/hooks/usePayroll";
import { cn, formatDate } from "@/lib/utils";
import { fmtINR, MONTH_NAMES } from "@/lib/payrollCalculator";

const YEARS  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = MONTH_NAMES.map((m, i) => ({ label: m, value: i + 1 }));

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full",
      status === "paid"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-amber-50 text-amber-700"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "paid" ? "bg-emerald-500" : "bg-amber-500")} />
      {status === "paid" ? "Paid" : "Pending"}
    </span>
  );
}

export default function PayrollPage() {
  const now = new Date();
  const [month,  setMonth]  = useState(now.getMonth() + 1);
  const [year,   setYear]   = useState(now.getFullYear());
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: payrolls, isLoading } = usePayrolls({
    month,
    year,
    status: status !== "all" ? status : undefined,
  });

  const updatePayroll = useUpdatePayroll();
  const deletePayroll = useDeletePayroll();

  const filtered = (payrolls ?? []).filter((p) =>
    !search ||
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.department?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalGross   = filtered.reduce((s, p) => s + p.grossSalary, 0);
  const totalNet     = filtered.reduce((s, p) => s + p.netSalary, 0);
  const totalDeduc   = filtered.reduce((s, p) => s + p.totalDeductions, 0);
  const paidCount    = filtered.filter((p) => p.paymentStatus === "paid").length;
  const pendingCount = filtered.filter((p) => p.paymentStatus === "pending").length;

  // Analytics: net salary by department
  const byDept: Record<string, number> = {};
  filtered.forEach((p) => {
    const d = p.department ?? "Other";
    byDept[d] = (byDept[d] ?? 0) + p.netSalary;
  });
  const deptChartData = Object.entries(byDept)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#f43f5e","#64748b"];

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Payroll Management</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {MONTH_NAMES[month - 1]} {year} · {filtered.length} records
            </p>
          </div>
          <Link
            href="/dashboard/payroll/generate"
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-sm shadow-indigo-500/25 shrink-0"
          >
            <Banknote className="w-4 h-4" />
            Generate Payroll
          </Link>
        </div>

        {/* ── Summary cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: DollarSign, label: "Total Gross",     value: fmtINR(totalGross),   color: "indigo", sub: `${filtered.length} employees` },
            { icon: Banknote,   label: "Total Net Payout",value: fmtINR(totalNet),      color: "violet", sub: `After deductions` },
            { icon: TrendingUp, label: "Total Deductions",value: fmtINR(totalDeduc),    color: "amber",  sub: "PF + Tax + Other" },
            { icon: CheckCircle2,label:"Paid",            value: paidCount,             color: "emerald",sub: `${pendingCount} pending` },
          ].map(({ icon: Icon, label, value, color, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-2xl border p-4 sm:p-5",
                color === "indigo"  && "bg-indigo-50  border-indigo-100",
                color === "violet"  && "bg-violet-50  border-violet-100",
                color === "amber"   && "bg-amber-50   border-amber-100",
                color === "emerald" && "bg-emerald-50 border-emerald-100",
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                color === "indigo"  && "bg-indigo-100  text-indigo-600",
                color === "violet"  && "bg-violet-100  text-violet-600",
                color === "amber"   && "bg-amber-100   text-amber-600",
                color === "emerald" && "bg-emerald-100 text-emerald-600",
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{sub}</p>
              <p className={cn(
                "text-[10px] font-semibold uppercase tracking-widest mt-1.5",
                color === "indigo"  && "text-indigo-500",
                color === "violet"  && "text-violet-500",
                color === "amber"   && "text-amber-500",
                color === "emerald" && "text-emerald-500",
              )}>{label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Department chart ───────────────────────────────────── */}
        {deptChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
          >
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Net Payout by Department</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RTooltip formatter={(v: number) => fmtINR(v)} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {deptChartData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-9 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search employee or department…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-full sm:w-40 h-10 bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-full sm:w-28 h-10 bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-36 h-10 bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Payroll table ──────────────────────────────────────── */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
              <Banknote className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No payroll records</p>
            <p className="text-xs text-slate-400 mt-1">Generate payroll for {MONTH_NAMES[month - 1]} {year}</p>
            <Link href="/dashboard/payroll/generate"
              className="mt-4 h-9 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors inline-flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Generate Now
            </Link>
          </div>
        ) : (
          <>
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  {["Employee","Department","Gross","Deductions","Net","Attendance","Status","Actions"].map((h) => (
                    <TableHead key={h} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, i) => (
                  <>
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {p.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{p.fullName}</p>
                            <p className="text-xs text-slate-400">{p.position ?? "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-slate-600">{p.department ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-slate-800">{fmtINR(p.grossSalary)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-red-600 font-medium">−{fmtINR(p.totalDeductions)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-bold text-emerald-700">{fmtINR(p.netSalary)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">{p.presentDays}/{p.workingDays}d</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {p.paymentStatus === "pending" ? (
                            <button
                              type="button"
                              title="Mark as paid"
                              onClick={() => updatePayroll.mutate({ id: p.id, action: "mark_paid" })}
                              disabled={updatePayroll.isPending}
                              className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
                            >
                              {updatePayroll.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />}
                              Pay
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Revert to pending"
                              onClick={() => updatePayroll.mutate({ id: p.id, action: "mark_pending" })}
                              disabled={updatePayroll.isPending}
                              className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold border border-amber-200 text-amber-700 bg-white hover:bg-amber-50 disabled:opacity-50 transition-all"
                            >
                              <XCircle className="w-3 h-3" /> Revert
                            </button>
                          )}
                          <button
                            type="button"
                            title="Delete payroll"
                            onClick={() => deletePayroll.mutate(p.id)}
                            disabled={deletePayroll.isPending}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Expand details"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          >
                            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expandedId === p.id && "rotate-180")} />
                          </button>
                        </div>
                      </TableCell>
                    </motion.tr>

                    {/* Expanded breakdown row */}
                    {expandedId === p.id && (
                      <TableRow key={`${p.id}-exp`} className="bg-slate-50/40 border-slate-100">
                        <TableCell colSpan={8} className="py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-2">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Earnings</p>
                              <div className="space-y-1 text-xs">
                                {[
                                  ["Basic Salary", p.basicSalary],
                                  ["HRA", p.hra],
                                  ["Special Allowance", p.specialAllowance],
                                  ["Bonus", p.bonus],
                                  ["Overtime Pay", p.overtimePay],
                                ].map(([label, val]) => (
                                  <div key={String(label)} className="flex justify-between">
                                    <span className="text-slate-500">{label}</span>
                                    <span className="font-medium text-slate-700">{fmtINR(Number(val))}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Deductions</p>
                              <div className="space-y-1 text-xs">
                                {[
                                  ["PF", p.pfDeduction],
                                  ["Tax", p.taxDeduction],
                                  ["Leave Deduction", p.leaveDeduction],
                                  ["Other", p.otherDeductions],
                                ].map(([label, val]) => (
                                  <div key={String(label)} className="flex justify-between">
                                    <span className="text-slate-500">{label}</span>
                                    <span className="font-medium text-red-600">−{fmtINR(Number(val))}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Attendance</p>
                              <div className="space-y-1 text-xs">
                                {[
                                  ["Working Days", p.workingDays],
                                  ["Present", p.presentDays],
                                  ["Paid Leave", p.paidLeaveDays],
                                  ["Unpaid Leave", p.unpaidLeaveDays],
                                  ["Absent", p.absentDays],
                                  ["Overtime hrs", p.overtimeHours],
                                ].map(([label, val]) => (
                                  <div key={String(label)} className="flex justify-between">
                                    <span className="text-slate-500">{label}</span>
                                    <span className="font-medium text-slate-700">{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Summary</p>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">Gross Salary</span>
                                  <span className="font-semibold text-slate-800">{fmtINR(p.grossSalary)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-500">Total Deductions</span>
                                  <span className="font-semibold text-red-600">−{fmtINR(p.totalDeductions)}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2">
                                  <span className="text-xs font-bold text-slate-700">Net Salary</span>
                                  <span className="text-sm font-bold text-emerald-700">{fmtINR(p.netSalary)}</span>
                                </div>
                                {p.paidAt && (
                                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Paid on {formatDate(p.paidAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p, i) => {
              const expanded = expandedId === p.id;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
                >
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : p.id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {p.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.fullName}</p>
                        <StatusBadge status={p.paymentStatus} />
                      </div>
                      <p className="text-xs text-slate-400 truncate">{p.position ?? "—"} · {p.department ?? "—"}</p>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform", expanded && "rotate-180")} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-slate-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Gross</p>
                      <p className="text-xs font-semibold text-slate-800">{fmtINR(p.grossSalary)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Deductions</p>
                      <p className="text-xs font-semibold text-red-600">−{fmtINR(p.totalDeductions)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Net</p>
                      <p className="text-xs font-bold text-emerald-700">{fmtINR(p.netSalary)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2">Attendance: {p.presentDays}/{p.workingDays}d</p>

                  {expanded && (
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Earnings</p>
                        <div className="space-y-1 text-xs">
                          {[
                            ["Basic Salary", p.basicSalary],
                            ["HRA", p.hra],
                            ["Special Allowance", p.specialAllowance],
                            ["Bonus", p.bonus],
                            ["Overtime Pay", p.overtimePay],
                          ].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between">
                              <span className="text-slate-500">{label}</span>
                              <span className="font-medium text-slate-700">{fmtINR(Number(val))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Deductions</p>
                        <div className="space-y-1 text-xs">
                          {[
                            ["PF", p.pfDeduction],
                            ["Tax", p.taxDeduction],
                            ["Leave Deduction", p.leaveDeduction],
                            ["Other", p.otherDeductions],
                          ].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between">
                              <span className="text-slate-500">{label}</span>
                              <span className="font-medium text-red-600">−{fmtINR(Number(val))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Attendance</p>
                        <div className="space-y-1 text-xs">
                          {[
                            ["Working Days", p.workingDays],
                            ["Present", p.presentDays],
                            ["Paid Leave", p.paidLeaveDays],
                            ["Unpaid Leave", p.unpaidLeaveDays],
                            ["Absent", p.absentDays],
                            ["Overtime hrs", p.overtimeHours],
                          ].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between">
                              <span className="text-slate-500">{label}</span>
                              <span className="font-medium text-slate-700">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Summary</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Gross Salary</span>
                            <span className="font-semibold text-slate-800">{fmtINR(p.grossSalary)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Total Deductions</span>
                            <span className="font-semibold text-red-600">−{fmtINR(p.totalDeductions)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-2">
                            <span className="text-xs font-bold text-slate-700">Net Salary</span>
                            <span className="text-sm font-bold text-emerald-700">{fmtINR(p.netSalary)}</span>
                          </div>
                          {p.paidAt && (
                            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Paid on {formatDate(p.paidAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    {p.paymentStatus === "pending" ? (
                      <button
                        type="button"
                        onClick={() => updatePayroll.mutate({ id: p.id, action: "mark_paid" })}
                        disabled={updatePayroll.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
                      >
                        {updatePayroll.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                        Mark as Paid
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updatePayroll.mutate({ id: p.id, action: "mark_pending" })}
                        disabled={updatePayroll.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold border border-amber-200 text-amber-700 bg-white hover:bg-amber-50 disabled:opacity-50 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Revert to Pending
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete payroll"
                      onClick={() => deletePayroll.mutate(p.id)}
                      disabled={deletePayroll.isPending}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
