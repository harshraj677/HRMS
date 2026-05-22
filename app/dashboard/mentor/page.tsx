"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Plus, Loader2, X, MessageSquare } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { useStartups } from "@/hooks/useStartups";
import { toast } from "sonner";

interface Review {
  id: string;
  startupId: string;
  startupName: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPosition: string | null;
  score: number;
  notes: string;
  category: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "general",  label: "Overall" },
  { value: "product",  label: "Product" },
  { value: "market",   label: "Market" },
  { value: "team",     label: "Team" },
  { value: "funding",  label: "Funding" },
];

const CAT_COLOR: Record<string, string> = {
  general: "bg-slate-100  text-slate-600",
  product: "bg-indigo-50  text-indigo-700",
  market:  "bg-sky-50     text-sky-700",
  team:    "bg-violet-50  text-violet-700",
  funding: "bg-emerald-50 text-emerald-700",
};

function Stars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <Star key={i} className={cn("w-3.5 h-3.5", i < score ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
      ))}
      <span className="ml-1.5 text-sm font-bold text-slate-800">{score}/10</span>
    </div>
  );
}

function useReviews(startupId?: string) {
  const p = new URLSearchParams();
  if (startupId) p.set("startupId", startupId);
  return useQuery<Review[]>({
    queryKey: ["mentor-reviews", startupId],
    queryFn: async () => {
      const res = await fetch(`/api/mentor/reviews?${p.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).reviews;
    },
  });
}

function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { startupId: string; score: number; notes: string; category: string }) => {
      const res = await fetch("/api/mentor/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.review;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mentor-reviews"] }); toast.success("Review submitted."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export default function MentorPage() {
  const { data: startups } = useStartups();
  const [selectedStartup, setSelectedStartup] = useState<string>("all");
  const { data: reviews, isLoading } = useReviews(selectedStartup !== "all" ? selectedStartup : undefined);
  const create = useCreateReview();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ startupId: "", score: 7, notes: "", category: "general" });

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  // Average score per startup
  const startupScores: Record<string, { count: number; sum: number }> = {};
  (reviews ?? []).forEach((r) => {
    if (!startupScores[r.startupId]) startupScores[r.startupId] = { count: 0, sum: 0 };
    startupScores[r.startupId].count++;
    startupScores[r.startupId].sum += r.score;
  });

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Mentor Reviews</h2>
            <p className="text-sm text-slate-500 mt-0.5">Score and review startup progress</p>
          </div>
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/25">
            <Plus className="w-4 h-4" /> Add Review
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">New Mentor Review</p>
              <button type="button" onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Startup *</label>
                <select aria-label="Select startup" className={inp} value={form.startupId} onChange={(e) => setForm((f) => ({ ...f, startupId: e.target.value }))}>
                  <option value="">— Select startup —</option>
                  {(startups ?? []).map((s) => <option key={s.id} value={s.id}>{s.startupName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                <select aria-label="Category" className={inp} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Score (1–10): {form.score}</label>
                <input type="range" min="1" max="10" value={form.score}
                  onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))}
                  aria-label="Score" className="w-full h-9 accent-indigo-600 cursor-pointer" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Notes *</label>
                <textarea className="w-full min-h-[80px] px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Share your assessment of this startup…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!form.startupId || !form.notes.trim() || create.isPending}
                onClick={async () => { await create.mutateAsync(form); setForm({ startupId: "", score: 7, notes: "", category: "general" }); setShowForm(false); }}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : "Submit Review"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Filter by startup */}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSelectedStartup("all")}
            className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
              selectedStartup === "all" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300")}>
            All Startups
          </button>
          {(startups ?? []).map((s) => {
            const sc = startupScores[s.id];
            const avg = sc ? (sc.sum / sc.count).toFixed(1) : null;
            return (
              <button key={s.id} type="button" onClick={() => setSelectedStartup(s.id)}
                className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5",
                  selectedStartup === s.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300")}>
                {s.startupName}
                {avg && <span className="text-[10px] opacity-70">★{avg}</span>}
              </button>
            );
          })}
        </div>

        {/* Reviews */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : (reviews?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <MessageSquare className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No reviews yet</p>
            <p className="text-xs text-slate-400 mt-1">Start reviewing startups to track their progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews?.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{r.startupName}</p>
                    <p className="text-xs text-slate-400">by {r.reviewerName}{r.reviewerPosition ? ` · ${r.reviewerPosition}` : ""} · {timeAgo(r.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", CAT_COLOR[r.category] ?? CAT_COLOR.general)}>{CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category}</span>
                  </div>
                </div>
                <Stars score={r.score} />
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{r.notes}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
