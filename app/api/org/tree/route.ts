import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { getActiveEmployeesFlat } from "@/lib/orgHierarchy";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const employees = await getActiveEmployeesFlat();
  const namesById = new Map(employees.map((e) => [e.id, e.fullName]));

  const enriched = employees.map((e) => ({
    ...e,
    managerName: e.reportingManagerId ? namesById.get(e.reportingManagerId) ?? null : null,
  }));

  return NextResponse.json({ employees: enriched });
}
