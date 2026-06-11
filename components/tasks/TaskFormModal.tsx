"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Paperclip, X, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useAssignableEmployees,
  useCreateTask,
  useUpdateTask,
  TASK_PRIORITIES,
  type TaskAttachment,
  type TaskData,
  type TaskPriority,
} from "@/hooks/useTasks";
import { toast } from "sonner";

const DEPARTMENTS = ["Management", "Programs", "Design", "Incubation", "Content", "Engineering", "Marketing", "Operations"];

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024; // 2MB

const taskSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().optional(),
  department: z.string().optional(),
  assignedToId: z.string().min(1, "Assignee is required"),
  tags: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

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

export function TaskFormModal({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskData;
}) {
  const isEdit = !!task;
  const { data: employees, isLoading: employeesLoading } = useAssignableEmployees();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: "medium" },
  });

  const priority = watch("priority");
  const assignedToId = watch("assignedToId");
  const department = watch("department");

  useEffect(() => {
    if (!open) return;
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
        department: task.department ?? "",
        assignedToId: task.assignedToId,
        tags: task.tags?.join(", ") ?? "",
      });
      setAttachments(task.attachments ?? []);
    } else {
      reset({ title: "", description: "", priority: "medium", dueDate: "", department: "", assignedToId: "", tags: "" });
      setAttachments([]);
    }
  }, [open, task, reset]);

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
      setAttachments((prev) => [...prev, ...next]);
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  const onSubmit = async (data: TaskForm) => {
    const tags = data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (isEdit && task) {
      await updateTask.mutateAsync({
        id: task.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate || null,
        department: data.department || null,
        assignedToId: data.assignedToId,
        tags,
        attachments,
      });
      toast.success("Task updated.");
    } else {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate || null,
        department: data.department || null,
        assignedToId: data.assignedToId,
        tags,
        attachments,
      });
    }
    onOpenChange(false);
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEdit ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title</Label>
            <Input
              {...register("title")}
              placeholder="e.g. Prepare Q3 budget report"
              className={cn(
                "h-11 rounded-xl bg-slate-50 border-slate-200",
                "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0",
                errors.title && "border-red-400 bg-red-50/60"
              )}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</Label>
            <Textarea
              {...register("description")}
              placeholder="Add details about this task…"
              rows={3}
              className="rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority</Label>
              <Select value={priority} onValueChange={(v) => setValue("priority", v as TaskPriority)}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Due Date</Label>
              <Input
                type="date"
                {...register("dueDate")}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Department</Label>
              <Select value={department || "none"} onValueChange={(v) => setValue("department", v === "none" ? "" : v)}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Assign To</Label>
              <Select value={assignedToId} onValueChange={(v) => setValue("assignedToId", v)}>
                <SelectTrigger className={cn("h-11 rounded-xl bg-slate-50 border-slate-200", errors.assignedToId && "border-red-400 bg-red-50/60")}>
                  <SelectValue placeholder={employeesLoading ? "Loading…" : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.fullName}{e.department ? ` · ${e.department}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assignedToId && <p className="text-xs text-red-500">{errors.assignedToId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tags</Label>
            <Input
              {...register("tags")}
              placeholder="comma, separated, tags"
              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Attachments</Label>
            <label className={cn(
              "flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors",
              uploading && "opacity-60 pointer-events-none"
            )}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              {uploading ? "Uploading…" : "Attach file (max 2MB)"}
              <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
            {attachments.length > 0 && (
              <ul className="space-y-1.5 mt-2">
                {attachments.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate flex-1 text-slate-600">{a.name}</span>
                    <span className="text-slate-400 shrink-0">{(a.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => removeAttachment(i)} aria-label={`Remove ${a.name}`} className="text-slate-400 hover:text-red-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || uploading}
              className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm shadow-indigo-500/20"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
