import { Circle, Clock, Eye, CheckCircle2, Ban, PauseCircle, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/hooks/useTasks";

export const TASK_STATUS_META: Record<TaskStatus, { label: string; icon: LucideIcon; color: string }> = {
  todo:          { label: "To Do",        icon: Circle,       color: "bg-slate-100 text-slate-600" },
  in_progress:   { label: "In Progress",  icon: Clock,        color: "bg-sky-50 text-sky-700" },
  under_review:  { label: "Under Review", icon: Eye,          color: "bg-purple-50 text-purple-700" },
  completed:     { label: "Completed",    icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
  blocked:       { label: "Blocked",      icon: Ban,          color: "bg-red-50 text-red-700" },
  on_hold:       { label: "On Hold",      icon: PauseCircle,  color: "bg-amber-50 text-amber-700" },
  cancelled:     { label: "Cancelled",    icon: XCircle,      color: "bg-slate-100 text-slate-500" },
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = TASK_STATUS_META[status] ?? TASK_STATUS_META.todo;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", meta.color, className)}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}
