import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { canAssignTask } from "@/lib/taskAccess";

const VALID_STATUSES = ["todo", "in_progress", "under_review", "completed", "blocked", "on_hold", "cancelled"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
const VALID_PROGRESS = [0, 25, 50, 75, 100];

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  under_review: "Under Review",
  completed: "Completed",
  blocked: "Blocked",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

async function loadTask(id: string) {
  return prisma.task.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      progressLogs: { orderBy: { createdAt: "asc" } },
    },
  });
}

function canView(payload: { id: string; role: string }, task: { assignedToId: string; assignedById: string }) {
  return payload.role === "admin" || task.assignedToId === payload.id || task.assignedById === payload.id;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const task = await loadTask(id);
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canView(payload, task)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const employeeIds = Array.from(
    new Set([
      task.assignedToId,
      task.assignedById,
      ...task.comments.map((c) => c.authorId),
      ...task.progressLogs.map((p) => p.changedById),
    ])
  );
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, fullName: true, role: true, department: true, position: true },
  });
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const comments = task.comments.map((c) => ({
    ...c,
    authorName: empMap.get(c.authorId)?.fullName ?? "Unknown",
    authorRole: empMap.get(c.authorId)?.role ?? "employee",
  }));

  const progressLogs = task.progressLogs.map((p) => ({
    ...p,
    changedByName: empMap.get(p.changedById)?.fullName ?? "Unknown",
    fieldLabel: p.field === "status" ? "Status" : "Progress",
    oldLabel: p.field === "status" ? STATUS_LABELS[p.oldValue ?? ""] ?? p.oldValue : p.oldValue,
    newLabel: p.field === "status" ? STATUS_LABELS[p.newValue ?? ""] ?? p.newValue : p.newValue,
  }));

  const now = new Date();
  return NextResponse.json({
    task: {
      ...task,
      comments,
      progressLogs,
      assignee: empMap.get(task.assignedToId) ?? null,
      assigner: empMap.get(task.assignedById) ?? null,
      assigneeName: empMap.get(task.assignedToId)?.fullName ?? "Unknown",
      assignerName: empMap.get(task.assignedById)?.fullName ?? "Unknown",
      isOverdue: !!task.dueDate && task.dueDate < now && !["completed", "cancelled"].includes(task.status),
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
  });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canView(payload, task)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const isFullEdit = payload.role === "admin" || task.assignedById === payload.id;

  const data: Record<string, unknown> = {};
  const progressLogs: { field: string; oldValue: string; newValue: string }[] = [];

  // Status change — allowed by assignee, assigner, or admin.
  if (typeof body.status === "string" && body.status !== task.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
    progressLogs.push({ field: "status", oldValue: task.status, newValue: body.status });

    if (body.status === "completed") {
      data.completedAt = new Date();
      if (typeof body.progress !== "number") data.progress = 100;
    } else if (task.status === "completed") {
      data.completedAt = null;
    }
    if (body.status === "in_progress" && !task.startedAt) {
      data.startedAt = new Date();
    }
  }

  // Progress change — allowed by assignee, assigner, or admin.
  if (typeof body.progress === "number" && body.progress !== task.progress) {
    if (!VALID_PROGRESS.includes(body.progress)) {
      return NextResponse.json({ error: "Progress must be one of 0, 25, 50, 75, 100." }, { status: 400 });
    }
    data.progress = body.progress;
    progressLogs.push({ field: "progress", oldValue: String(task.progress), newValue: String(body.progress) });
  }

  // New attachments — anyone with view access can append.
  if (Array.isArray(body.appendAttachments) && body.appendAttachments.length > 0) {
    data.attachments = [...task.attachments, ...body.appendAttachments];
  }

  // Full-edit-only fields.
  if (isFullEdit) {
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === "string") data.description = body.description.trim();
    if (typeof body.priority === "string" && VALID_PRIORITIES.includes(body.priority)) data.priority = body.priority;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (typeof body.department === "string" || body.department === null) data.department = body.department || null;
    if (Array.isArray(body.tags)) data.tags = body.tags.filter((t: unknown) => typeof t === "string");
    if (Array.isArray(body.attachments)) data.attachments = body.attachments;

    if (typeof body.assignedToId === "string" && body.assignedToId !== task.assignedToId) {
      const allowed = await canAssignTask(payload, body.assignedToId);
      if (!allowed) return NextResponse.json({ error: "You are not allowed to assign tasks to this employee." }, { status: 403 });
      data.assignedToId = body.assignedToId;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ task });
  }

  const updated = await prisma.task.update({ where: { id }, data });

  for (const log of progressLogs) {
    await prisma.taskProgressLog.create({
      data: { taskId: id, changedById: payload.id, field: log.field, oldValue: log.oldValue, newValue: log.newValue },
    });
  }

  if (progressLogs.length > 0) {
    await logActivity({
      userId: payload.id,
      action: "updated",
      module: "tasks",
      entityId: id,
      entityName: updated.title,
      detail: progressLogs.map((l) => `${l.field} changed from ${l.oldValue} to ${l.newValue}`).join("; "),
      req,
    });
  } else {
    await logActivity({
      userId: payload.id,
      action: "updated",
      module: "tasks",
      entityId: id,
      entityName: updated.title,
      detail: "Task details updated.",
      req,
    });
  }

  // Notifications
  const recipients = new Set<string>();
  if (payload.id !== updated.assignedToId) recipients.add(updated.assignedToId);
  if (payload.id !== updated.assignedById) recipients.add(updated.assignedById);

  if (recipients.size > 0) {
    const justCompleted = data.status === "completed";
    await prisma.notification.createMany({
      data: Array.from(recipients).map((recipientId) => ({
        recipientId,
        title: justCompleted ? "Task Completed ✓" : "Task Updated",
        message: justCompleted
          ? `"${updated.title}" was marked complete by ${payload.fullName}.`
          : `"${updated.title}" was updated by ${payload.fullName}.`,
        type: "info",
        link: `/dashboard/tasks/${id}`,
      })),
    });
  }

  // Reassignment notification
  if (typeof data.assignedToId === "string" && data.assignedToId !== task.assignedToId) {
    await prisma.notification.create({
      data: {
        recipientId: data.assignedToId,
        title: "Task Assigned to You",
        message: `${payload.fullName} assigned you: "${updated.title}"`,
        type: "info",
        link: `/dashboard/tasks/${id}`,
      },
    });
  }

  return NextResponse.json({ task: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
  });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (payload.role !== "admin" && task.assignedById !== payload.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });

  await logActivity({
    userId: payload.id,
    action: "deleted",
    module: "tasks",
    entityId: id,
    entityName: task.title,
    req,
  });

  return NextResponse.json({ message: "Task deleted." });
}
