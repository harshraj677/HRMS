"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus, ListChecks, KanbanSquare, CalendarRange, Clock, CheckCircle2,
  AlertCircle, ClipboardList, MessageSquare, CalendarDays, TrendingUp, Award,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, useTaskAnalytics, type TaskFilters } from "@/hooks/useTasks";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { TaskFiltersBar } from "@/components/tasks/TaskFiltersBar";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { ProgressRing } from "@/components/tasks/ProgressRing";
import { cn, formatDate, getInitials } from "@/lib/utils";

const VIEW_TABS = [
  { label: "My Tasks", href: "/dashboard/tasks", icon: ListChecks },
  { label: "Board", href: "/dashboard/tasks/board", icon: KanbanSquare },
  { label: "Calendar", href: "/dashboard/tasks/calendar", icon: CalendarRange },
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex justify-between gap-4 text-slate-600">
          <span>{p.name}</span>
          <strong className="text-slate-900">{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: tasks, isLoading } = useTasks(filters);
  const { data: analytics } = useTaskAnalytics();

  const total = tasks?.length ?? 0;
  const inProgress = tasks?.filter((t) => t.status === "in_progress").length ?? 0;
  const completed = tasks?.filter((t) => t.status === "completed").length ?? 0;
  const overdue = tasks?.filter((t) => t.isOverdue).length ?? 0;

  const kpis = [
    { label: "Total Tasks", value: total, icon: ClipboardList, color: "indigo" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "sky" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "emerald" },
    { label: "Overdue", value: overdue, icon: AlertCircle, color: "red" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tasks</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} task{total === 1 ? "" : "s"} in view
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-sm shadow-indigo-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.href === "/dashboard/tasks";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all shrink-0",
                active
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                  : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "rounded-2xl border p-4",
              color === "red" && "bg-red-50 border-red-100",
              color === "sky" && "bg-sky-50 border-sky-100",
              color === "emerald" && "bg-emerald-50 border-emerald-100",
              color === "indigo" && "bg-indigo-50 border-indigo-100"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center mb-2",
              color === "red" && "bg-red-100 text-red-600",
              color === "sky" && "bg-sky-100 text-sky-600",
              color === "emerald" && "bg-emerald-100 text-emerald-600",
              color === "indigo" && "bg-indigo-100 text-indigo-600"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className={cn(
              "text-[10px] font-semibold uppercase tracking-widest mt-0.5",
              color === "red" && "text-red-500",
              color === "sky" && "text-sky-500",
              color === "emerald" && "text-emerald-500",
              color === "indigo" && "text-indigo-500"
            )}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <TaskFiltersBar filters={filters} onChange={setFilters} />

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
            </div>
          ))}
        </div>
      ) : tasks?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-600">No tasks found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new task</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {tasks?.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/dashboard/tasks/${task.id}`} className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{task.title}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <TaskStatusBadge status={task.status} />
                        <TaskPriorityBadge priority={task.priority} />
                        {task.isOverdue && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700">
                            <AlertCircle className="w-3.5 h-3.5" /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <ProgressRing progress={task.progress} size={36} strokeWidth={3} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
                    <span className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {getInitials(task.assigneeName || "?")}
                      </div>
                      {task.assigneeName}
                    </span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(task.dueDate, "MMM dd")}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Task</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assignee</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Priority</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Progress</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Due Date</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks?.map((task, i) => (
                  <motion.tr
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                    className="border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                  >
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1 max-w-xs">{task.title}</p>
                      {task.department && <p className="text-xs text-slate-400 mt-0.5">{task.department}</p>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {getInitials(task.assigneeName || "?")}
                        </div>
                        <span className="text-sm text-slate-600 truncate max-w-[120px]">{task.assigneeName}</span>
                      </div>
                    </TableCell>
                    <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                    <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProgressRing progress={task.progress} size={32} strokeWidth={3} showLabel={false} />
                        <span className="text-xs font-semibold text-slate-500">{task.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span className={cn("text-sm flex items-center gap-1.5", task.isOverdue ? "text-red-600 font-semibold" : "text-slate-500")}>
                          <CalendarDays className="w-3.5 h-3.5" />
                          {formatDate(task.dueDate, "MMM dd, yyyy")}
                        </span>
                      ) : <span className="text-sm text-slate-300">—</span>}
                    </TableCell>
                    <TableCell>
                      {(task.commentCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MessageSquare className="w-3.5 h-3.5" /> {task.commentCount}
                        </span>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Admin analytics */}
      {isAdmin && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {analytics.byDepartment.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Department Completion Rate
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.byDepartment} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="%" />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="completionRate" fill="#6366f1" radius={[4, 4, 0, 0]} name="Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" /> Top Performers
              </h3>
              <div className="space-y-2">
                {analytics.topPerformers.slice(0, 5).map((e) => (
                  <div key={e.employeeId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {getInitials(e.fullName)}
                      </div>
                      {e.fullName}
                    </span>
                    <span className="text-emerald-600 font-semibold">{e.completionRate}%</span>
                  </div>
                ))}
                {analytics.topPerformers.length === 0 && (
                  <p className="text-xs text-slate-400">No data yet.</p>
                )}
              </div>
            </div>

            {analytics.needsAttention.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" /> Needs Attention
                </h3>
                <div className="space-y-2">
                  {analytics.needsAttention.slice(0, 5).map((e) => (
                    <div key={e.employeeId} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-700">
                        <div className="h-7 w-7 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {getInitials(e.fullName)}
                        </div>
                        {e.fullName}
                      </span>
                      <span className="text-red-600 font-semibold">{e.overdue} overdue</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <TaskFormModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
