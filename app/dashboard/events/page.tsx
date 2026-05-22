"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, MapPin, Users, X, Loader2, Globe,
  CheckCircle2, Clock, VideoIcon,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useEvents, useCreateEvent, useRegisterEvent, type EventData } from "@/hooks/useEvents";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const TYPE_META: Record<string, { label: string; color: string }> = {
  workshop:    { label: "Workshop",    color: "bg-indigo-50 text-indigo-700"  },
  hackathon:   { label: "Hackathon",  color: "bg-violet-50 text-violet-700"  },
  seminar:     { label: "Seminar",    color: "bg-sky-50    text-sky-700"     },
  demo_day:    { label: "Demo Day",   color: "bg-amber-50  text-amber-700"   },
  webinar:     { label: "Webinar",    color: "bg-teal-50   text-teal-700"    },
  other:       { label: "Event",      color: "bg-slate-100 text-slate-600"   },
};

const STATUS_META: Record<string, string> = {
  upcoming:  "bg-emerald-50 text-emerald-700",
  ongoing:   "bg-indigo-50  text-indigo-700",
  completed: "bg-slate-100  text-slate-600",
  cancelled: "bg-red-50     text-red-600",
};

const EVENT_TYPES = ["workshop","hackathon","seminar","demo_day","webinar","other"];

function EventCard({ event }: { event: EventData }) {
  const { data: user } = useAuth();
  const registerMutation = useRegisterEvent(event.id);
  const typeMeta = TYPE_META[event.eventType] ?? TYPE_META.other;
  const isFull   = event.maxCapacity != null && event.registrationCount >= event.maxCapacity;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", typeMeta.color)}>{typeMeta.label}</span>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", STATUS_META[event.status] ?? STATUS_META.upcoming)}>{event.status}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
            {event.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{event.description}</p>}
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {formatDate(event.startDate)}
            {event.endDate && ` – ${formatDate(event.endDate)}`}
          </div>
          {(event.location || event.isOnline) && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {event.isOnline ? <VideoIcon className="w-3.5 h-3.5 text-sky-500" /> : <MapPin className="w-3.5 h-3.5 text-slate-400" />}
              {event.isOnline ? "Online event" : event.location}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {event.registrationCount} registered
            {event.maxCapacity && ` / ${event.maxCapacity} max`}
          </div>
        </div>

        {event.status === "upcoming" && (
          <button
            type="button"
            disabled={registerMutation.isPending || (isFull && !event.isRegistered)}
            onClick={() => registerMutation.mutate(!event.isRegistered)}
            className={cn(
              "w-full h-9 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
              event.isRegistered
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                : isFull
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/25"
            )}
          >
            {registerMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : event.isRegistered ? (
              <><CheckCircle2 className="w-4 h-4" /> Registered — Click to cancel</>
            ) : isFull ? (
              "Full"
            ) : (
              "Register Now"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: events, isLoading } = useEvents();
  const createEvent = useCreateEvent();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", eventType: "workshop",
    startDate: "", endDate: "", location: "", isOnline: false, maxCapacity: "",
  });

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  async function handleCreate() {
    if (!form.title.trim() || !form.startDate) return;
    await createEvent.mutateAsync({
      title:       form.title,
      description: form.description || undefined,
      eventType:   form.eventType,
      startDate:   form.startDate,
      endDate:     form.endDate || undefined,
      location:    form.location || undefined,
      isOnline:    form.isOnline,
      maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
    } as any);
    setForm({ title: "", description: "", eventType: "workshop", startDate: "", endDate: "", location: "", isOnline: false, maxCapacity: "" });
    setShowForm(false);
  }

  const upcoming  = (events ?? []).filter((e) => e.status === "upcoming");
  const past      = (events ?? []).filter((e) => e.status === "completed" || e.status === "cancelled");
  const myEvents  = (events ?? []).filter((e) => e.isRegistered);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">Events</h2><p className="text-sm text-slate-500 mt-0.5">Workshops, hackathons, seminars and demo days</p></div>
        {isAdmin && (
          <button type="button" onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/25">
            <Plus className="w-4 h-4" /> Create Event
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Create New Event</p>
              <button type="button" onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Title *</label><input className={inp} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Event title" /></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Type</label>
                <select aria-label="Event type" className={inp} value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{TYPE_META[t]?.label ?? t}</option>)}
                </select></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Max Capacity</label><input type="number" className={inp} value={form.maxCapacity} onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))} placeholder="Leave blank for unlimited" /></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Start Date *</label><input type="datetime-local" className={inp} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">End Date</label><input type="datetime-local" className={inp} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Location</label><input className={inp} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Venue or leave blank for online" /></div>
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Description</label><textarea className="w-full min-h-[60px] px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="isOnline" checked={form.isOnline} onChange={(e) => setForm((f) => ({ ...f, isOnline: e.target.checked })) } className="w-4 h-4 rounded text-indigo-600" /><label htmlFor="isOnline" className="text-sm font-medium text-slate-600 cursor-pointer">Online event</label></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!form.title.trim() || !form.startDate || createEvent.isPending} onClick={handleCreate}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {createEvent.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create Event"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
      ) : (events?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <Calendar className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No events yet</p>
          {isAdmin && <p className="text-xs text-slate-400 mt-1">Create the first company event</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {myEvents.length > 0 && (
            <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">My Registrations</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{myEvents.map((e) => <EventCard key={e.id} event={e} />)}</div></div>
          )}
          {upcoming.length > 0 && (
            <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Upcoming Events</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((e, i) => <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><EventCard event={e} /></motion.div>)}
              </div></div>
          )}
          {past.length > 0 && (
            <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Past Events</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{past.map((e) => <EventCard key={e.id} event={e} />)}</div></div>
          )}
        </div>
      )}
    </div>
  );
}
