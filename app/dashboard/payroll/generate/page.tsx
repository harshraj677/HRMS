"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Banknote, CalendarDays, Loader2,
  CheckCircle2, AlertTriangle, Users, RefreshCcw,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGeneratePayroll } from "@/hooks/usePayroll";
import { useEmployees } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";
import { MONTH_NAMES, fmtINR, countWorkingDays } from "@/lib/payrollCalculator";

const YEARS  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const MONTHS = MONTH_NAMES.map((m, i) => ({ label: m, value: i + 1 }));

type ResultItem = { employeeId: string; fullName: string; status: string; netSalary?: number };

export default function GeneratePayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [results, setResults] = useState<ResultItem[] | null>(null);

  const generate = useGeneratePayroll();
  const { data: employees } = useEmployees();

  const workingDays = countWorkingDays(year, month);
  const employeeCount = (employees ?? []).filter((e) => e.role !== "admin").length;

  async function handleGenerate() {
    const res = await generate.mutateAsync({ month, year });
    setResults(res.results);
  }

  const generated = results?.filter((r) => r.status === "generated") ?? [];
  const skipped   = results?.filter((r) => r.status === "skipped") ?? [];
  const noStruct  = results?.filter((r) => r.status === "no_structure") ?? [];
  const totalNet  = generated.reduce((s, r) => s + (r.netSalary ?? 0), 0);

  return (
    <RoleGuard allow={["admin"]}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <Link href="/dashboard/payroll"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </Link>

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">Generate Payroll</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Calculate and create payroll records for all active employees.
          </p>
        </div>

        {/* Config card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-800">Payroll Period</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Month</label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Year</label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: CalendarDays, label: "Working Days", value: workingDays },
              { icon: Users,        label: "Employees",    value: employeeCount },
              { icon: Banknote,     label: "Period",       value: `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                <Icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">{value}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Employees already processed for this period will be skipped. Only unpaid leave reduces salary.
              Each employee must have a salary structure configured first.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="w-full h-12 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/25"
          >
            {generate.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating payroll…</>
            ) : (
              <><Banknote className="w-4 h-4" /> Generate {MONTH_NAMES[month - 1]} {year} Payroll</>
            )}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Generation Complete</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {generated.length} generated · {skipped.length} skipped · {noStruct.length} no structure
                    </p>
                  </div>
                  {generated.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total Net Payout</p>
                      <p className="text-lg font-bold text-emerald-700">{fmtINR(totalNet)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {results.map((r) => (
                  <div key={r.employeeId} className="flex items-center gap-3 px-5 py-3">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      r.status === "generated"    ? "bg-emerald-100" :
                      r.status === "skipped"      ? "bg-slate-100" : "bg-amber-100"
                    )}>
                      {r.status === "generated"   ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                       r.status === "skipped"     ? <RefreshCcw   className="w-4 h-4 text-slate-400" /> :
                                                    <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{r.fullName}</p>
                      <p className="text-xs text-slate-400">
                        {r.status === "generated"    ? "Payroll generated"  :
                         r.status === "skipped"      ? "Already processed"  :
                                                       "No salary structure"}
                      </p>
                    </div>
                    {r.netSalary !== undefined && (
                      <span className="text-sm font-bold text-emerald-700 shrink-0">{fmtINR(r.netSalary)}</span>
                    )}
                  </div>
                ))}
              </div>

              {generated.length > 0 && (
                <div className="p-4 bg-slate-50/60 border-t border-slate-100">
                  <Link href="/dashboard/payroll"
                    className="w-full h-10 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <Banknote className="w-4 h-4" /> View Payroll Dashboard
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RoleGuard>
  );
}
