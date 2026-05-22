import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function logActivity(params: {
  userId: string;
  action: string;
  module: string;
  entityId?: string;
  entityName?: string;
  detail?: string;
  req?: NextRequest;
}) {
  try {
    const ipAddress = params.req
      ? params.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        params.req.headers.get("x-real-ip") ?? "unknown"
      : undefined;
    const userAgent = params.req?.headers.get("user-agent") ?? undefined;

    await prisma.activityLog.create({
      data: {
        userId:     params.userId,
        action:     params.action,
        module:     params.module,
        entityId:   params.entityId,
        entityName: params.entityName,
        detail:     params.detail,
        ipAddress,
        userAgent,
      },
    });
  } catch {
    // Activity logging is non-critical — never let it break the main operation
  }
}
