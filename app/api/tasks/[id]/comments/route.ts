import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
  });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (payload.role !== "admin" && task.assignedToId !== payload.id && task.assignedById !== payload.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.content?.trim()) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  const mentions: string[] = Array.isArray(body.mentions)
    ? body.mentions.filter((m: unknown) => typeof m === "string")
    : [];

  const comment = await prisma.taskComment.create({
    data: {
      taskId: id,
      authorId: payload.id,
      content: body.content.trim(),
      parentId: typeof body.parentId === "string" ? body.parentId : null,
      mentions,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    },
  });

  await logActivity({
    userId: payload.id,
    action: "commented",
    module: "tasks",
    entityId: id,
    entityName: task.title,
    detail: body.parentId ? "Replied to a comment." : "Added a comment.",
    req,
  });

  // Notify the other party (assignee <-> assigner), excluding the author.
  const recipients = new Set<string>();
  if (payload.id !== task.assignedToId) recipients.add(task.assignedToId);
  if (payload.id !== task.assignedById) recipients.add(task.assignedById);

  // Notify mentioned users separately (if not already covered).
  const mentionRecipients = mentions.filter((m) => m !== payload.id && !recipients.has(m));

  if (recipients.size > 0) {
    await prisma.notification.createMany({
      data: Array.from(recipients).map((recipientId) => ({
        recipientId,
        title: "New Comment",
        message: `${payload.fullName} commented on "${task.title}"`,
        type: "info",
        link: `/dashboard/tasks/${id}`,
      })),
    });
  }

  if (mentionRecipients.length > 0) {
    await prisma.notification.createMany({
      data: mentionRecipients.map((recipientId) => ({
        recipientId,
        title: "You Were Mentioned",
        message: `${payload.fullName} mentioned you on "${task.title}"`,
        type: "info",
        link: `/dashboard/tasks/${id}`,
      })),
    });
  }

  const author = await prisma.employee.findUnique({ where: { id: payload.id }, select: { fullName: true, role: true } });

  return NextResponse.json(
    { comment: { ...comment, authorName: author?.fullName ?? payload.fullName, authorRole: author?.role ?? "employee" } },
    { status: 201 }
  );
}
