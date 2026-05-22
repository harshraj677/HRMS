"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, CheckCircle2, Clock, AlertCircle, XCircle, Search, Filter } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, timeAgo } from "@/lib/utils";
import { useTickets, useUpdateTicket, type TicketData } from "@/hooks/useHelpdesk";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/hooks/useEmployees";
import dynamic from "next/dynamic";

// Reuse the TicketThread from the employee page via a lazy import approach
// Instead we inline a simplified thread + admin controls here

const STATUS_META: Record<string, { label: string; icon: typeof Clock; dot: string }> = {
  open:        { label: "Open",        icon: AlertCircle,  dot: "bg-red-500"     },
  in_progress: { label: "In Progress", icon: Clock,        dot: "bg-amber-500"   },
  resolved:    { label: "Resolved",    icon: CheckCircle2, dot: "bg-emerald-500" },
  closed:      { label: "Closed",      icon: XCircle,      dot: "bg-slate-400"   },
};

const PRIORITY_COLOR: Record<string, string> = {
  low:    "bg-slate-100 text-slate-600",
  medium: "bg-sky-50    text-sky-700",
  high:   "bg-amber-50  text-amber-700",
  urgent: "bg-red-50    text-red-700",
};

export default function HelpdeskPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data: tickets, isLoading } = useTickets({ status: statusFilter !== "all" ? statusFilter : undefined });
  const updateTicket = useUpdateTicket();
  const { data: employees } = useEmployees();
  const admins = (employees ?? []).filter((e) => e.role === "admin");

  const filtered = (tickets ?? []).filter((t) =>
    !search ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.creatorName?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const open       = (tickets ?? []).filter((t) => t.status === "open").length;
  const inProgress = (tickets ?? []).filter((t) => t.status === "in_progress").length;
  const resolved   = (tickets ?? []).filter((t) => t.status === "resolved").length;

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Helpdesk</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage employee support tickets</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[
            { label: "Open",       value: open,       icon: AlertCircle,  color: "red"     },
            { label: "In Progress",value: inProgress, icon: Clock,        color: "amber"   },
            { label: "Resolved",   value: resolved,   icon: CheckCircle2, color: "emerald" },
            { label: "Total",      value: tickets?.length ?? 0, icon: MessageSquare, color: "indigo" },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={cn("rounded-2xl border p-4",
                color === "red"     && "bg-red-50     border-red-100",
                color === "amber"   && "bg-amber-50   border-amber-100",
                color === "emerald" && "bg-emerald-50 border-emerald-100",
                color === "indigo"  && "bg-indigo-50  border-indigo-100",
              )}>
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2",
                color === "red"     && "bg-red-100     text-red-600",
                color === "amber"   && "bg-amber-100   text-amber-600",
                color === "emerald" && "bg-emerald-100 text-emerald-600",
                color === "indigo"  && "bg-indigo-100  text-indigo-600",
              )}><Icon className="w-4 h-4" /></div>
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-0.5",
                color === "red" && "text-red-500", color === "amber" && "text-amber-500",
                color === "emerald" && "text-emerald-500", color === "indigo" && "text-indigo-500",
              )}>{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-9 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search tickets…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-50 border-slate-200 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tickets list */}
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-16 text-center">
            <MessageSquare className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-500">No tickets found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
            {filtered.map((t: TicketData, i) => {
              const stMeta = STATUS_META[t.status] ?? STATUS_META.open;
              return (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.subject}</p>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.medium)}>
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.creatorName} {t.creatorDept && `· ${t.creatorDept}`} · {timeAgo(t.createdAt)}
                      {t._count?.messages ? ` · ${t._count.messages} replies` : ""}
                    </p>
                  </div>

                  {/* Assign to */}
                  <select aria-label="Assign to" className="hidden sm:block h-8 px-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={t.assignedToId ?? ""}
                    onChange={(e) => updateTicket.mutate({ id: t.id, assignedToId: e.target.value || null })}>
                    <option value="">Unassigned</option>
                    {admins.map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                  </select>

                  {/* Status change */}
                  <select aria-label="Update status" className="h-8 px-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={t.status}
                    onChange={(e) => updateTicket.mutate({ id: t.id, status: e.target.value })}>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("w-2 h-2 rounded-full", stMeta.dot)} />
                    <span className="text-xs text-slate-500 hidden sm:inline">{stMeta.label}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
