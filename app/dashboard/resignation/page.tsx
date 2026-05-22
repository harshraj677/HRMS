"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Calendar, Loader2, CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useMyResignation, useSubmitResignation, useUpdateResignation } from "@/hooks/useResignation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const STATUS_STEPS = [
  { key: "submitted",        label: "Submitted",         desc: "Resignation submitted" },
  { key: "manager_review",   label: "Manager Review",    desc: "Manager reviewing" },
  { key: "hr_review",        label: "HR Review",         desc: "HR processing" },
  { key: "clearance_pending",label: "Clearance Pending", desc: "Asset clearance" },
  { key: "completed",        label: "Completed",         desc: "Exit complete" },
];

function ProgressBar({ status }: { status: string }) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  const isRejected = status === "rejected";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const done    = !isRejected && i < idx;
          const current = !isRejected && i === idx;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                done    ? "bg-emerald-500 border-emerald-500 text-white" :
                current ? "bg-indigo-600 border-indigo-600 text-white" :
                          "bg-white border-slate-200 text-slate-400"
              )}>
                {done ? "✓" : i + 1}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-1 transition-all", done ? "bg-emerald-400" : "bg-slate-200")} />
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-5 gap-1 text-center">
        {STATUS_STEPS.map((step) => (
          <div key={step.key}>
            <p className={cn("text-[9px] font-semibold", step.key === status ? "text-indigo-600" : "text-slate-400")}>{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResignationPage() {
  const { data: user } = useAuth();
  const { data: resignation, isLoading } = useMyResignation();
  const submit = useSubmitResignation();
  const update = useUpdateResignation();
  const [form, setForm] = useState({ reason: "", lastWorkingDay: "" });
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const inp = "w-full h-10 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>;

  const checklist = resignation ? [
    { key: "laptopReturned",  label: "Laptop Returned",    done: resignation.laptopReturned },
    { key: "idCardReturned",  label: "ID Card Returned",   done: resignation.idCardReturned },
    { key: "payrollCleared",  label: "Payroll Cleared",    done: resignation.payrollCleared },
    { key: "docsHandedOver",  label: "Documents Handed Over", done: resignation.docsHandedOver },
  ] : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Resignation</h2>
        <p className="text-sm text-slate-500 mt-0.5">Submit and track your exit process</p>
      </div>

      {!resignation ? (
        /* Submit form */
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><LogOut className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Submit Resignation</p>
              <p className="text-xs text-slate-400">This will notify HR and your manager</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Please discuss with your manager before submitting. Resignation once submitted will be reviewed by HR.</p>
          </div>

          <div className="space-y-3">
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Last Working Day *</label>
              <input type="date" className={inp} value={form.lastWorkingDay} min={new Date().toISOString().split("T")[0]} onChange={(e) => setForm((f) => ({ ...f, lastWorkingDay: e.target.value }))} /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Reason for Leaving *</label>
              <textarea className="w-full min-h-[100px] px-3 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Please provide your reason for leaving…" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></div>
          </div>

          <button type="button" disabled={!form.reason.trim() || !form.lastWorkingDay || submit.isPending} onClick={() => submit.mutateAsync(form)}
            className="w-full h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {submit.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><LogOut className="w-4 h-4" />Submit Resignation</>}
          </button>
        </motion.div>
      ) : (
        /* Status view */
        <div className="space-y-4">
          {/* Status card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Resignation Status</p>
                <p className="text-xs text-slate-400 mt-0.5">Submitted {formatDate(resignation.createdAt)}</p>
              </div>
              {resignation.status === "rejected" ? (
                <span className="bg-red-50 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">Rejected</span>
              ) : resignation.status === "completed" ? (
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Completed</span>
              ) : null}
            </div>

            {resignation.status !== "rejected" && <ProgressBar status={resignation.status} />}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
              <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Last Working Day</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{formatDate(resignation.lastWorkingDay)}</p></div>
              <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Reason</p>
                <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{resignation.reason}</p></div>
              {resignation.managerComment && (
                <div className="col-span-2"><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Manager Comment</p>
                  <p className="text-sm text-slate-600 mt-0.5">{resignation.managerComment}</p></div>
              )}
              {resignation.hrComment && (
                <div className="col-span-2"><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">HR Comment</p>
                  <p className="text-sm text-slate-600 mt-0.5">{resignation.hrComment}</p></div>
              )}
            </div>
          </div>

          {/* Exit Checklist */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Exit Checklist</h3>
            <div className="space-y-2.5">
              {checklist.map(({ label, done }) => (
                <div key={label} className={cn("flex items-center gap-3 p-3 rounded-xl border",
                  done ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200")}>
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                    done ? "bg-emerald-500" : "border-2 border-slate-300")}>
                    {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={cn("text-sm font-medium", done ? "text-emerald-700" : "text-slate-600")}>{label}</span>
                  {done && <span className="ml-auto text-[10px] text-emerald-600 font-semibold">Done</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Exit Feedback */}
          {!resignation.exitFeedback ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Exit Feedback</h3>
              {!showFeedback ? (
                <button type="button" onClick={() => setShowFeedback(true)}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                  <MessageSquare className="w-4 h-4" /> Add Exit Feedback
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea className="w-full min-h-[80px] px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Share your experience and suggestions…" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                  <button type="button" disabled={!feedback.trim() || update.isPending}
                    onClick={() => update.mutateAsync({ id: resignation.id, exitFeedback: feedback })}
                    className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center gap-2">
                    {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Submit Feedback
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Exit Feedback</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{resignation.exitFeedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
