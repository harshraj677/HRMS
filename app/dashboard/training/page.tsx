"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Plus, X, Loader2, BookOpen, CheckCircle2,
  Clock, BarChart2, Star, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCourses, useCreateCourse, useEnrollCourse, useUpdateProgress, type CourseData } from "@/hooks/useCourses";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const LEVEL_META: Record<string, string> = {
  beginner:     "bg-emerald-50 text-emerald-700",
  intermediate: "bg-amber-50   text-amber-700",
  advanced:     "bg-red-50     text-red-700",
};

const CAT_META: Record<string, string> = {
  general:      "bg-slate-100  text-slate-600",
  technical:    "bg-indigo-50  text-indigo-700",
  "soft-skills":"bg-violet-50  text-violet-700",
  leadership:   "bg-sky-50     text-sky-700",
  compliance:   "bg-amber-50   text-amber-700",
};

const CATS  = ["general","technical","soft-skills","leadership","compliance"];
const LEVELS = ["beginner","intermediate","advanced"];

function CourseCard({ course }: { course: CourseData }) {
  const enroll       = useEnrollCourse(course.id);
  const updateProg   = useUpdateProgress(course.id);
  const [showSlider, setShowSlider] = useState(false);
  const [progress,   setProgress]   = useState(course.myProgress ?? 0);

  const levelColor = LEVEL_META[course.level] ?? LEVEL_META.beginner;
  const catColor   = CAT_META[course.category] ?? CAT_META.general;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", catColor)}>{course.category.replace("-", " ")}</span>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", levelColor)}>{course.level}</span>
              {course.isRequired && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">Required</span>}
            </div>
            <h3 className="text-sm font-semibold text-slate-900 leading-tight">{course.title}</h3>
            {course.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{course.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
          {course.durationMins && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.durationMins}m</span>}
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrolledCount} enrolled</span>
        </div>

        {/* Progress bar */}
        {course.isEnrolled && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Progress</span>
              <span className="text-xs font-bold text-indigo-600">{course.myProgress ?? 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", course.myCompleted ? "bg-emerald-500" : "bg-indigo-500")}
                style={{ width: `${course.myProgress ?? 0}%` }} />
            </div>
            {course.myCompleted && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" />Completed!</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {!course.isEnrolled ? (
            <button type="button" disabled={enroll.isPending} onClick={() => enroll.mutate()}
              className="w-full h-9 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
              {enroll.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GraduationCap className="w-4 h-4" /> Enroll</>}
            </button>
          ) : !course.myCompleted ? (
            <>
              <button type="button" onClick={() => setShowSlider(!showSlider)}
                className="w-full h-9 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition-all">
                <BarChart2 className="w-4 h-4" /> Update Progress
              </button>
              {showSlider && (
                <div className="space-y-2">
                  <input type="range" min="0" max="100" step="5" value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full accent-indigo-600" aria-label="Progress" />
                  <button type="button" onClick={() => { updateProg.mutate(progress); setShowSlider(false); }}
                    disabled={updateProg.isPending}
                    className="w-full h-8 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all">
                    {updateProg.isPending ? "Saving…" : `Save — ${progress}%`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-700 flex items-center justify-center gap-2">
              <Star className="w-4 h-4" /> Completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrainingPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "general", level: "beginner", durationMins: "", isRequired: false });

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  const enrolled   = (courses ?? []).filter((c) => c.isEnrolled && !c.myCompleted);
  const completed  = (courses ?? []).filter((c) => c.myCompleted);
  const available  = (courses ?? []).filter((c) => !c.isEnrolled);
  const required   = available.filter((c) => c.isRequired);

  const totalEnrolled  = (courses ?? []).filter((c) => c.isEnrolled).length;
  const totalCompleted = completed.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">Training & Learning</h2><p className="text-sm text-slate-500 mt-0.5">Skill development courses and certifications</p></div>
        {isAdmin && (
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all shadow-sm shadow-violet-500/25">
            <Plus className="w-4 h-4" /> Add Course
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen,     label: "Total Courses",  value: courses?.length ?? 0,  color: "indigo" },
          { icon: GraduationCap,label: "Enrolled",       value: totalEnrolled,          color: "violet" },
          { icon: CheckCircle2, label: "Completed",      value: totalCompleted,         color: "emerald" },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn("rounded-2xl border p-4 text-center",
              color === "indigo"  && "bg-indigo-50  border-indigo-100",
              color === "violet"  && "bg-violet-50  border-violet-100",
              color === "emerald" && "bg-emerald-50 border-emerald-100",
            )}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2 mx-auto",
              color === "indigo"  && "bg-indigo-100  text-indigo-600",
              color === "violet"  && "bg-violet-100  text-violet-600",
              color === "emerald" && "bg-emerald-100 text-emerald-600",
            )}><Icon className="w-4 h-4" /></div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-0.5",
              color === "indigo" && "text-indigo-500", color === "violet" && "text-violet-500", color === "emerald" && "text-emerald-500",
            )}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">New Course</p>
              <button type="button" onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Title *</label><input className={inp} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Course title" /></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                <select aria-label="Category" className={inp} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATS.map((c) => <option key={c} value={c} className="capitalize">{c.replace("-", " ")}</option>)}
                </select></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Level</label>
                <select aria-label="Level" className={inp} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
                  {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
                </select></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Duration (mins)</label><input type="number" className={inp} value={form.durationMins} onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))} placeholder="60" /></div>
              <div className="flex items-end pb-0.5"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} className="w-4 h-4 rounded text-violet-600" /><span className="text-xs font-medium text-slate-600">Required for all employees</span></label></div>
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Description</label><textarea className="w-full min-h-[60px] px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!form.title.trim() || createCourse.isPending} onClick={async () => {
                await createCourse.mutateAsync({ ...form, durationMins: form.durationMins ? Number(form.durationMins) : undefined } as any);
                setForm({ title: "", description: "", category: "general", level: "beginner", durationMins: "", isRequired: false });
                setShowForm(false);
              }} className="flex-1 h-10 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {createCourse.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create Course"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
      ) : (courses?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <GraduationCap className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No courses yet</p>
          {isAdmin && <p className="text-xs text-slate-400 mt-1">Create the first learning course</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {required.length > 0 && (
            <div><p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Required Courses</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{required.map((c) => <CourseCard key={c.id} course={c} />)}</div></div>
          )}
          {enrolled.length > 0 && (
            <div><p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-3">In Progress</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{enrolled.map((c) => <CourseCard key={c.id} course={c} />)}</div></div>
          )}
          {available.filter((c) => !c.isRequired).length > 0 && (
            <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Available Courses</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{available.filter((c) => !c.isRequired).map((c, i) => <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><CourseCard course={c} /></motion.div>)}</div></div>
          )}
          {completed.length > 0 && (
            <div><p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-3">Completed</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{completed.map((c) => <CourseCard key={c.id} course={c} />)}</div></div>
          )}
        </div>
      )}
    </div>
  );
}
