"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, ListChecks, KanbanSquare, CalendarRange,
  AlertCircle, Clock, CalendarCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks, type TaskData, type TaskFilters } from "@/hooks/useTasks";
import { TaskFiltersBar } from "@/components/tasks/TaskFiltersBar";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TASK_PRIORITY_META } from "@/components/tasks/TaskPriorityBadge";
import { cn } from "@/lib/utils";

const VIEW_TABS = [
  { label: "My Tasks", href: "/dashboard/tasks", icon: ListChecks },
  { label: "Board", href: "/dashboard/tasks/board", icon: KanbanSquare },
  { label: "Calendar", href: "/dashboard/tasks/calendar", icon: CalendarRange },
];

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-sky-500",
  high: "bg-amber-500",
  critical: "bg-red-500",
};

export default function TaskCalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [filters, setFilters] = useState<TaskFilters>({});
  const [modalOpen, setModalOpen] = useState(false);

  const rangeStart = startOfWeek(startOfMonth(month));
  const rangeEnd = endOfWeek(endOfMonth(month));

  const { data: tasks, isLoading } = useTasks({
    ...filters,
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
  });

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskData[]>();
    for (const task of tasks ?? []) {
      if (!task.dueDate) continue;
      const key = format(parseISO(task.dueDate), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks]);

  const now = new Date();
  const upcoming = (tasks ?? []).filter((t) => t.dueDate && !t.isOverdue && t.status !== "completed" && t.status !== "cancelled" && parseISO(t.dueDate) > now).length;
  const dueToday = (tasks ?? []).filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), now)).length;
  const overdue = (tasks ?? []).filter((t) => t.isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Task Calendar</h2>
          <p className="text-sm text-slate-500 mt-0.5">View tasks by due date</p>
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.href === "/dashboard/tasks/calendar";
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

      <TaskFiltersBar filters={filters} onChange={setFilters} showScope={false} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">{format(month, "MMMM yyyy")}</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMonth(new Date())}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {[...Array(35)].map((_, i) => <Skeleton key={i} className="h-20 sm:h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-1">{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayTasks = tasksByDay.get(key) ?? [];
                  const inMonth = isSameMonth(day, month);
                  const today = isToday(day);
                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-xl border p-1.5 min-h-[80px] sm:min-h-[96px] flex flex-col gap-1",
                        inMonth ? "bg-white border-slate-100" : "bg-slate-50/50 border-slate-50",
                        today && "ring-2 ring-indigo-400"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full shrink-0",
                        today ? "bg-indigo-600 text-white" : inMonth ? "text-slate-600" : "text-slate-300"
                      )}>
                        {format(day, "d")}
                      </span>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayTasks.slice(0, 3).map((task) => (
                          <Link
                            key={task.id}
                            href={`/dashboard/tasks/${task.id}`}
                            className={cn(
                              "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate hover:bg-slate-100 transition-colors",
                              task.isOverdue ? "text-red-700 bg-red-50" : "text-slate-600"
                            )}
                            title={task.title}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority])} />
                            <span className="truncate">{task.title}</span>
                          </Link>
                        ))}
                        {dayTasks.length > 3 && (
                          <p className="text-[10px] text-slate-400 px-1.5">+{dayTasks.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Sidebar legend */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><Clock className="w-4 h-4 text-sky-500" /> Upcoming</span>
              <span className="font-semibold text-slate-800">{upcoming}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><CalendarCheck className="w-4 h-4 text-indigo-500" /> Due Today</span>
              <span className="font-semibold text-slate-800">{dueToday}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600"><AlertCircle className="w-4 h-4 text-red-500" /> Overdue</span>
              <span className="font-semibold text-red-600">{overdue}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Priority Legend</h3>
            {(Object.keys(TASK_PRIORITY_META) as (keyof typeof TASK_PRIORITY_META)[]).map((p) => (
              <div key={p} className="flex items-center gap-2 text-xs text-slate-600">
                <span className={cn("w-2 h-2 rounded-full", PRIORITY_DOT[p])} />
                {TASK_PRIORITY_META[p].label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <TaskFormModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
