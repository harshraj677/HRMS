"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, CalendarCheck, ClipboardList, Clock,
  CheckCircle2, AlertTriangle, Search,
  UserCheck, Mail, Phone,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getDepartmentColor, getInitials, formatDate } from "@/lib/utils";
import { useMyTeam } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { useApproveLeave, useRejectLeave } from "@/hooks/useLeave";
import { useLeaveRequests } from "@/hooks/useLeave";

const STATUS_META: Record<string, { label: string; dot: string; bg: string }> = {
  present:  { label: "Present",  dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700" },
  late:     { label: "Late",     dot: "bg-amber-500",   bg: "bg-amber-50 text-amber-700"   },
  absent:   { label: "Absent",   dot: "bg-red-400",     bg: "bg-red-50 text-red-700"       },
  "on-leave":{ label: "On Leave",dot: "bg-indigo-400",  bg: "bg-indigo-50 text-indigo-700" },
  default:  { label: "No Data",  dot: "bg-slate-300",   bg: "bg-slate-100 text-slate-500"  },
};

export default function MyTeamPage() {
  const { data: user } = useAuth();
  const { data: team, isLoading } = useMyTeam();
  const { data: leaves } = useLeaveRequests();
  const approveLeave = useApproveLeave();
  const rejectLeave  = useRejectLeave();
  const [search, setSearch] = useState("");

  const isAdmin = user?.role === "admin";

  const filtered = (team ?? []).filter((m) =>
    !search ||
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.department?.toLowerCase().includes(search.toLowerCase())
  );

  // Team stats
  const totalPresent = filtered.filter((m) =>
    m.todayAttendance && ["present","late"].includes(m.todayAttendance.status)
  ).length;
  const totalAbsent  = filtered.filter((m) => !m.todayAttendance).length;
  const totalPending = filtered.reduce((s, m) => s + m.pendingLeaves, 0);

  // Pending leave requests for team members
  const teamIds = new Set((team ?? []).map((m) => m.id));
  const pendingLeaves = (leaves ?? []).filter((l) =>
    l.status === "pending" && teamIds.has(l.employeeId)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {isAdmin ? "All Employees" : "My Team"}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">{filtered.length} members</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users,         label: "Total",       value: filtered.length,   color: "indigo" },
          { icon: UserCheck,     label: "Present Today",value: totalPresent,      color: "emerald" },
          { icon: AlertTriangle, label: "Absent Today", value: totalAbsent,       color: "amber" },
          { icon: ClipboardList, label: "Pending Leave",value: totalPending,      color: "violet" },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={cn("rounded-2xl border p-4",
              color === "indigo"  && "bg-indigo-50  border-indigo-100",
              color === "emerald" && "bg-emerald-50 border-emerald-100",
              color === "amber"   && "bg-amber-50   border-amber-100",
              color === "violet"  && "bg-violet-50  border-violet-100",
            )}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2",
              color === "indigo"  && "bg-indigo-100  text-indigo-600",
              color === "emerald" && "bg-emerald-100 text-emerald-600",
              color === "amber"   && "bg-amber-100   text-amber-600",
              color === "violet"  && "bg-violet-100  text-violet-600",
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-0.5",
              color === "indigo" && "text-indigo-500", color === "emerald" && "text-emerald-500",
              color === "amber" && "text-amber-500",   color === "violet" && "text-violet-500",
            )}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search team members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Team grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20">
          <Users className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No team members</p>
          {!isAdmin && <p className="text-xs text-slate-400 mt-1">No employees report to you yet</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => {
            const att = m.todayAttendance;
            const statusKey = att?.status ?? "default";
            const meta = STATUS_META[statusKey] ?? STATUS_META.default;

            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all overflow-hidden">
                {/* Attendance bar */}
                <div className={cn("h-1", att ? "bg-emerald-400" : "bg-slate-200")} />

                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-11 w-11 shrink-0 ring-2 ring-slate-100">
                      {m.profile?.avatar
                        ? <AvatarImage src={m.profile.avatar} alt={m.fullName} />
                        : <AvatarFallback className={cn("text-xs font-bold", getDepartmentColor(m.department ?? ""))}>
                            {getInitials(m.fullName)}
                          </AvatarFallback>
                      }
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{m.fullName}</p>
                      <p className="text-xs text-slate-400">{m.position ?? "—"}</p>
                    </div>
                    <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", meta.bg)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />{meta.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{m.email}</span>
                    </div>
                    {m.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {m.phone}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-xs">
                    <span className="text-slate-400">
                      Leave: <span className="font-semibold text-slate-700">{m.leaveBalance}d</span>
                    </span>
                    {m.pendingLeaves > 0 && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                        {m.pendingLeaves} pending leave
                      </span>
                    )}
                    {att?.checkIn && (
                      <span className="text-slate-400">In: {new Date(att.checkIn).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pending leave approvals for team */}
      {pendingLeaves.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Pending Leave Requests</h3>
            <p className="text-xs text-slate-400 mt-0.5">{pendingLeaves.length} awaiting approval</p>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingLeaves.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{l.fullName}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(l.startDate)} → {formatDate(l.endDate)} · {l.days}d · {l.category}
                  </p>
                  <p className="text-xs text-slate-500 italic mt-0.5">{l.reason}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" disabled={approveLeave.isPending}
                    onClick={() => approveLeave.mutate(l.id)}
                    className="h-7 px-3 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all">
                    Approve
                  </button>
                  <button type="button" disabled={rejectLeave.isPending}
                    onClick={() => rejectLeave.mutate(l.id)}
                    className="h-7 px-3 rounded-lg text-xs font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50 transition-all">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
