"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote, CheckCircle2, Clock, ChevronRight,
  Printer, ArrowLeft, TrendingUp, CalendarDays,
  DollarSign,
} from "lucide-react";
import { useMyPayrolls, type PayrollRecord } from "@/hooks/usePayroll";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate } from "@/lib/utils";
import { fmtINR, MONTH_NAMES, monthLabel } from "@/lib/payrollCalculator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";

// ─── Payslip component (also used for print) ─────────────────────────────────

function Payslip({ p, onClose }: { p: PayrollRecord; onClose: () => void }) {
  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print-only global style injected once via a <style> tag */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #payslip-print { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; }
        }
        #payslip-print { display: none; }
      `}</style>

      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
            <button type="button" onClick={onClose}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Close
            </button>
            <button type="button" onClick={handlePrint}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>

          {/* Payslip body */}
          <div className="flex-1 overflow-y-auto">
            <PayslipBody p={p} />
          </div>
        </motion.div>
      </div>

      {/* Hidden print version */}
      <div id="payslip-print">
        <PayslipBody p={p} />
      </div>
    </>
  );
}

function PayslipBody({ p }: { p: PayrollRecord }) {
  return (
    <div className="p-8 space-y-6 font-sans text-slate-800" style={{ minWidth: 560 }}>
      {/* Company header */}
      <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-indigo-700 tracking-tight">Anvesana</h1>
          <p className="text-xs text-slate-500 mt-0.5">Innovation & Entrepreneurship Forum</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Payslip</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{monthLabel(p.month, p.year)}</p>
          {p.paymentStatus === "paid" && p.paidAt && (
            <p className="text-xs text-emerald-600 mt-0.5">Paid: {formatDate(p.paidAt)}</p>
          )}
        </div>
      </div>

      {/* Employee info */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
        {[
          ["Employee Name",  p.fullName],
          ["Email",          p.email],
          ["Department",     p.department ?? "—"],
          ["Designation",    p.position   ?? "—"],
          ["Working Days",   p.workingDays],
          ["Present Days",   p.presentDays],
          ["Leave Days",     p.leaveDays],
          ["Overtime Hrs",   p.overtimeHours],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-medium text-slate-700 mt-0.5">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Earnings + Deductions */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest border-b border-indigo-100 pb-1.5 mb-3">Earnings</p>
          <div className="space-y-2">
            {[
              ["Basic Salary",      p.basicSalary],
              ["HRA",               p.hra],
              ["Special Allowance", p.specialAllowance],
              ["Bonus",             p.bonus],
              ["Overtime Pay",      p.overtimePay],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium">{fmtINR(Number(value))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 text-indigo-700">
              <span>Gross Salary</span>
              <span>{fmtINR(p.grossSalary)}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest border-b border-red-100 pb-1.5 mb-3">Deductions</p>
          <div className="space-y-2">
            {[
              ["Provident Fund",  p.pfDeduction],
              ["Tax (TDS)",       p.taxDeduction],
              ["Leave Deduction", p.leaveDeduction],
              ["Other",           p.otherDeductions],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium text-red-600">{fmtINR(Number(value))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 text-red-600">
              <span>Total Deductions</span>
              <span>−{fmtINR(p.totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net salary highlight */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 flex items-center justify-between text-white">
        <div>
          <p className="text-sm font-medium text-indigo-200">Net Salary Payable</p>
          <p className="text-3xl font-extrabold mt-0.5 tracking-tight">{fmtINR(p.netSalary)}</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold",
          p.paymentStatus === "paid" ? "bg-emerald-500/30 text-emerald-100" : "bg-amber-500/30 text-amber-100"
        )}>
          {p.paymentStatus === "paid" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {p.paymentStatus === "paid" ? "Paid" : "Pending"}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
        This is a computer-generated payslip and does not require a signature. · Anvesana HRMS
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyPayrollPage() {
  const { data: user } = useAuth();
  const { data: payrolls, isLoading } = useMyPayrolls();
  const [selected, setSelected] = useState<PayrollRecord | null>(null);

  const totalPaid = (payrolls ?? []).reduce((s, p) => s + (p.paymentStatus === "paid" ? p.netSalary : 0), 0);
  const latest    = payrolls?.[0];

  // Chart: last 6 months net salary
  const chartData = [...(payrolls ?? [])]
    .slice(0, 6)
    .reverse()
    .map((p) => ({ label: `${MONTH_NAMES[p.month - 1].slice(0, 3)} ${p.year}`, value: p.netSalary }));

  const firstName = user?.fullName?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Payroll</h2>
        <p className="text-sm text-slate-500 mt-0.5">View your payslips and salary history</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: Banknote,     label: "Latest Net",     value: latest ? fmtINR(latest.netSalary) : "—",            color: "indigo" },
              { icon: DollarSign,   label: "YTD Total",      value: fmtINR(totalPaid),                                  color: "violet" },
              { icon: CalendarDays, label: "Payslips",       value: String(payrolls?.length ?? 0),                      color: "emerald" },
            ].map(({ icon: Icon, label, value, color }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={cn("rounded-2xl border p-4 sm:p-5",
                  color === "indigo"  && "bg-indigo-50  border-indigo-100",
                  color === "violet"  && "bg-violet-50  border-violet-100",
                  color === "emerald" && "bg-emerald-50 border-emerald-100",
                )}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3",
                  color === "indigo"  && "bg-indigo-100  text-indigo-600",
                  color === "violet"  && "bg-violet-100  text-violet-600",
                  color === "emerald" && "bg-emerald-100 text-emerald-600",
                )}><Icon className="w-4 h-4" /></div>
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-1",
                  color === "indigo" && "text-indigo-500", color === "violet" && "text-violet-500", color === "emerald" && "text-emerald-500"
                )}>{label}</p>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-800">Salary Trend</h3>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <RTooltip formatter={(v: number) => fmtINR(v)} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#netGrad)" dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Payroll list */}
          {payrolls?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                <Banknote className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No payslips yet</p>
              <p className="text-xs text-slate-400 mt-1">Your payslips will appear here once payroll is generated</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-50">
                {payrolls?.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(p)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      p.paymentStatus === "paid" ? "bg-emerald-100" : "bg-amber-50"
                    )}>
                      {p.paymentStatus === "paid"
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        : <Clock        className="w-5 h-5 text-amber-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {MONTH_NAMES[p.month - 1]} {p.year}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {p.presentDays}/{p.workingDays} days · {p.paymentStatus === "paid" && p.paidAt ? `Paid ${formatDate(p.paidAt)}` : "Pending payment"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-700">{fmtINR(p.netSalary)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Net</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Payslip modal */}
      <AnimatePresence>
        {selected && <Payslip p={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
