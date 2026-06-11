"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail, ClipboardCheck, CheckCircle2, XCircle, UserPlus, Users,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn, getInitials, getDepartmentColor, getRoleBadgeColor, formatDate } from "@/lib/utils";
import { getApprovalStatusBadge } from "@/lib/onboarding";
import { useOnboardingQueue, type OnboardingEmployee } from "@/hooks/useOnboarding";
import ProfileReviewPanel from "./ProfileReviewPanel";

const FILTERS = [
  { key: "PROFILE_SUBMITTED", label: "Submitted" },
  { key: "ALL", label: "All" },
  { key: "INVITED", label: "Invited" },
  { key: "PROFILE_IN_PROGRESS", label: "In Progress" },
  { key: "ACTIVE", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
] as const;

function StatCard({ icon: Icon, label, value, color, delay }: {
  icon: typeof Users; label: string; value: number; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </motion.div>
  );
}

function matchesFilter(emp: OnboardingEmployee, filter: string) {
  if (filter === "ALL") return true;
  if (filter === "INVITED") return ["PENDING_INVITATION", "INVITED"].includes(emp.approvalStatus ?? "");
  return emp.approvalStatus === filter;
}

export default function OnboardingPage() {
  const { data, isLoading } = useOnboardingQueue();
  const [filter, setFilter] = useState<string>("PROFILE_SUBMITTED");
  const [selected, setSelected] = useState<OnboardingEmployee | null>(null);

  const employees = data?.employees ?? [];
  const stats = data?.stats;
  const filtered = employees.filter((e) => matchesFilter(e, filter));

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employee Onboarding</h2>
          <p className="text-sm text-slate-500 mt-0.5">Review and approve new employee profiles</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard icon={Mail} label="Pending Invitations" value={stats?.pendingInvitations ?? 0} color="bg-sky-100 text-sky-600" delay={0} />
          <StatCard icon={ClipboardCheck} label="Pending Profile Reviews" value={stats?.pendingReviews ?? 0} color="bg-violet-100 text-violet-600" delay={0.04} />
          <StatCard icon={CheckCircle2} label="Approved Employees" value={stats?.approved ?? 0} color="bg-emerald-100 text-emerald-600" delay={0.08} />
          <StatCard icon={XCircle} label="Rejected Profiles" value={stats?.rejected ?? 0} color="bg-red-100 text-red-600" delay={0.12} />
          <StatCard icon={UserPlus} label="Recently Joined" value={stats?.recentlyJoined ?? 0} color="bg-indigo-100 text-indigo-600" delay={0.16} />
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-8 px-4 rounded-xl text-xs font-semibold border transition-all",
                filter === f.key
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
              <ClipboardCheck className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Nothing here</p>
            <p className="text-xs text-slate-400 mt-1">No employees match this filter right now</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filtered.map((emp, i) => {
                const badge = getApprovalStatusBadge(emp.approvalStatus);
                return (
                  <motion.button
                    key={emp.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(emp)}
                    className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 shrink-0">
                        {emp.profile?.avatar && <AvatarImage src={emp.profile.avatar} alt={emp.fullName} />}
                        <AvatarFallback className="text-sm bg-indigo-100 text-indigo-700 font-bold">
                          {getInitials(emp.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 truncate">{emp.fullName}</p>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", badge.className)}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{emp.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {emp.department && (
                            <span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-full", getDepartmentColor(emp.department))}>
                              {emp.department}
                            </span>
                          )}
                          <span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-full capitalize", getRoleBadgeColor(emp.role))}>
                            {emp.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Employee</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Department</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Joined</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp, i) => {
                    const badge = getApprovalStatusBadge(emp.approvalStatus);
                    return (
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.025 }}
                        onClick={() => setSelected(emp)}
                        className="border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {emp.profile?.avatar && <AvatarImage src={emp.profile.avatar} alt={emp.fullName} />}
                              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-semibold">
                                {getInitials(emp.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{emp.fullName}</p>
                              <p className="text-xs text-slate-400">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {emp.department ? (
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", getDepartmentColor(emp.department))}>
                              {emp.department}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full capitalize", getRoleBadgeColor(emp.role))}>
                            {emp.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", badge.className)}>
                            {badge.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(emp.createdAt)}</TableCell>
                        <TableCell>
                          <button type="button" onClick={() => setSelected(emp)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">
                            Review →
                          </button>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <ProfileReviewPanel
          employee={selected}
          open={!!selected}
          onOpenChange={(open) => { if (!open) setSelected(null); }}
        />
      </div>
    </RoleGuard>
  );
}
