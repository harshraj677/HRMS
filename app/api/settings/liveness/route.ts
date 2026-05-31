import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/** GET /api/settings/liveness — returns { level: "off"|"soft"|"hard" } */
export async function GET() {
  try {
    const rec = await prisma.settings.findUnique({ where: { key: "liveness_enforcement" } });
    const level = (rec?.value as { level?: string } | null)?.level ?? "off";
    return NextResponse.json({ level });
  } catch {
    return NextResponse.json({ level: "off" });
  }
}

/** PUT /api/settings/liveness — admin sets enforcement level */
export async function PUT(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const valid = ["off", "soft", "hard"];
  if (!valid.includes(body?.level)) {
    return NextResponse.json({ error: `level must be one of: ${valid.join(", ")}` }, { status: 400 });
  }

  await prisma.settings.upsert({
    where: { key: "liveness_enforcement" },
    update: { value: { level: body.level } },
    create: { key: "liveness_enforcement", value: { level: body.level } },
  });

  return NextResponse.json({ level: body.level });
}
