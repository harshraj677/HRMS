"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Plus, Users, Clock, CheckCircle2,
  X, Loader2, Trash2, Pencil, ChevronRight,
  Search, MapPin, DollarSign,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob, useCandidates, useUpdateCandidate, type JobData } from "@/hooks/useRecruitment";
import { useDepartments } from "@/hooks/useOrg";

const STAGES = ["applied","screening","interview","hr_round","selected","rejected"] as const;
const STAGE_META: Record<string, { label: string; color: string }> = {
  applied:   { label: "Applied",    color: "bg-slate-100 text-slate-600" },
  screening: { label: "Screening",  color: "bg-sky-50 text-sky-700" },
  interview: { label: "Interview",  color: "bg-violet-50 text-violet-700" },
  hr_round:  { label: "HR Round",   color: "bg-indigo-50 text-indigo-700" },
  selected:  { label: "Selected",   color: "bg-emerald-50 text-emerald-700" },
  rejected:  { label: "Rejected",   color: "bg-red-50 text-red-600" },
};

const EMP_TYPES = ["Full-time","Part-time","Contract","Intern"];

function JobForm({ initial, onSave, onCancel, saving, depts }: {
  initial?: Partial<JobData>; onSave: (d: Partial<JobData>) => void;
  onCancel: () => void; saving: boolean; depts: string[];
}) {
  const [f, setF] = useState<Partial<JobData>>({
    title: "", department: "", location: "", experience: "",
    employmentType: "Full-time", description: "", status: "active",
    skills: [], deadline: null, salaryMin: null, salaryMax: null,
    ...initial,
  });
  const [skillInput, setSkillInput] = useState("");

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  function addSkill() {
    const s = skillInput.trim();
    if (s && !f.skills?.includes(s)) setF((p) => ({ ...p, skills: [...(p.skills ?? []), s] }));
    setSkillInput("");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Job Title *</label><input className={inp} value={f.title ?? ""} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. React Developer" /></div>
        <div className="space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Department</label>
          <select aria-label="Department" className={inp} value={f.department ?? ""} onChange={(e) => setF((p) => ({ ...p, department: e.target.value }))}>
            <option value="">— None —</option>{depts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select></div>
        <div className="space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Employment Type</label>
          <select aria-label="Employment type" className={inp} value={f.employmentType ?? "Full-time"} onChange={(e) => setF((p) => ({ ...p, employmentType: e.target.value }))}>
            {EMP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></div>
        <div className="space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Location</label><input className={inp} value={f.location ?? ""} onChange={(e) => setF((p) => ({ ...p, location: e.target.value }))} placeholder="Hubli / Remote" /></div>
        <div className="space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Experience</label><input className={inp} value={f.experience ?? ""} onChange={(e) => setF((p) => ({ ...p, experience: e.target.value }))} placeholder="0–2 years" /></div>
        <div className="space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Salary Min (₹)</label><input type="number" className={inp} value={f.salaryMin ?? ""} onChange={(e) => setF((p) => ({ ...p, salaryMin: e.target.value ? Number(e.target.value) : null }))} /></div>
        <div className="space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Salary Max (₹)</label><input type="number" className={inp} value={f.salaryMax ?? ""} onChange={(e) => setF((p) => ({ ...p, salaryMax: e.target.value ? Number(e.target.value) : null }))} /></div>
        <div className="space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Application Deadline</label><input type="date" className={inp} value={f.deadline?.split("T")[0] ?? ""} onChange={(e) => setF((p) => ({ ...p, deadline: e.target.value || null }))} /></div>
        <div className="space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Status</label>
          <select aria-label="Job status" className={inp} value={f.status ?? "active"} onChange={(e) => setF((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option><option value="draft">Draft</option><option value="closed">Closed</option>
          </select></div>
        <div className="col-span-2 space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Description *</label>
          <textarea className="w-full min-h-[80px] px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={f.description ?? ""} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} placeholder="Job description…" /></div>
        <div className="col-span-2 space-y-1"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Skills</label>
          <div className="flex gap-2">
            <input className={inp} value={skillInput} placeholder="Add skill…" onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
            <button type="button" onClick={addSkill} className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shrink-0">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(f.skills ?? []).map((s) => <span key={s} className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1">{s}<button type="button" onClick={() => setF((p) => ({ ...p, skills: p.skills?.filter((x) => x !== s) }))}><X className="w-3 h-3" /></button></span>)}
          </div></div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        <button type="button" disabled={!f.title?.trim() || !f.description?.trim() || saving} onClick={() => onSave(f)}
          className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Post Job"}
        </button>
      </div>
    </div>
  );
}

export default function RecruitmentPage() {
  const { data: jobs, isLoading: jobsLoad } = useJobs({ status: "all" });
  const { data: candidates } = useCandidates();
  const { data: departments } = useDepartments();
  const createJob   = useCreateJob();
  const updateJob   = useUpdateJob();
  const deleteJob   = useDeleteJob();
  const updateCand  = useUpdateCandidate();

  const depts = (departments ?? []).map((d) => d.name);

  const [showForm,  setShowForm]  = useState(false);
  const [editJob,   setEditJob]   = useState<JobData | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredJobs = (jobs ?? []).filter((j) => !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.department?.toLowerCase().includes(search.toLowerCase()));

  const jobCandidates = (candidates ?? []).filter((c) => !selectedJob || c.appliedJobId === selectedJob);

  // Stats
  const activeJobs   = (jobs ?? []).filter((j) => j.status === "active").length;
  const totalCands   = (candidates ?? []).length;
  const selected     = (candidates ?? []).filter((c) => c.stage === "selected").length;
  const inInterview  = (candidates ?? []).filter((c) => c.stage === "interview").length;

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div><h2 className="text-xl font-bold text-slate-900">Recruitment</h2><p className="text-sm text-slate-500 mt-0.5">Manage openings and candidates</p></div>
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/25">
            <Plus className="w-4 h-4" /> Post Job
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Briefcase,    label: "Active Jobs",   value: activeJobs,  color: "indigo" },
            { icon: Users,        label: "Candidates",    value: totalCands,  color: "violet" },
            { icon: Clock,        label: "In Interview",  value: inInterview, color: "amber" },
            { icon: CheckCircle2, label: "Selected",      value: selected,    color: "emerald" },
          ].map(({ icon: Icon, label, value, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={cn("rounded-2xl border p-4",
                color === "indigo"  && "bg-indigo-50  border-indigo-100",
                color === "violet"  && "bg-violet-50  border-violet-100",
                color === "amber"   && "bg-amber-50   border-amber-100",
                color === "emerald" && "bg-emerald-50 border-emerald-100",
              )}>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2",
                color === "indigo"  && "bg-indigo-100  text-indigo-600",
                color === "violet"  && "bg-violet-100  text-violet-600",
                color === "amber"   && "bg-amber-100   text-amber-600",
                color === "emerald" && "bg-emerald-100 text-emerald-600",
              )}><Icon className="w-4 h-4" /></div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-0.5",
                color === "indigo" && "text-indigo-500", color === "violet" && "text-violet-500",
                color === "amber" && "text-amber-500",   color === "emerald" && "text-emerald-500",
              )}>{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Create / Edit Job Form */}
        <AnimatePresence>
          {(showForm || editJob) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-800 mb-4">{editJob ? "Edit Job" : "New Job Opening"}</p>
              <JobForm depts={depts} initial={editJob ?? undefined} saving={createJob.isPending || updateJob.isPending}
                onCancel={() => { setShowForm(false); setEditJob(null); }}
                onSave={async (d) => {
                  if (editJob) { await updateJob.mutateAsync({ id: editJob.id, ...d }); setEditJob(null); }
                  else { await createJob.mutateAsync(d); setShowForm(false); }
                }} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Jobs list */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-800 flex-1">Job Openings</h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input className="pl-8 h-8 w-44 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            {jobsLoad ? (
              <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-14 text-center">
                <Briefcase className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-500">No jobs yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredJobs.map((job, i) => (
                  <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                    className={cn("bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all",
                      selectedJob === job.id ? "border-indigo-300" : "border-slate-100")}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{job.title}</p>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            job.status === "active" ? "bg-emerald-50 text-emerald-700" : job.status === "closed" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500")}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-slate-400">
                          {job.department && <span className="flex items-center gap-0.5"><Briefcase className="w-3 h-3" />{job.department}</span>}
                          {job.location   && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>}
                          {job.employmentType && <span>{job.employmentType}</span>}
                          {(job.salaryMin || job.salaryMax) && (
                            <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3" />
                              {job.salaryMin && `₹${(job.salaryMin/1000).toFixed(0)}k`}
                              {job.salaryMin && job.salaryMax && "–"}
                              {job.salaryMax && `₹${(job.salaryMax/1000).toFixed(0)}k`}
                            </span>
                          )}
                        </div>
                        {job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {job.skills.slice(0, 4).map((s) => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{s}</span>)}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {(candidates ?? []).filter((c) => c.appliedJobId === job.id).length} candidates
                          {job.deadline && ` · Deadline: ${formatDate(job.deadline)}`}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditJob(job); setShowForm(false); }}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); deleteJob.mutate(job.id); }}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Candidate pipeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">
              {selectedJob ? `Candidates for "${(jobs ?? []).find((j) => j.id === selectedJob)?.title}"` : "All Candidates"}
            </h3>
            {jobCandidates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-14 text-center">
                <Users className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-500">No candidates yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {jobCandidates.map((c, i) => {
                  const stg = STAGE_META[c.stage] ?? STAGE_META.applied;
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{c.fullName}</p>
                          <p className="text-xs text-slate-400">{c.email} {c.phone && `· ${c.phone}`}</p>
                          {c.jobTitle && <p className="text-xs text-slate-400 mt-0.5">{c.jobTitle}</p>}
                        </div>
                        <div className="shrink-0 space-y-1.5 text-right">
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", stg.color)}>{stg.label}</span>
                          <select aria-label="Change stage"
                            className="block text-[10px] border border-slate-200 rounded-lg px-1.5 py-0.5 text-slate-600 bg-white focus:outline-none"
                            value={c.stage}
                            onChange={(e) => updateCand.mutate({ id: c.id, stage: e.target.value })}>
                            {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
