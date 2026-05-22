import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

function auth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { employeeId } = await params;
  if (payload.role !== "admin" && payload.id !== employeeId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const structure = await prisma.salaryStructure.findUnique({ where: { employeeId } });
  return NextResponse.json({ structure });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const payload = auth(req);
  if (!payload) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { employeeId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body required." }, { status: 400 });

  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true },
  });
  if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  const numericFields = ["basicSalary","hra","specialAllowance","bonus","pfDeduction","taxDeduction","otherDeductions"];
  const data: Record<string, unknown> = {};

  for (const f of numericFields) {
    if (body[f] !== undefined) data[f] = Number(body[f]) || 0;
  }
  for (const f of ["bankName","accountNumber","ifscCode","panNumber","uanNumber"]) {
    if (body[f] !== undefined) data[f] = body[f] ?? null;
  }
  if (body.salaryEffectiveFrom !== undefined) {
    data.salaryEffectiveFrom = body.salaryEffectiveFrom ? new Date(body.salaryEffectiveFrom) : null;
  }

  const structure = await prisma.salaryStructure.upsert({
    where: { employeeId },
    update: data,
    create: { employeeId, ...data },
  });

  return NextResponse.json({ structure });
}
