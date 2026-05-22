import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export interface OrgNode {
  id: string;
  fullName: string;
  position: string | null;
  department: string | null;
  role: string;
  avatar: string | null;
  reportingManagerId: string | null;
  children: OrgNode[];
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: {
      id: true, fullName: true, position: true,
      department: true, role: true, reportingManagerId: true,
      profile: { select: { avatar: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const nodeMap = new Map<string, OrgNode>();
  employees.forEach((e) => {
    nodeMap.set(e.id, {
      id: e.id,
      fullName: e.fullName,
      position: e.position,
      department: e.department,
      role: e.role,
      avatar: e.profile?.avatar ?? null,
      reportingManagerId: e.reportingManagerId ?? null,
      children: [],
    });
  });

  const roots: OrgNode[] = [];
  nodeMap.forEach((node) => {
    if (!node.reportingManagerId || !nodeMap.has(node.reportingManagerId)) {
      roots.push(node);
    } else {
      nodeMap.get(node.reportingManagerId)!.children.push(node);
    }
  });

  return NextResponse.json({ tree: roots });
}
