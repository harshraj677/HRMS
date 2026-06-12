import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export interface AdminCaller {
  id: string;
  email: string;
  role: string;
  fullName: string;
  dbRole: string;
}

/** Authenticate request and verify caller is admin or super_admin. Returns null if unauthorized. */
export async function getAdminCaller(req: NextRequest): Promise<AdminCaller | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const caller = await prisma.employee.findUnique({
    where: { id: payload.id },
    select: { id: true, role: true },
  });
  if (!caller || (caller.role !== "admin" && caller.role !== "super_admin")) return null;
  return { ...payload, dbRole: caller.role };
}

/** Extract client IP from standard proxy headers. */
export function getClientIp(req: NextRequest): string {
  const forwardedHeader = req.headers.get("x-forwarded-for") ?? req.headers.get("x-vercel-forwarded-for");
  const forwardedIp = forwardedHeader?.split(",")[0]?.trim();

  if (forwardedIp) return forwardedIp;

  const forwarded = req.headers.get("forwarded");
  const forwardedMatch = forwarded?.match(/for=(?:"?\[?)([^;,\]"]+)(?:\]?"?)/i);

  if (forwardedMatch?.[1]) return forwardedMatch[1].trim();

  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-client-ip") ??
    "unknown"
  );
}

/** Create a sanitized archive snapshot. Sensitive fields are redacted before storage. */
export async function createArchive(params: {
  sourceTable: string;
  sourceId: string;
  snapshot: Record<string, unknown>;
  archivedBy: string;
}) {
  const sanitized = { ...params.snapshot };
  // Redact credentials — never store plaintext secrets in archive
  delete sanitized.passwordHash;
  delete sanitized.password;
  delete sanitized.token;

  return prisma.archive.create({
    data: {
      sourceTable: params.sourceTable,
      sourceId: params.sourceId,
      snapshot: sanitized as any,
      archivedBy: params.archivedBy,
    },
  });
}

/** Create an immutable audit log entry for a deletion event. */
export async function createAuditLog(params: {
  adminId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({ data: params as any });
}
