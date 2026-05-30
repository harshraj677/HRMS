import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { getAdminCaller, getClientIp, createArchive, createAuditLog } from "@/lib/secureDelete";

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return { error: "Not authenticated.", status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: "Invalid session.", status: 401 };
  if (payload.role !== "admin") return { error: "Forbidden.", status: 403 };
  return { payload };
}

async function requireAuth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return { error: "Not authenticated.", status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: "Invalid session.", status: 401 };
  return { payload };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const startup = await prisma.startup.findUnique({ where: { id } });
  if (!startup) return NextResponse.json({ error: "Startup not found." }, { status: 404 });

  return NextResponse.json({ startup });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request body required." }, { status: 400 });

  const existing = await prisma.startup.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Startup not found." }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.startupName  !== undefined) data.startupName  = body.startupName.trim();
  if (body.founderName  !== undefined) data.founderName  = body.founderName.trim();
  if (body.founderEmail !== undefined) data.founderEmail = body.founderEmail?.trim() || null;
  if (body.founderPhone !== undefined) data.founderPhone = body.founderPhone?.trim() || null;
  if (body.program      !== undefined) data.program      = body.program;
  if (body.stage        !== undefined) data.stage        = body.stage;
  if (body.mentor       !== undefined) data.mentor       = body.mentor?.trim() || null;
  if (body.description  !== undefined) data.description  = body.description?.trim() || null;
  if (body.fundingStage !== undefined) data.fundingStage = body.fundingStage;
  if (body.progress     !== undefined) data.progress     = Number(body.progress);
  if (body.status       !== undefined) data.status       = body.status;
  if (body.website      !== undefined) data.website      = body.website?.trim() || null;
  if (body.industry     !== undefined) data.industry     = body.industry?.trim() || null;
  if (body.teamSize     !== undefined) data.teamSize     = body.teamSize ? Number(body.teamSize) : null;
  if (body.location     !== undefined) data.location     = body.location?.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const startup = await prisma.startup.update({ where: { id }, data });
  return NextResponse.json({ startup });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getAdminCaller(req);
  if (!caller) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const startup = await prisma.startup.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true, startupName: true, founderName: true, founderEmail: true, program: true, stage: true, status: true, createdAt: true },
  });
  if (!startup) return NextResponse.json({ error: "Startup not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { confirmName, archiveBeforeDelete = true, permanentPurge = false } = body;

  if (confirmName !== startup.startupName) {
    return NextResponse.json({ error: "Confirmation name does not match." }, { status: 400 });
  }
  if (permanentPurge && caller.dbRole !== "super_admin") {
    return NextResponse.json({ error: "Permanent purge requires super_admin role." }, { status: 403 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  let archiveId: string | undefined;
  if (archiveBeforeDelete) {
    const arc = await createArchive({
      sourceTable: "Startup",
      sourceId: id,
      snapshot: startup as Record<string, unknown>,
      archivedBy: caller.id,
    });
    archiveId = arc.id;
  }

  if (permanentPurge) {
    await prisma.startup.delete({ where: { id } });
  } else {
    await prisma.startup.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  const audit = await createAuditLog({
    adminId: caller.id,
    action: permanentPurge ? "PERMANENT_DELETE" : "SOFT_DELETE",
    resource: "Startup",
    resourceId: id,
    details: { archiveId, confirmName, permanentPurge },
    ip,
    userAgent,
  });

  return NextResponse.json({ success: true, auditId: audit.id, archiveId });
}
