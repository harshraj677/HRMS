"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Search, Filter } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, timeAgo } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const MODULE_COLORS: Record<string, string> = {
  auth:        "bg-indigo-50  text-indigo-700",
  employee:    "bg-violet-50  text-violet-700",
  payroll:     "bg-emerald-50 text-emerald-700",
  leave:       "bg-amber-50   text-amber-700",
  recruitment: "bg-sky-50     text-sky-700",
  helpdesk:    "bg-rose-50    text-rose-700",
  documents:   "bg-teal-50    text-teal-700",
  exit:        "bg-orange-50  text-orange-700",
  system:      "bg-slate-100  text-slate-600",
};

const MODULES = ["all","auth","employee","payroll","leave","recruitment","helpdesk","documents","exit","system"];

function useActivityLogs(mod: string) {
  return useQuery({
    queryKey: ["activity-logs", mod],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (mod !== "all") p.set("module", mod);
      const res = await fetch(`/api/activity-logs?${p.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).logs as any[];
    },
  });
}

export default function ActivityLogsPage() {
  const [mod,     setMod]     = useState("all");
  const [search,  setSearch]  = useState("");
  const { data: logs, isLoading } = useActivityLogs(mod);

  const filtered = (logs ?? []).filter((l) =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.userName?.toLowerCase().includes(search.toLowerCase()) ||
    l.entityName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Activity Logs</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track user actions across all modules</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-9 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search by action, user or entity…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={mod} onValueChange={setMod}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-50 border-slate-200 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODULES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m === "all" ? "All Modules" : m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <Activity className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No activity logs yet</p>
            <p className="text-xs text-slate-400 mt-1">Actions are logged automatically as users interact with the platform</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {filtered.map((log, i) => (
                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <div className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0",
                    MODULE_COLORS[log.module] ?? MODULE_COLORS.system)}>
                    {log.module}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{log.action}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {log.userName}
                      {log.entityName && <span className="text-slate-500"> → {log.entityName}</span>}
                      {log.detail && <span className="italic"> · {log.detail}</span>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-400">{timeAgo(log.createdAt)}</p>
                    {log.ipAddress && log.ipAddress !== "unknown" && (
                      <p className="text-[10px] text-slate-300 font-mono">{log.ipAddress}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
