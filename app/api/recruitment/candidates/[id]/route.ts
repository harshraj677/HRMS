import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

const STAGES = ["applied","screening","interview","hr_round","selected","rejected"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (body.stage && STAGES.includes(body.stage)) data.stage = body.stage;
  if (body.notes         !== undefined) data.notes         = body.notes;
  if (body.interviewDate !== undefined) data.interviewDate = body.interviewDate ? new Date(body.interviewDate) : null;
  if (body.interviewNotes!== undefined) data.interviewNotes = body.interviewNotes;

  const candidate = await prisma.candidate.update({ where: { id }, data });

  // Notify if selected
  if (body.stage === "selected" || body.stage === "rejected") {
    const cand = await prisma.candidate.findUnique({ where: { id }, select: { referredById: true, fullName: true } });
    if (cand?.referredById) {
      await prisma.notification.create({
        data: {
          recipientId: cand.referredById,
          title: `Referral Update`,
          message: `Your referral ${cand.fullName} has been ${body.stage === "selected" ? "selected 🎉" : "rejected"}.`,
          type: "info",
          link: "/dashboard/recruitment",
        },
      });
    }
  }

  return NextResponse.json({ candidate });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  await prisma.candidate.delete({ where: { id } });
  return NextResponse.json({ message: "Candidate deleted." });
}
