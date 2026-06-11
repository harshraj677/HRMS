import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { getAssignableEmployees } from "@/lib/taskAccess";

/** GET /api/tasks/assignees — employees the current user may assign tasks to. */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const employees = await getAssignableEmployees(payload);
  return NextResponse.json({ employees });
}
