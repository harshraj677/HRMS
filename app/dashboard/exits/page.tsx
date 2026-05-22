"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { useAllResignations, useUpdateResignation, type ResignationData } from "@/hooks/useResignation";

const STATUSES = ["submitted","manager_review","hr_review","clearance_pending","completed","rejected"];
const STATUS_META: Record<string, string> = {
  submitted:        "bg-amber-50 text-amber-700",
  manager_review:   "bg-sky-50 text-sky-700",
  hr_review:        "bg-violet-50 text-violet-700",
  clearance_pending:"bg-orange-50 text-orange-700",
  completed:        "bg-emerald-50 text-emerald-700",
  rejected:         "bg-red-50 text-red-700",
};

function ExitCard({ r }: { r: ResignationData }) {
  const update = useUpdateResignation();
  const [comment, setComment] = useState(r.hrComment ?? "");
  const [saving,  setSaving]  = useState(false);

  async function handleUpdate(data: Partial<ResignationData>) {
    setSaving(true);
    await update.mutateAsync({ id: r.id, ...data });
    setSaving(false);
  }

  const checklist = [
    { key: "laptopReturned",  label: "Laptop",   done: r.laptopReturned },
    { key: "idCardReturned",  label: "ID Card",  done: r.idCardReturned },
    { key: "payrollCleared",  label: "Payroll",  done: r.payrollCleared },
    { key: "docsHandedOver",  label: "Docs",     done: r.docsHandedOver },
  ] as const;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-slate-900">{r.employeeName ?? "Employee"}</p>
            <p className="text-xs text-slate-400">{r.department ?? ""} {r.position ? `· ${r.position}` : ""}</p>
            <p className="text-xs text-slate-400 mt-0.5">Last Day: <span className="font-semibold text-slate-600">{formatDate(r.lastWorkingDay)}</span></p>
          </div>
          <div className="space-y-1.5">
            <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full block text-center", STATUS_META[r.status] ?? "bg-slate-100 text-slate-600")}>
              {r.status.replace(/_/g, " ")}
            </span>
            <select aria-label="Update exit status"
              className="block w-full text-[10px] border border-slate-200 rounded-lg px-1.5 py-0.5 bg-white focus:outline-none"
              value={r.status}
              onChange={(e) => handleUpdate({ status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mb-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Reason</p>
          <p className="text-sm text-slate-600">{r.reason}</p>
        </div>

        {/* Checklist */}
        <div className="flex flex-wrap gap-2 mb-4">
          {checklist.map(({ key, label, done }) => (
            <button key={key} type="button" onClick={() => handleUpdate({ [key]: !done })}
              className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300")}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
              {label}
            </button>
          ))}
        </div>

        {/* HR Comment */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">HR Comment</p>
          <div className="flex gap-2">
            <input className="flex-1 h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="Add HR comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button type="button" disabled={saving} onClick={() => handleUpdate({ hrComment: comment })}
              className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </button>
          </div>
        </div>

        {r.exitFeedback && (
          <div className="mt-3 bg-indigo-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />Exit Feedback</p>
            <p className="text-xs text-indigo-800">{r.exitFeedback}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExitsPage() {
  const { data: resignations, isLoading } = useAllResignations();

  const active    = (resignations ?? []).filter((r) => !["completed","rejected"].includes(r.status));
  const completed = (resignations ?? []).filter((r) => r.status === "completed");

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Exit Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{active.length} active exit processes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active",    value: active.length,     color: "amber" },
            { label: "Completed", value: completed.length,  color: "emerald" },
            { label: "Total",     value: resignations?.length ?? 0, color: "indigo" },
          ].map(({ label, value, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={cn("rounded-2xl border p-4 text-center",
                color === "amber"   && "bg-amber-50   border-amber-100",
                color === "emerald" && "bg-emerald-50 border-emerald-100",
                color === "indigo"  && "bg-indigo-50  border-indigo-100",
              )}>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-1",
                color === "amber" && "text-amber-500", color === "emerald" && "text-emerald-500", color === "indigo" && "text-indigo-500",
              )}>{label}</p>
            </motion.div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1,2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
        ) : (resignations?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <LogOut className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No resignations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {active.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Active Exit Processes</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {active.map((r) => <ExitCard key={r.id} r={r} />)}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Completed</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {completed.map((r) => <ExitCard key={r.id} r={r} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
