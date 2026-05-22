"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, CheckCircle2, XCircle, Monitor, Globe, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

interface LoginEntry {
  id: string;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  loginTime: string;
  success: boolean;
}

function useLoginHistory() {
  return useQuery<LoginEntry[]>({
    queryKey: ["auth", "login-history"],
    queryFn: async () => {
      const res = await fetch("/api/auth/login-history");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.history ?? [];
    },
  });
}

export default function SecurityPage() {
  const { data: history, isLoading } = useLoginHistory();

  const successCount = (history ?? []).filter((h) => h.success).length;
  const failedCount  = (history ?? []).filter((h) => !h.success).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Security</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your login history and session activity</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield,       label: "Total Logins",    value: history?.length ?? 0,  color: "indigo" },
          { icon: CheckCircle2, label: "Successful",       value: successCount,           color: "emerald" },
          { icon: XCircle,      label: "Failed Attempts",  value: failedCount,            color: "red" },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn("rounded-2xl border p-4 text-center",
              color === "indigo"  && "bg-indigo-50  border-indigo-100",
              color === "emerald" && "bg-emerald-50 border-emerald-100",
              color === "red"     && "bg-red-50     border-red-100",
            )}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2 mx-auto",
              color === "indigo"  && "bg-indigo-100  text-indigo-600",
              color === "emerald" && "bg-emerald-100 text-emerald-600",
              color === "red"     && "bg-red-100     text-red-600",
            )}><Icon className="w-4 h-4" /></div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-0.5",
              color === "indigo" && "text-indigo-500", color === "emerald" && "text-emerald-500", color === "red" && "text-red-500",
            )}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Login history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Recent Login Activity</h3>
          <p className="text-xs text-slate-400 mt-0.5">Last 30 login events</p>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (history?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Shield className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No login history available</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {(history ?? []).slice(0, 30).map((entry, i) => (
              <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 px-5 py-3.5">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  entry.success ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                  {entry.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {entry.success ? "Successful login" : "Failed attempt"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-400">
                    {entry.browser && <span className="flex items-center gap-0.5"><Monitor className="w-3 h-3" />{entry.browser}</span>}
                    {entry.ipAddress && <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" />{entry.ipAddress}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.loginTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDate(entry.loginTime)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Security tips */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white space-y-2">
        <div className="flex items-center gap-2 mb-3"><Shield className="w-5 h-5" /><p className="text-sm font-semibold">Security Tips</p></div>
        {[
          "Never share your password with anyone, including HR or IT",
          "Always log out on shared or public devices",
          "Contact IT immediately if you notice unfamiliar login activity",
        ].map((tip) => (
          <p key={tip} className="text-xs text-indigo-200 flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0 mt-1" />
            {tip}
          </p>
        ))}
      </div>
    </div>
  );
}
