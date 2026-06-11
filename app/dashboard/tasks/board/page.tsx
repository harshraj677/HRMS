"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, ListChecks, KanbanSquare, CalendarRange, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks, useUpdateTask, type TaskData, type TaskStatus } from "@/hooks/useTasks";
import { TaskFiltersBar } from "@/components/tasks/TaskFiltersBar";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TASK_STATUS_META } from "@/components/tasks/TaskStatusBadge";
import { cn } from "@/lib/utils";
import type { TaskFilters } from "@/hooks/useTasks";

const VIEW_TABS = [
  { label: "My Tasks", href: "/dashboard/tasks", icon: ListChecks },
  { label: "Board", href: "/dashboard/tasks/board", icon: KanbanSquare },
  { label: "Calendar", href: "/dashboard/tasks/calendar", icon: CalendarRange },
];

const BOARD_COLUMNS: { id: TaskStatus | "other"; label: string; statuses: TaskStatus[] }[] = [
  { id: "todo", label: TASK_STATUS_META.todo.label, statuses: ["todo"] },
  { id: "in_progress", label: TASK_STATUS_META.in_progress.label, statuses: ["in_progress"] },
  { id: "under_review", label: TASK_STATUS_META.under_review.label, statuses: ["under_review"] },
  { id: "completed", label: TASK_STATUS_META.completed.label, statuses: ["completed"] },
  { id: "other", label: "Other", statuses: ["blocked", "on_hold", "cancelled"] },
];

function SortableTaskCard({ task }: { task: TaskData }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <TaskCard
      ref={setNodeRef}
      style={style}
      task={task}
      dragging={isDragging}
      {...attributes}
      {...listeners}
    />
  );
}

function BoardColumn({ column, tasks }: { column: typeof BOARD_COLUMNS[number]; tasks: TaskData[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="flex flex-col w-72 sm:w-80 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-bold text-slate-700">{column.label}</h3>
        <span className="text-xs font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-3 rounded-2xl border border-dashed p-2.5 min-h-[200px] transition-colors",
          isOver ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 bg-slate-50/50"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">No tasks</p>
        )}
      </div>
    </div>
  );
}

export default function TaskBoardPage() {
  const [filters, setFilters] = useState<TaskFilters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const { data: tasks, isLoading } = useTasks(filters);
  const updateTask = useUpdateTask();

  const [localTasks, setLocalTasks] = useState<TaskData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (tasks) setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const grouped = useMemo(() => {
    const map = new Map<string, TaskData[]>();
    for (const col of BOARD_COLUMNS) map.set(col.id, []);
    for (const task of localTasks) {
      const col = BOARD_COLUMNS.find((c) => c.statuses.includes(task.status));
      const key = col?.id ?? "other";
      map.get(key)!.push(task);
    }
    return map;
  }, [localTasks]);

  const activeTask = activeId ? localTasks.find((t) => t.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = String(active.id);
    const task = localTasks.find((t) => t.id === taskId);
    if (!task) return;

    let targetColumnId = String(over.id);
    // If dropped over a card rather than the column container, find that card's column.
    if (!BOARD_COLUMNS.some((c) => c.id === targetColumnId)) {
      const overTask = localTasks.find((t) => t.id === targetColumnId);
      const overCol = overTask ? BOARD_COLUMNS.find((c) => c.statuses.includes(overTask.status)) : null;
      targetColumnId = overCol?.id ?? "other";
    }

    const targetColumn = BOARD_COLUMNS.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    // If the task is already in this column's status group, no status change needed.
    if (targetColumn.statuses.includes(task.status)) return;

    const newStatus: TaskStatus = targetColumn.id === "other" ? "on_hold" : (targetColumn.id as TaskStatus);

    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, progress: newStatus === "completed" ? 100 : t.progress } : t)));

    updateTask.mutate({ id: taskId, status: newStatus });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Task Board</h2>
          <p className="text-sm text-slate-500 mt-0.5">Drag cards to update status</p>
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
          const active = tab.href === "/dashboard/tasks/board";
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

      <TaskFiltersBar filters={filters} onChange={setFilters} showStatus={false} />

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-72 sm:w-80 shrink-0 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      ) : localTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-600">No tasks found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new task</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {BOARD_COLUMNS.map((col) => (
              <BoardColumn key={col.id} column={col} tasks={grouped.get(col.id) ?? []} />
            ))}
          </div>
          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} dragging />}
          </DragOverlay>
        </DndContext>
      )}

      <TaskFormModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
