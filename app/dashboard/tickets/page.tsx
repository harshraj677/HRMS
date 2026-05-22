"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, X, Loader2, Send, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { useTickets, useCreateTicket, useTicket, useReplyTicket } from "@/hooks/useHelpdesk";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const CATS = [
  { value: "hr",      label: "HR Issue" },
  { value: "payroll", label: "Payroll Issue" },
  { value: "leave",   label: "Leave Issue" },
  { value: "it",      label: "IT Support" },
  { value: "general", label: "General Query" },
];

const PRIORITIES = ["low","medium","high","urgent"];

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  open:        { label: "Open",        icon: AlertCircle,  color: "bg-red-50    text-red-700"     },
  in_progress: { label: "In Progress", icon: Clock,        color: "bg-amber-50  text-amber-700"   },
  resolved:    { label: "Resolved",    icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
  closed:      { label: "Closed",      icon: CheckCircle2, color: "bg-slate-100 text-slate-500"   },
};

function TicketThread({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { data: ticket, isLoading } = useTicket(ticketId);
  const reply = useReplyTicket(ticketId);
  const { data: user } = useAuth();
  const [message, setMessage] = useState("");

  async function handleReply() {
    if (!message.trim()) return;
    await reply.mutateAsync({ content: message });
    setMessage("");
  }

  const meta = ticket ? STATUS_META[ticket.status] ?? STATUS_META.open : STATUS_META.open;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-800">{ticket?.subject}</p>
            {ticket && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", meta.color)}>{meta.label}</span>
                <span className="text-xs text-slate-400">#{ticketId.slice(-6)}</span>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-3">{[1,2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (
            <>
              {/* Original message */}
              {ticket && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Original Request</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
                  <p className="text-xs text-slate-400 mt-2">{timeAgo(ticket.createdAt)}</p>
                </div>
              )}

              {/* Messages */}
              {(ticket?.messages ?? []).map((m) => {
                const isMe = m.senderId === String(user?.id);
                const isAdmin = m.senderRole === "admin";
                return (
                  <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-3",
                      isMe ? "bg-indigo-600 text-white" :
                      isAdmin ? "bg-violet-50 border border-violet-200" : "bg-white border border-slate-200")}>
                      <p className={cn("text-[10px] font-semibold mb-1", isMe ? "text-indigo-200" : isAdmin ? "text-violet-600" : "text-slate-400")}>
                        {m.senderName} {isAdmin && !isMe ? "· Support" : ""}
                      </p>
                      <p className={cn("text-sm whitespace-pre-wrap", isMe ? "text-white" : "text-slate-700")}>{m.content}</p>
                      <p className={cn("text-[10px] mt-1.5", isMe ? "text-indigo-300" : "text-slate-400")}>{timeAgo(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Reply box */}
        {ticket?.status !== "closed" && (
          <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
            <textarea
              className="flex-1 min-h-[56px] max-h-32 px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Type your message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleReply(); }}
            />
            <button type="button" disabled={!message.trim() || reply.isPending} onClick={handleReply}
              className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-60 transition-all self-end">
              {reply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function TicketsPage() {
  const { data: tickets, isLoading } = useTickets();
  const createTicket = useCreateTicket();
  const [showForm, setShowForm] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", category: "hr", priority: "medium", description: "" });

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  async function handleCreate() {
    if (!form.subject.trim() || !form.description.trim()) return;
    await createTicket.mutateAsync(form);
    setForm({ subject: "", category: "hr", priority: "medium", description: "" });
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">Support Tickets</h2><p className="text-sm text-slate-500 mt-0.5">Get help from HR and IT</p></div>
        <button type="button" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> Raise Ticket
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">New Ticket</p>
              <button type="button" onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Subject *</label><input className={inp} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Brief summary of your issue" /></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                <select aria-label="Ticket category" className={inp} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Priority</label>
                <select aria-label="Priority" className={inp} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select></div>
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Description *</label>
                <textarea className="w-full min-h-[80px] px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe your issue in detail…" /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!form.subject.trim() || !form.description.trim() || createTicket.isPending} onClick={handleCreate}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {createTicket.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Submit Ticket"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (tickets?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-center">
          <MessageSquare className="w-8 h-8 text-slate-200 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No tickets</p>
          <p className="text-xs text-slate-400 mt-1">Raise a ticket if you need help</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(tickets ?? []).map((t, i) => {
            const meta = STATUS_META[t.status] ?? STATUS_META.open;
            const SIcon = meta.icon;
            return (
              <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => setOpenTicketId(t.id)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-slate-200 transition-all">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", meta.color.split(" ")[0], "border",
                  meta.color.includes("red") ? "border-red-200" : meta.color.includes("amber") ? "border-amber-200" : meta.color.includes("emerald") ? "border-emerald-200" : "border-slate-200")}>
                  <SIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {CATS.find((c) => c.value === t.category)?.label ?? t.category} · {t.priority} priority
                    {t._count?.messages ? ` · ${t._count.messages} messages` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full block", meta.color)}>{meta.label}</span>
                  <p className="text-[10px] text-slate-400">{timeAgo(t.updatedAt)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {openTicketId && <TicketThread ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />}
      </AnimatePresence>
    </div>
  );
}
