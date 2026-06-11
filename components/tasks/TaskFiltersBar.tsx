"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUSES, TASK_PRIORITIES, type TaskFilters } from "@/hooks/useTasks";
import { TASK_STATUS_META } from "./TaskStatusBadge";
import { TASK_PRIORITY_META } from "./TaskPriorityBadge";

const DEPARTMENTS = ["Management", "Programs", "Design", "Incubation", "Content", "Engineering", "Marketing", "Operations"];

export function TaskFiltersBar({
  filters,
  onChange,
  showStatus = true,
  showScope = true,
}: {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  showStatus?: boolean;
  showScope?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search tasks…"
            className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
            value={filters.search ?? ""}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>

        {showStatus && (
          <Select value={filters.status ?? "all"} onValueChange={(v) => onChange({ ...filters, status: v })}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-50 border-slate-200 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{TASK_STATUS_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filters.priority ?? "all"} onValueChange={(v) => onChange({ ...filters, priority: v })}>
          <SelectTrigger className="w-full sm:w-40 h-10 bg-slate-50 border-slate-200 rounded-xl">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{TASK_PRIORITY_META[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.department ?? "all"} onValueChange={(v) => onChange({ ...filters, department: v })}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-50 border-slate-200 rounded-xl">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showScope && (
          <Select value={filters.scope ?? "all"} onValueChange={(v) => onChange({ ...filters, scope: v as TaskFilters["scope"] })}>
            <SelectTrigger className="w-full sm:w-40 h-10 bg-slate-50 border-slate-200 rounded-xl">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="assigned">Assigned to Me</SelectItem>
              <SelectItem value="created">Created by Me</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
