"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Pin, Trash2, Plus, X, Loader2,
  Globe, Building2, Users2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import {
  useAnnouncements, useCreateAnnouncement,
  useDeleteAnnouncement, useTogglePinAnnouncement,
  type AnnouncementData,
} from "@/hooks/useOrg";
import { useDepartments } from "@/hooks/useOrg";
import { Skeleton } from "@/components/ui/skeleton";

const AUDIENCE_META = {
  all:      { icon: Globe,     label: "Everyone",   cls: "bg-indigo-50  text-indigo-700"  },
  dept:     { icon: Building2, label: "Department", cls: "bg-sky-50     text-sky-700"     },
  managers: { icon: Users2,    label: "Managers",   cls: "bg-violet-50  text-violet-700"  },
};

export default function AnnouncementsPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: announcements, isLoading } = useAnnouncements();
  const { data: departments } = useDepartments();
  const create    = useCreateAnnouncement();
  const remove    = useDeleteAnnouncement();
  const togglePin = useTogglePinAnnouncement();

  const [showForm, setShowForm] = useState(false);
  const [title,    setTitle]    = useState("");
  const [content,  setContent]  = useState("");
  const [audience, setAudience] = useState("all");
  const [deptTarget, setDeptTarget] = useState("");
  const [pinned,   setPinned]   = useState(false);

  async function handleCreate() {
    if (!title.trim() || !content.trim()) return;
    await create.mutateAsync({ title, content, audience, targetDept: deptTarget || undefined, isPinned: pinned });
    setTitle(""); setContent(""); setAudience("all"); setDeptTarget(""); setPinned(false);
    setShowForm(false);
  }

  const pinned_list = (announcements ?? []).filter((a) => a.isPinned);
  const normal_list = (announcements ?? []).filter((a) => !a.isPinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Announcements</h2>
          <p className="text-sm text-slate-500 mt-0.5">Company news and updates</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/25">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">New Announcement</p>
              <button type="button" onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Title</label>
              <input className="w-full h-10 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Announcement title…" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Content</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Write your announcement here…"
                value={content} onChange={(e) => setContent(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Audience</label>
                <select aria-label="Announcement audience" className="w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={audience} onChange={(e) => setAudience(e.target.value)}>
                  <option value="all">Everyone</option>
                  <option value="dept">Department</option>
                  <option value="managers">Managers only</option>
                </select>
              </div>
              {audience === "dept" && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Department</label>
                  <select aria-label="Target department" className="w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={deptTarget} onChange={(e) => setDeptTarget(e.target.value)}>
                    <option value="">— Select —</option>
                    {(departments ?? []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-xs font-medium text-slate-600">Pin announcement</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
              <button type="button" onClick={handleCreate} disabled={!title.trim() || !content.trim() || create.isPending}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</> : <><Megaphone className="w-4 h-4" /> Post</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (announcements?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <Megaphone className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No announcements yet</p>
          {isAdmin && <p className="text-xs text-slate-400 mt-1">Post the first company announcement</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned */}
          {pinned_list.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5" /> Pinned
              </p>
              {pinned_list.map((a, i) => (
                <AnnouncementCard key={a.id} announcement={a} isAdmin={isAdmin} idx={i}
                  onDelete={() => remove.mutate(a.id)}
                  onTogglePin={() => togglePin.mutate({ id: a.id, isPinned: !a.isPinned })} />
              ))}
            </div>
          )}

          {/* Normal */}
          {normal_list.length > 0 && (
            <div className="space-y-3">
              {pinned_list.length > 0 && (
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Recent</p>
              )}
              {normal_list.map((a, i) => (
                <AnnouncementCard key={a.id} announcement={a} isAdmin={isAdmin} idx={i + pinned_list.length}
                  onDelete={() => remove.mutate(a.id)}
                  onTogglePin={() => togglePin.mutate({ id: a.id, isPinned: !a.isPinned })} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({
  announcement: a, isAdmin, idx, onDelete, onTogglePin,
}: {
  announcement: AnnouncementData;
  isAdmin: boolean;
  idx: number;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const aud = AUDIENCE_META[a.audience as keyof typeof AUDIENCE_META] ?? AUDIENCE_META.all;
  const AudIcon = aud.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className={cn(
        "bg-white rounded-2xl border shadow-sm p-5",
        a.isPinned ? "border-amber-200" : "border-slate-100"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          a.isPinned ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600")}>
          {a.isPinned ? <Pin className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1", aud.cls)}>
              <AudIcon className="w-2.5 h-2.5" />
              {aud.label}
              {a.targetDept && `: ${a.targetDept}`}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.content}</p>
          <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-400">
            <span className="font-medium text-slate-500">{a.createdBy.fullName}</span>
            {a.createdBy.position && <span>· {a.createdBy.position}</span>}
            <span title={formatDate(a.createdAt)}>{timeAgo(a.createdAt)}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={onTogglePin} title={a.isPinned ? "Unpin" : "Pin"}
              className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                a.isPinned ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50")}>
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={onDelete} title="Delete"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
