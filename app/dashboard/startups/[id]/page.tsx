"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Mail, Phone, Globe, MapPin, Users,
  Pencil, Trash2, ExternalLink, Rocket,
  CheckCircle2, Clock, Target, Plus, X, Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStartup, useDeleteStartup, type StartupData } from "@/hooks/useStartups";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate } from "@/lib/utils";
import { StartupModal } from "../StartupModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { toast } from "sonner";

// ── Color config ───────────────────────────────────────────────
const programColor: Record<string, string> = {
  "Diksuchi":     "from-indigo-500 to-indigo-600",
  "Vridhi":       "from-emerald-500 to-emerald-600",
  "Vega":         "from-violet-500 to-violet-600",
  "Yuva Shristi": "from-amber-500 to-amber-600",
};

const stageColor: Record<string, string> = {
  "Idea":      "bg-slate-100 text-slate-600",
  "Prototype": "bg-amber-100 text-amber-700",
  "MVP":       "bg-blue-100 text-blue-700",
  "Funding":   "bg-indigo-100 text-indigo-700",
  "Growth":    "bg-emerald-100 text-emerald-700",
  "Scaling":   "bg-violet-100 text-violet-700",
};

const statusColor: Record<string, string> = {
  "Active":    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Paused":    "bg-amber-50 text-amber-700 border-amber-200",
  "Graduated": "bg-blue-50 text-blue-700 border-blue-200",
  "Completed": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "On Hold":   "bg-slate-50 text-slate-600 border-slate-200",
};

const fundingColor: Record<string, { bg: string; text: string }> = {
  "Bootstrapped":    { bg: "bg-slate-100",   text: "text-slate-700"  },
  "Grant Supported": { bg: "bg-teal-100",    text: "text-teal-700"   },
  "Pre-Seed":        { bg: "bg-amber-100",   text: "text-amber-700"  },
  "Seed":            { bg: "bg-orange-100",  text: "text-orange-700" },
  "Series A":        { bg: "bg-indigo-100",  text: "text-indigo-700" },
  "Series B":        { bg: "bg-violet-100",  text: "text-violet-700" },
};

// ── Progress ring ──────────────────────────────────────────────
function ProgressRing({ value }: { value: number }) {
  const r = 36; const circ = 2 * Math.PI * r;
  const dash = circ - (value / 100) * circ;
  const color = value >= 75 ? "#10b981" : value >= 45 ? "#6366f1" : "#f59e0b";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-bold text-slate-900 leading-none">{value}%</p>
        <p className="text-[9px] text-slate-400 font-medium mt-0.5">PROGRESS</p>
      </div>
    </div>
  );
}

// ── Milestone types ────────────────────────────────────────────
interface Milestone { id: string; startupId: string; title: string; description: string | null; targetDate: string | null; completedAt: string | null; status: string; createdAt: string }

function useMilestones(startupId: string) {
  return useQuery<Milestone[]>({
    queryKey: ["milestones", startupId],
    queryFn: async () => {
      const res = await fetch(`/api/startups/${startupId}/milestones`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).milestones ?? [];
    },
    enabled: !!startupId,
  });
}

function useCreateMilestone(startupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; targetDate?: string }) => {
      const res = await fetch(`/api/startups/${startupId}/milestones`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.milestone;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["milestones", startupId] }); toast.success("Milestone added."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

function useUpdateMilestone(startupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ milestoneId, status }: { milestoneId: string; status: string }) => {
      const res = await fetch(`/api/startups/${startupId}/milestones`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ milestoneId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.milestone;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", startupId] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Delete confirmation ────────────────────────────────────────
function DeleteModal({ startup, onClose, onDeleted }: { startup: StartupData; onClose: () => void; onDeleted: () => void }) {
  const { data: user } = useAuth();
  const del = useDeleteStartup();
  return (
    <ConfirmDeleteModal open={true} onOpenChange={(v) => { if (!v) onClose(); }}
      config={{ resourceType: "Startup", displayName: startup.startupName, resourceSummary: startup.founderEmail || startup.founderName, allowPermanentPurge: user?.role === "super_admin" }}
      isPending={del.isPending}
      onConfirm={async (opts) => { await del.mutateAsync({ id: startup.id, confirmName: startup.startupName, ...opts }); onClose(); onDeleted(); }}
    />
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function StartupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();
  const { data: user }    = useAuth();
  const { data: startup, isLoading } = useStartup(id);
  const { data: milestones }         = useMilestones(id);
  const createMilestone = useCreateMilestone(id);
  const updateMilestone = useUpdateMilestone(id);
  const isAdmin = user?.role === "admin";

  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [msForm, setMsForm] = useState({ title: "", description: "", targetDate: "" });

  if (isLoading) return (
    <div className="space-y-6"><Skeleton className="h-48 w-full rounded-2xl" /><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl lg:col-span-2" /></div></div>
  );

  if (!startup) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4"><Rocket className="w-8 h-8 text-slate-300" /></div>
      <p className="text-sm font-semibold text-slate-600">Startup not found</p>
      <Link href="/dashboard/startups" className="text-xs text-indigo-600 hover:underline mt-2">← Back to portfolio</Link>
    </div>
  );

  const bannerGradient = programColor[startup.program] ?? "from-indigo-500 to-violet-600";
  const funding        = fundingColor[startup.fundingStage] ?? { bg: "bg-slate-100", text: "text-slate-700" };

  // Health score: weighted average of progress, funding stage, status
  const fundingScore = ["Bootstrapped","Grant Supported","Pre-Seed","Seed","Series A","Series B"].indexOf(startup.fundingStage);
  const stageScore   = ["Idea","Prototype","MVP","Funding","Growth","Scaling"].indexOf(startup.stage);
  const statusScore  = startup.status === "Active" ? 30 : startup.status === "Graduated" ? 35 : 0;
  const healthScore  = Math.min(100, Math.round((startup.progress * 0.4) + (Math.max(0, fundingScore) / 5 * 30) + (Math.max(0, stageScore) / 5 * 30) + statusScore / 100 * 30));

  const completedMilestones = (milestones ?? []).filter((m) => m.status === "completed").length;
  const totalMilestones     = (milestones ?? []).length;

  const infoItems = [
    { icon: Mail,     label: "Email",    value: startup.founderEmail,  href: startup.founderEmail ? `mailto:${startup.founderEmail}` : undefined },
    { icon: Phone,    label: "Phone",    value: startup.founderPhone,  href: startup.founderPhone ? `tel:${startup.founderPhone}` : undefined },
    { icon: Globe,    label: "Website",  value: startup.website,       href: startup.website ?? undefined },
    { icon: MapPin,   label: "Location", value: startup.location,      href: undefined },
    { icon: Users,    label: "Team",     value: startup.teamSize ? `${startup.teamSize} people` : null, href: undefined },
  ].filter((i) => i.value);

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/dashboard/startups" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to portfolio
      </Link>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className={cn("relative h-32 bg-gradient-to-r overflow-hidden", bannerGradient)}>
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <Avatar className="h-24 w-24 rounded-2xl ring-4 ring-white shadow-xl shrink-0">
              <AvatarFallback className={cn("rounded-2xl text-3xl font-black text-white bg-gradient-to-br", bannerGradient)}>
                {startup.startupName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{startup.startupName}</h1>
                <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", statusColor[startup.status] ?? "bg-slate-50 text-slate-600 border-slate-200")}>{startup.status}</span>
              </div>
              <p className="text-sm text-slate-500">Founded by <span className="font-semibold text-slate-700">{startup.founderName}</span></p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span className={cn("text-xs font-semibold px-3 py-1 rounded-full text-white bg-gradient-to-r", bannerGradient)}>{startup.program}</span>
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", stageColor[startup.stage] ?? "bg-slate-100 text-slate-600")}>{startup.stage}</span>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", funding.bg, funding.text)}>{startup.fundingStage}</span>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0 pb-1">
                {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"><ExternalLink className="w-3.5 h-3.5" /> Website</a>}
                <button type="button" onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button type="button" title="Delete startup" onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-white border border-slate-100 shadow-sm h-10 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold">Overview</TabsTrigger>
          <TabsTrigger value="milestones" className="rounded-lg text-xs font-semibold">
            Milestones {totalMilestones > 0 && `(${completedMilestones}/${totalMilestones})`}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {/* Progress + health */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
              <ProgressRing value={startup.progress} />
              <div className="mt-4 w-full space-y-3">
                {/* Health Score */}
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Health Score</p>
                  <Progress value={healthScore} className={cn("h-2", healthScore >= 70 ? "[&>div]:bg-emerald-500" : healthScore >= 40 ? "[&>div]:bg-amber-400" : "[&>div]:bg-red-400")} />
                  <p className={cn("text-lg font-bold mt-1", healthScore >= 70 ? "text-emerald-600" : healthScore >= 40 ? "text-amber-600" : "text-red-600")}>{healthScore}/100</p>
                </div>
                {[
                  { label: "Stage",   value: startup.stage,   colorKey: "stage"   },
                  { label: "Mentor",  value: startup.mentor,  colorKey: ""        },
                  { label: "Added",   value: formatDate(startup.createdAt), colorKey: "" },
                ].filter((i) => i.value).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-t border-slate-50">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs font-semibold text-slate-700 text-right truncate max-w-[140px]">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Details */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="lg:col-span-2 space-y-4">
              {startup.description && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">About</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{startup.description}</p>
                </div>
              )}
              {infoItems.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Founder & Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {infoItems.map(({ icon: Icon, label, value, href }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-slate-400" /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</p>
                          {href ? (
                            <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 truncate block mt-0.5">{value}</a>
                          ) : (
                            <p className="text-sm font-medium text-slate-700 truncate mt-0.5">{value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Program",  value: startup.program,      color: "indigo" },
                  { label: "Funding",  value: startup.fundingStage, color: "violet" },
                  { label: "Team",     value: startup.teamSize ? `${startup.teamSize} ppl` : "—", color: "emerald" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={cn("rounded-2xl border p-4 text-center",
                    color === "indigo"  && "bg-indigo-50/60  border-indigo-100",
                    color === "violet"  && "bg-violet-50/60  border-violet-100",
                    color === "emerald" && "bg-emerald-50/60 border-emerald-100",
                  )}>
                    <p className={cn("text-sm font-bold truncate",
                      color === "indigo" && "text-indigo-800", color === "violet" && "text-violet-800", color === "emerald" && "text-emerald-800",
                    )}>{value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* ── Milestones ───────────────────────────────────────── */}
        <TabsContent value="milestones">
          <div className="mt-4 space-y-4">
            {isAdmin && (
              <div>
                {!showMilestoneForm ? (
                  <button type="button" onClick={() => setShowMilestoneForm(true)}
                    className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                    <Plus className="w-4 h-4" /> Add Milestone
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">New Milestone</p>
                      <button type="button" title="Cancel" onClick={() => setShowMilestoneForm(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                    <input className={inp} placeholder="Milestone title *" value={msForm.title} onChange={(e) => setMsForm((f) => ({ ...f, title: e.target.value }))} />
                    <input className={inp} placeholder="Description (optional)" value={msForm.description} onChange={(e) => setMsForm((f) => ({ ...f, description: e.target.value }))} />
                    <input type="date" className={inp} value={msForm.targetDate} onChange={(e) => setMsForm((f) => ({ ...f, targetDate: e.target.value }))} aria-label="Target date" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setShowMilestoneForm(false); setMsForm({ title: "", description: "", targetDate: "" }); }} className="flex-1 h-9 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                      <button type="button" disabled={!msForm.title.trim() || createMilestone.isPending}
                        onClick={async () => { await createMilestone.mutateAsync({ title: msForm.title, description: msForm.description || undefined, targetDate: msForm.targetDate || undefined }); setMsForm({ title: "", description: "", targetDate: "" }); setShowMilestoneForm(false); }}
                        className="flex-1 h-9 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        {createMilestone.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : "Add Milestone"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {(milestones?.length ?? 0) === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-center">
                <Target className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm font-semibold text-slate-600">No milestones yet</p>
                {isAdmin && <p className="text-xs text-slate-400 mt-1">Add milestones to track this startup&apos;s journey</p>}
              </div>
            ) : (
              <>
                {/* Progress summary */}
                {totalMilestones > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-700">Milestone Progress</p>
                      <span className="text-sm font-bold text-indigo-600">{completedMilestones}/{totalMilestones}</span>
                    </div>
                    <Progress value={(completedMilestones / totalMilestones) * 100} className="h-2" />
                  </div>
                )}

                <div className="space-y-2">
                  {milestones?.map((m, i) => (
                    <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className={cn("bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 transition-all",
                        m.status === "completed" ? "border-emerald-200" : m.status === "in_progress" ? "border-indigo-200" : "border-slate-100"
                      )}>
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        m.status === "completed" ? "bg-emerald-100 text-emerald-600" :
                        m.status === "in_progress" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {m.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : m.status === "in_progress" ? <Clock className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold", m.status === "completed" ? "text-slate-600 line-through" : "text-slate-900")}>{m.title}</p>
                        {m.description && <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          {m.targetDate && <span>Target: {formatDate(m.targetDate)}</span>}
                          {m.completedAt && <span className="text-emerald-600">✓ Done {formatDate(m.completedAt)}</span>}
                        </div>
                      </div>
                      {isAdmin && m.status !== "completed" && (
                        <div className="shrink-0 flex gap-1">
                          {m.status === "pending" && (
                            <button type="button" onClick={() => updateMilestone.mutate({ milestoneId: m.id, status: "in_progress" })}
                              className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">Start</button>
                          )}
                          <button type="button" onClick={() => updateMilestone.mutate({ milestoneId: m.id, status: "completed" })}
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">Done</button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {editOpen && <StartupModal startup={startup} onClose={() => setEditOpen(false)} />}
      {deleteOpen && <DeleteModal startup={startup} onClose={() => setDeleteOpen(false)} onDeleted={() => router.push("/dashboard/startups")} />}
    </div>
  );
}
