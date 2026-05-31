import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const rec = await prisma.settings.findUnique({ where: { key: "phase3_policy" } });
    const enabled = (rec?.value as { enabled?: boolean } | null)?.enabled === true;
    return NextResponse.json({ enabled });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function PUT(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) is required." }, { status: 400 });
  }
  await prisma.settings.upsert({
    where: { key: "phase3_policy" },
    update: { value: { enabled: body.enabled } },
    create: { key: "phase3_policy", value: { enabled: body.enabled } },
  });
  return NextResponse.json({ enabled: body.enabled });
}
