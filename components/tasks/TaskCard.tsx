import { forwardRef, type HTMLAttributes } from "react";
import Link from "next/link";
import { MessageSquare, CalendarDays, AlertCircle } from "lucide-react";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { ProgressRing } from "./ProgressRing";
import type { TaskData } from "@/hooks/useTasks";

interface TaskCardProps extends HTMLAttributes<HTMLDivElement> {
  task: TaskData;
  dragging?: boolean;
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, dragging, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 cursor-grab active:cursor-grabbing touch-none",
          dragging && "opacity-50 ring-2 ring-indigo-300",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/tasks/${task.id}`} className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-2">
            {task.title}
          </Link>
          <ProgressRing progress={task.progress} size={32} strokeWidth={3} showLabel={false} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <TaskPriorityBadge priority={task.priority} />
          {task.isOverdue && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700">
              <AlertCircle className="w-3.5 h-3.5" /> Overdue
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
              {getInitials(task.assigneeName || "?")}
            </div>
            <span className="truncate max-w-[100px]">{task.assigneeName}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {formatDate(task.dueDate, "MMM dd")}
              </span>
            )}
            {(task.commentCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {task.commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);
TaskCard.displayName = "TaskCard";
