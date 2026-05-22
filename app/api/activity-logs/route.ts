import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const url    = new URL(req.url);
  const logModule = url.searchParams.get("module") ?? "";
  const userId    = url.searchParams.get("userId") ?? "";
  const take      = Math.min(Number(url.searchParams.get("take") ?? "100"), 200);

  const where: Record<string, unknown> = {};
  if (logModule) where.module = logModule;
  if (userId)    where.userId = userId;

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });

  // Enrich with user names
  const enriched = await Promise.all(
    logs.map(async (l) => {
      const user = await prisma.employee.findUnique({ where: { id: l.userId }, select: { fullName: true, role: true } });
      return { ...l, userName: user?.fullName ?? "Unknown", userRole: user?.role ?? "employee" };
    })
  );

  return NextResponse.json({ logs: enriched });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.action || !body?.module) return NextResponse.json({ error: "action and module are required." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";

  await prisma.activityLog.create({
    data: {
      userId:     payload.id,
      action:     body.action,
      module:     body.module,
      entityId:   body.entityId,
      entityName: body.entityName,
      detail:     body.detail,
      ipAddress:  ip,
      userAgent:  req.headers.get("user-agent") ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
