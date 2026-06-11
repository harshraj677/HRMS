"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Pencil, Trash2, Paperclip, FileText, Loader2,
  CalendarDays, Building2, Tag, History, MessageSquare, ListChecks,
  Download, AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useTask, useUpdateTask, useDeleteTask, useTaskActivity, useAssignableEmployees,
  TASK_STATUSES, TASK_PROGRESS_STEPS, type TaskAttachment, type TaskStatus,
} from "@/hooks/useTasks";
import { TaskStatusBadge, TASK_STATUS_META } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { ProgressRing } from "@/components/tasks/ProgressRing";
import { TaskCommentThread } from "@/components/tasks/TaskCommentThread";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { cn, formatDate, timeAgo, getInitials } from "@/lib/utils";
import { toast } from "sonner";

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024; // 2MB

function fileToAttachment(file: File): Promise<TaskAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        url: reader.result as string,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "",
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data: user } = useAuth();
  const { data: task, isLoading } = useTask(id);
  const { data: activity } = useTaskActivity(id);
  const { data: employees } = useAssignableEmployees();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Task not found</p>
        <Link href="/dashboard/tasks" className="text-sm text-indigo-600 font-semibold mt-2">Back to Tasks</Link>
      </div>
    );
  }

  const userId = user?.id ? String(user.id) : "";
  const isAdmin = user?.role === "admin";
  const isAssigner = task.assignedById === userId;
  const isAssignee = task.assignedToId === userId;
  const isFullEdit = isAdmin || isAssigner;
  const canUpdate = isAdmin || isAssigner || isAssignee;

  async function handleStatusChange(status: string) {
    await updateTask.mutateAsync({ id, status: status as TaskStatus });
  }

  async function handleProgressChange(progress: number) {
    await updateTask.mutateAsync({ id, progress });
  }

  async function handleDelete() {
    await deleteTask.mutateAsync(id);
    router.push("/dashboard/tasks");
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const next: TaskAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          toast.error(`"${file.name}" exceeds the 2MB limit.`);
          continue;
        }
        next.push(await fileToAttachment(file));
      }
      if (next.length > 0) {
        await updateTask.mutateAsync({ id, appendAttachments: next });
        toast.success("Attachment uploaded.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link href="/dashboard/tasks" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </Link>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 break-words">{task.title}</h2>
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
          {isFullEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="w-full sm:w-auto overflow-x-auto">
              <TabsTrigger value="overview" className="gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Comments {task.comments?.length ? `(${task.comments.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Attachments</TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5"><History className="w-3.5 h-3.5" /> Activity</TabsTrigger>
              <TabsTrigger value="progress" className="gap-1.5"><History className="w-3.5 h-3.5" /> Progress History</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1.5">Description</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
                    {task.description || <span className="text-slate-400">No description provided.</span>}
                  </p>
                </div>

                {task.tags?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {canUpdate && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
                  <h3 className="text-sm font-semibold text-slate-700">Update Progress</h3>

                  <div className="flex items-center gap-4">
                    <ProgressRing progress={task.progress} size={56} strokeWidth={5} />
                    <div className="flex-1 flex flex-wrap gap-2">
                      {TASK_PROGRESS_STEPS.map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => handleProgressChange(step)}
                          disabled={updateTask.isPending}
                          className={cn(
                            "h-9 px-3 rounded-lg text-xs font-semibold transition-all",
                            task.progress === step
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {step}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</label>
                    <Select value={task.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{TASK_STATUS_META[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Comments */}
            <TabsContent value="comments">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <TaskCommentThread taskId={id} comments={task.comments ?? []} employees={employees ?? []} />
              </div>
            </TabsContent>

            {/* Attachments */}
            <TabsContent value="attachments">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                {canUpdate && (
                  <label className={cn(
                    "flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors",
                    uploading && "opacity-60 pointer-events-none"
                  )}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    {uploading ? "Uploading…" : "Attach file (max 2MB)"}
                    <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </label>
                )}

                {task.attachments?.length > 0 ? (
                  <ul className="space-y-2">
                    {task.attachments.map((a, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate flex-1 text-slate-600">{a.name}</span>
                        <span className="text-xs text-slate-400 shrink-0">{(a.size / 1024).toFixed(0)} KB</span>
                        <a href={a.url} download={a.name} className="text-slate-400 hover:text-indigo-600 shrink-0" aria-label={`Download ${a.name}`}>
                          <Download className="w-4 h-4" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">No attachments yet.</p>
                )}
              </div>
            </TabsContent>

            {/* Activity Timeline */}
            <TabsContent value="activity">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                {activity?.length ? (
                  <ul className="space-y-4">
                    {activity.map((entry) => (
                      <li key={entry.id} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(entry.userName || "?")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">{entry.userName}</span>{" "}
                            <span className="text-slate-500">{entry.action}</span>
                            {entry.detail && <span className="text-slate-500"> — {entry.detail}</span>}
                          </p>
                          <span className="text-xs text-slate-400">{timeAgo(entry.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">No activity recorded yet.</p>
                )}
              </div>
            </TabsContent>

            {/* Progress History */}
            <TabsContent value="progress">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                {task.progressLogs?.length ? (
                  <ul className="space-y-4">
                    {[...task.progressLogs].reverse().map((log) => (
                      <li key={log.id} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(log.changedByName || "?")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">{log.changedByName}</span>{" "}
                            <span className="text-slate-500">changed {log.fieldLabel.toLowerCase()} from</span>{" "}
                            <span className="font-medium">{log.oldLabel ?? "—"}</span>{" "}
                            <span className="text-slate-500">to</span>{" "}
                            <span className="font-medium">{log.newLabel ?? "—"}</span>
                          </p>
                          <span className="text-xs text-slate-400">{timeAgo(log.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">No progress history yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Details</h3>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Assigned To</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(task.assigneeName || "?")}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{task.assigneeName}</p>
                <p className="text-xs text-slate-400 truncate">{task.assignee?.position ?? task.assignee?.department ?? ""}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Assigned By</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(task.assignerName || "?")}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{task.assignerName}</p>
                <p className="text-xs text-slate-400 truncate">{task.assigner?.position ?? task.assigner?.department ?? ""}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center gap-2.5 text-sm">
                <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Due:</span>
                <span className={cn("font-semibold", task.isOverdue ? "text-red-600" : "text-slate-800")}>
                  {task.dueDate ? formatDate(task.dueDate, "MMM dd, yyyy") : "—"}
                </span>
              </div>
              {task.department && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500">Dept:</span>
                  <span className="font-semibold text-slate-800">{task.department}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm">
                <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Created:</span>
                <span className="font-semibold text-slate-800">{formatDate(task.createdAt, "MMM dd, yyyy")}</span>
              </div>
              {task.startedAt && (
                <div className="flex items-center gap-2.5 text-sm">
                  <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500">Started:</span>
                  <span className="font-semibold text-slate-800">{formatDate(task.startedAt, "MMM dd, yyyy")}</span>
                </div>
              )}
              {task.completedAt && (
                <div className="flex items-center gap-2.5 text-sm">
                  <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500">Completed:</span>
                  <span className="font-semibold text-emerald-600">{formatDate(task.completedAt, "MMM dd, yyyy")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isFullEdit && (
        <TaskFormModal open={editOpen} onOpenChange={setEditOpen} task={task} />
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Delete Task?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            This will remove &ldquo;{task.title}&rdquo; from active tasks. This action can be reversed by an administrator.
          </p>
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteTask.isPending}
              onClick={handleDelete}
              className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {deleteTask.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : "Delete Task"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
