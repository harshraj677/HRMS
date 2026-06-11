import { ArrowDown, ArrowRight, ArrowUp, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/hooks/useTasks";

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; icon: LucideIcon; color: string }> = {
  low:      { label: "Low",      icon: ArrowDown,     color: "bg-slate-100 text-slate-600" },
  medium:   { label: "Medium",   icon: ArrowRight,    color: "bg-sky-50 text-sky-700" },
  high:     { label: "High",     icon: ArrowUp,       color: "bg-amber-50 text-amber-700" },
  critical: { label: "Critical", icon: AlertTriangle, color: "bg-red-50 text-red-700" },
};

export function TaskPriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const meta = TASK_PRIORITY_META[priority] ?? TASK_PRIORITY_META.medium;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", meta.color, className)}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}
