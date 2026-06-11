import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { canAssignTask } from "@/lib/taskAccess";

const ACTIVE_TASK_FILTER = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };
const OPEN_STATUSES = ["todo", "in_progress", "under_review", "blocked", "on_hold"];

/** Best-effort, non-blocking pass that creates "overdue" / "due soon" notifications
 * for the caller's own tasks, deduping via overdueNotifiedAt / dueSoonNotifiedAt. */
async function runDeadlineNotifications(employeeId: string) {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: employeeId,
        ...ACTIVE_TASK_FILTER,
        status: { in: OPEN_STATUSES },
        dueDate: { not: null },
      },
      select: { id: true, title: true, dueDate: true, overdueNotifiedAt: true, dueSoonNotifiedAt: true },
    });

    for (const task of tasks) {
      if (!task.dueDate) continue;

      if (task.dueDate < now && !task.overdueNotifiedAt) {
        await prisma.notification.create({
          data: {
            recipientId: employeeId,
            title: "Task Overdue",
            message: `"${task.title}" is overdue.`,
            type: "warning",
            link: `/dashboard/tasks/${task.id}`,
          },
        });
        await prisma.task.update({ where: { id: task.id }, data: { overdueNotifiedAt: now } });
        continue;
      }

      if (task.dueDate >= now && task.dueDate <= in24h && !task.dueSoonNotifiedAt) {
        await prisma.notification.create({
          data: {
            recipientId: employeeId,
            title: "Deadline Approaching",
            message: `"${task.title}" is due within 24 hours.`,
            type: "warning",
            link: `/dashboard/tasks/${task.id}`,
          },
        });
        await prisma.task.update({ where: { id: task.id }, data: { dueSoonNotifiedAt: now } });
      }
    }
  } catch {
    // Notifications are non-critical — never let this break the tasks list.
  }
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const department = url.searchParams.get("department");
  const assignedToId = url.searchParams.get("assignedToId");
  const search = url.searchParams.get("search");
  const view = url.searchParams.get("view") ?? "list";
  const scope = url.searchParams.get("scope") ?? "all";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const and: Record<string, unknown>[] = [ACTIVE_TASK_FILTER];

  if (payload.role !== "admin") {
    if (scope === "assigned") and.push({ assignedToId: payload.id });
    else if (scope === "created") and.push({ assignedById: payload.id });
    else and.push({ OR: [{ assignedToId: payload.id }, { assignedById: payload.id }] });
  } else if (assignedToId) {
    and.push({ assignedToId });
  }

  if (status && status !== "all") and.push({ status });
  if (priority && priority !== "all") and.push({ priority });
  if (department && department !== "all") and.push({ department });
  if (search) and.push({ title: { contains: search, mode: "insensitive" } });
  if (from || to) {
    const dueDate: Record<string, Date> = {};
    if (from) dueDate.gte = new Date(from);
    if (to) dueDate.lte = new Date(to);
    and.push({ dueDate });
  }

  const tasks = await prisma.task.findMany({
    where: { AND: and },
    include: { _count: { select: { comments: true } } },
    orderBy: view === "calendar" ? { dueDate: "asc" } : { createdAt: "desc" },
  });

  // Enrich with assignee/assigner names
  const employeeIds = Array.from(
    new Set(tasks.flatMap((t) => [t.assignedToId, t.assignedById]))
  );
  const employees = employeeIds.length
    ? await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const nameMap = new Map(employees.map((e) => [e.id, e.fullName]));

  const now = new Date();
  const enriched = tasks.map((t) => ({
    ...t,
    assigneeName: nameMap.get(t.assignedToId) ?? "Unknown",
    assignerName: nameMap.get(t.assignedById) ?? "Unknown",
    commentCount: t._count.comments,
    isOverdue: !!t.dueDate && t.dueDate < now && !["completed", "cancelled"].includes(t.status),
  }));

  // Lazy deadline-notification pass for the caller's own assigned tasks.
  void runDeadlineNotifications(payload.id);

  return NextResponse.json({ tasks: enriched });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  if (!body?.assignedToId || typeof body.assignedToId !== "string") {
    return NextResponse.json({ error: "assignedToId is required." }, { status: 400 });
  }

  const allowed = await canAssignTask(payload, body.assignedToId);
  if (!allowed) {
    return NextResponse.json({ error: "You are not allowed to assign tasks to this employee." }, { status: 403 });
  }

  const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
  const priority = VALID_PRIORITIES.includes(body.priority) ? body.priority : "medium";

  const task = await prisma.task.create({
    data: {
      title: body.title.trim(),
      description: typeof body.description === "string" ? body.description.trim() : null,
      priority,
      status: "todo",
      progress: 0,
      department: typeof body.department === "string" && body.department ? body.department : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedById: payload.id,
      assignedToId: body.assignedToId,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [],
    },
  });

  await logActivity({
    userId: payload.id,
    action: "created",
    module: "tasks",
    entityId: task.id,
    entityName: task.title,
    detail: `Task created and assigned to ${body.assignedToId === payload.id ? "self" : "employee"}.`,
    req,
  });

  if (task.assignedToId !== payload.id) {
    await prisma.notification.create({
      data: {
        recipientId: task.assignedToId,
        title: "New Task Assigned",
        message: `${payload.fullName} assigned you: "${task.title}"`,
        type: "info",
        link: `/dashboard/tasks/${task.id}`,
      },
    });
  }

  return NextResponse.json({ task }, { status: 201 });
}
