"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCandidates, useSubmitCandidate, useJobs, type CandidateData } from "@/hooks/useRecruitment";
import { Skeleton } from "@/components/ui/skeleton";

const STAGE_META: Record<string, { label: string; color: string }> = {
  applied:   { label: "Applied",   color: "bg-slate-100 text-slate-600" },
  screening: { label: "Screening", color: "bg-sky-50 text-sky-700" },
  interview: { label: "Interview", color: "bg-violet-50 text-violet-700" },
  hr_round:  { label: "HR Round",  color: "bg-indigo-50 text-indigo-700" },
  selected:  { label: "Selected",  color: "bg-emerald-50 text-emerald-700" },
  rejected:  { label: "Rejected",  color: "bg-red-50 text-red-600" },
};

export default function MyReferralsPage() {
  const { data: referrals, isLoading } = useCandidates();
  const { data: jobs } = useJobs({ status: "active" });
  const submit = useSubmitCandidate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", jobId: "", jobTitle: "" });

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  async function handleSubmit() {
    if (!form.fullName.trim() || !form.email.trim()) return;
    const selectedJob = (jobs ?? []).find((j) => j.id === form.jobId);
    await submit.mutateAsync({
      fullName: form.fullName, email: form.email, phone: form.phone || undefined,
      appliedJobId: form.jobId || undefined,
      jobTitle: (selectedJob?.title ?? form.jobTitle) || undefined,
    });
    setForm({ fullName: "", email: "", phone: "", jobId: "", jobTitle: "" });
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">My Referrals</h2><p className="text-sm text-slate-500 mt-0.5">Track candidates you&apos;ve referred</p></div>
        <button type="button" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> Refer Someone
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Refer a Candidate</p>
            <button type="button" onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Full Name *</label><input className={inp} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Candidate name" /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Email *</label><input type="email" className={inp} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Phone</label><input type="tel" className={inp} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 99999 00000" /></div>
            <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Job Opening</label>
              <select aria-label="Job opening" className={inp} value={form.jobId} onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}>
                <option value="">— Select job —</option>
                {(jobs ?? []).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select></div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-9 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" disabled={!form.fullName.trim() || !form.email.trim() || submit.isPending} onClick={handleSubmit}
              className="flex-1 h-9 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {submit.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : "Submit Referral"}
            </button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (referrals?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-center">
          <Users className="w-8 h-8 text-slate-200 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No referrals yet</p>
          <p className="text-xs text-slate-400 mt-1">Refer someone and track their progress here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(referrals ?? []).map((c: CandidateData, i) => {
            const stg = STAGE_META[c.stage] ?? STAGE_META.applied;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{c.fullName}</p>
                  <p className="text-xs text-slate-400">{c.email}{c.jobTitle ? ` · ${c.jobTitle}` : ""}</p>
                </div>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full shrink-0", stg.color)}>{stg.label}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
