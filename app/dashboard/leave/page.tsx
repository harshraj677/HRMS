"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useLeaveRequests,
  useApproveLeave,
  useRejectLeave,
} from "@/hooks/useLeave";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { formatDaysLabel } from "@/lib/leaveCalculations";
import { ApplyLeaveModal } from "@/components/leave/ApplyLeaveModal";
import type { LeaveData } from "@/hooks/useLeave";

// ─── Status chip ──────────────────────────────────────────────────────────────

const statusMeta: Record<
  string,
  { label: string; icon: React.ElementType; cls: string; dot: string }
> = {
  pending:  { label: "Pending",  icon: Clock,       cls: "bg-amber-50 text-amber-700 border-amber-200",         dot: "bg-amber-500"   },
  approved: { label: "Approved", icon: CheckCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-200",   dot: "bg-emerald-500" },
  rejected: { label: "Rejected", icon: XCircle,     cls: "bg-red-50 text-red-700 border-red-200",               dot: "bg-red-500"     },
};

function StatusChip({ status }: { status: string }) {
  const m = statusMeta[status] ?? {
    label: status,
    icon:  AlertCircle,
    cls:   "bg-slate-50 text-slate-600 border-slate-200",
    dot:   "bg-slate-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize",
        m.cls
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

// ─── Duration badge ───────────────────────────────────────────────────────────

function DurationBadge({ leave }: { leave: LeaveData }) {
  const days = leave.totalDays || leave.days;
  const colorCls =
    leave.durationType === "half_day"
      ? "text-violet-600"
      : leave.durationType === "custom_hours"
      ? "text-cyan-600"
      : "text-indigo-600";
  return (
    <span className={cn("text-xs font-semibold mt-0.5", colorCls)}>
      {formatDaysLabel(days)}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["all", "pending", "approved", "rejected"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const { data: user }         = useAuth();
  const isAdmin                = user?.role === "admin";
  const { data: leaveRequests, isLoading } = useLeaveRequests();
  const approveLeave = useApproveLeave();
  const rejectLeave  = useRejectLeave();

  const tabCount = (tab: string) =>
    tab === "all"
      ? leaveRequests?.length ?? 0
      : leaveRequests?.filter((l) => l.status === tab).length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leave Requests</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Manage and action team leave requests"
              : "Apply for time off and track your requests (max 18 days / year)"}
          </p>
        </div>

        {/* The apply button + full modal live here */}
        <ApplyLeaveModal />
      </div>

      {/* ── Leave list with tabs ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="all">
          <TabsList className="bg-white border border-slate-200 shadow-sm rounded-xl p-1 gap-0.5">
            {TABS.map((tab) => {
              const count = tabCount(tab);
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-lg capitalize text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  {tab === "all"
                    ? "All"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {count > 0 && tab !== "all" && (
                    <span
                      className={cn(
                        "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        tab === "pending"  && "bg-amber-100 text-amber-700",
                        tab === "approved" && "bg-emerald-100 text-emerald-700",
                        tab === "rejected" && "bg-red-100 text-red-700"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TABS.map((tab) => {
            const filtered =
              leaveRequests?.filter(
                (l) => tab === "all" || l.status === tab
              ) ?? [];

            return (
              <TabsContent key={tab} value={tab} className="mt-3">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {isLoading ? (
                    <div className="p-5 space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl border border-slate-100"
                        >
                          <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
                            <div className="h-2.5 bg-slate-100 rounded animate-pulse w-48" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* ── Mobile card view ──────────────────────── */}
                      <div className="md:hidden divide-y divide-slate-50">
                        {filtered.length === 0 ? (
                          <div className="flex flex-col items-center py-14 px-6 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                              <FileText className="w-7 h-7 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">
                              No {tab === "all" ? "" : tab} requests
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Leave requests will appear here
                            </p>
                          </div>
                        ) : (
                          filtered.map((leave, i) => (
                            <motion.div
                              key={leave.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.04 }}
                              className="p-4 hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                {isAdmin ? (
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="h-8 w-8 shrink-0">
                                      <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                                        {getInitials(leave.fullName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">
                                        {leave.fullName}
                                      </p>
                                      {leave.department && (
                                        <p className="text-xs text-slate-400">
                                          {leave.department}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                      {formatDate(leave.startDate)}
                                      {leave.startDate !== leave.endDate &&
                                        ` → ${formatDate(leave.endDate)}`}
                                    </p>
                                    <DurationBadge leave={leave} />
                                  </div>
                                )}
                                <StatusChip status={leave.status} />
                              </div>

                              {isAdmin && (
                                <div className="mb-2">
                                  <p className="text-sm font-medium text-slate-700">
                                    {formatDate(leave.startDate)}
                                    {leave.startDate !== leave.endDate &&
                                      ` → ${formatDate(leave.endDate)}`}
                                  </p>
                                  <DurationBadge leave={leave} />
                                </div>
                              )}

                              <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                                {leave.reason}
                              </p>

                              {isAdmin && tab === "pending" && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="flex-1 h-8 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                                    disabled={approveLeave.isPending}
                                    onClick={() => approveLeave.mutate(leave.id)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="flex-1 h-8 rounded-lg border border-red-200 text-red-600 text-xs font-semibold bg-white hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                                    disabled={rejectLeave.isPending}
                                    onClick={() => rejectLeave.mutate(leave.id)}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          ))
                        )}
                      </div>

                      {/* ── Desktop table view ────────────────────── */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                              {isAdmin && (
                                <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Employee
                                </TableHead>
                              )}
                              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                Duration
                              </TableHead>
                              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                                Reason
                              </TableHead>
                              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                                Applied
                              </TableHead>
                              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                Status
                              </TableHead>
                              {isAdmin && tab === "pending" && (
                                <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Actions
                                </TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((leave, i) => (
                              <motion.tr
                                key={leave.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="border-slate-100 hover:bg-slate-50/60 transition-colors"
                              >
                                {isAdmin && (
                                  <TableCell>
                                    <div className="flex items-center gap-2.5">
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                                          {getInitials(leave.fullName)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                          {leave.fullName}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                          {leave.department ?? ""}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                )}
                                <TableCell>
                                  <p className="text-sm font-semibold text-slate-700">
                                    {formatDate(leave.startDate)}
                                  </p>
                                  {leave.startDate !== leave.endDate && (
                                    <p className="text-xs text-slate-400">
                                      to {formatDate(leave.endDate)}
                                    </p>
                                  )}
                                  <DurationBadge leave={leave} />
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 hidden md:table-cell max-w-[200px] truncate">
                                  {leave.reason}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 hidden sm:table-cell">
                                  {formatDate(leave.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <StatusChip status={leave.status} />
                                </TableCell>
                                {isAdmin && tab === "pending" && (
                                  <TableCell>
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        className="h-7 px-3 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                                        disabled={approveLeave.isPending}
                                        onClick={() =>
                                          approveLeave.mutate(leave.id)
                                        }
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        className="h-7 px-3 text-xs font-semibold rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                                        disabled={rejectLeave.isPending}
                                        onClick={() =>
                                          rejectLeave.mutate(leave.id)
                                        }
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </TableCell>
                                )}
                              </motion.tr>
                            ))}
                            {filtered.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={
                                    isAdmin
                                      ? tab === "pending"
                                        ? 6
                                        : 5
                                      : 4
                                  }
                                  className="text-center py-14"
                                >
                                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                  <p className="text-sm text-slate-400">
                                    No{" "}
                                    {tab === "all" ? "" : tab} leave requests
                                    found
                                  </p>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </motion.div>
    </div>
  );
}
