import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const startups = await prisma.startup.findMany({
    where: { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ startups });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  if (payload.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.startupName || !body?.founderName) {
    return NextResponse.json(
      { error: "startupName and founderName are required." },
      { status: 400 }
    );
  }

  const startup = await prisma.startup.create({
    data: {
      startupName:  body.startupName.trim(),
      founderName:  body.founderName.trim(),
      founderEmail: body.founderEmail?.trim() || null,
      founderPhone: body.founderPhone?.trim() || null,
      program:      body.program      || "Diksuchi",
      stage:        body.stage        || "Idea",
      mentor:       body.mentor?.trim()       || null,
      description:  body.description?.trim()  || null,
      fundingStage: body.fundingStage || "Bootstrapped",
      progress:     Number(body.progress ?? 0),
      status:       body.status       || "Active",
      website:      body.website?.trim()      || null,
      industry:     body.industry?.trim()     || null,
      teamSize:     body.teamSize ? Number(body.teamSize) : null,
      location:     body.location?.trim()     || null,
    },
  });

  return NextResponse.json({ startup }, { status: 201 });
}
