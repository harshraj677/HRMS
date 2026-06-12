import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBusinessDays(start: Date, end: Date): number {
  if (start > end) return 0;
  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const day = curr.getDay();
    if (day !== 0 && day !== 6) count++;
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}

function timeToMinutes(time: string): number {
  const [h, m] = (time || "00:00").split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

const VALID_DURATION_TYPES = ["full_day", "half_day", "custom_hours"];
const VALID_SESSION_TYPES  = ["first_half", "second_half"];
const VALID_CATEGORIES     = [
  "casual", "sick", "earned", "maternity", "paternity",
  "comp_off", "loss_of_pay", "wfh", "unpaid",
];

function serverCalculate(
  durationType: string,
  start: Date,
  end: Date,
  startTime: string,
  endTime: string
): { totalDays: number; totalHours: number } {
  if (durationType === "half_day") return { totalDays: 0.5, totalHours: 4 };

  if (durationType === "custom_hours") {
    const diffMins = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (diffMins <= 0) return { totalDays: 0, totalHours: 0 };
    const totalHours = parseFloat((diffMins / 60).toFixed(2));
    return { totalHours, totalDays: parseFloat((totalHours / 8).toFixed(4)) };
  }

  // full_day
  const businessDays = countBusinessDays(start, end);
  return { totalDays: businessDays, totalHours: businessDays * 8 };
}

// ─── GET /api/leave ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    const records = await prisma.leaveRequest.findMany({
      where: payload.role === "admin" ? {} : { employeeId: payload.id },
      include: {
        employee: { select: { fullName: true, department: true, leaveBalance: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const leaves = records.map((r) => ({
      id:             r.id,
      employeeId:     r.employeeId,
      startDate:      r.startDate,
      endDate:        r.endDate,
      days:           r.days,
      // New fields — use nullish fallback so old records without them still work
      totalHours:     (r as any).totalHours  ?? (r.days * 8),
      totalDays:      (r as any).totalDays   ?? r.days,
      durationType:   (r as any).durationType ?? "full_day",
      sessionType:    (r as any).sessionType  ?? null,
      startTime:      (r as any).startTime    ?? null,
      endTime:        (r as any).endTime      ?? null,
      reason:         r.reason,
      category:       r.category,
      status:         r.status,
      approvedBy:     r.approvedBy,
      managerComment: r.managerComment,
      createdAt:      r.createdAt,
      fullName:       r.employee.fullName,
      department:     r.employee.department,
      leaveBalance:   r.employee.leaveBalance,
    }));

    return NextResponse.json({ leaves });
  } catch (err) {
    console.error("[GET /api/leave]", err);
    return NextResponse.json({ error: "Failed to fetch leave requests." }, { status: 500 });
  }
}

// ─── POST /api/leave ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.startDate || !body?.reason?.trim()) {
      return NextResponse.json({ error: "startDate and reason are required." }, { status: 400 });
    }

    // ── Duration type ──────────────────────────────────────────────────────
    const durationType = VALID_DURATION_TYPES.includes(body.durationType)
      ? (body.durationType as string)
      : "full_day";

    const sessionType =
      durationType === "half_day" && VALID_SESSION_TYPES.includes(body.sessionType)
        ? (body.sessionType as string)
        : "first_half";

    const startTime = (body.startTime as string) || "09:00";
    const endTime   = (body.endTime   as string) || "18:00";

    // ── Dates ──────────────────────────────────────────────────────────────
    const start = new Date(body.startDate as string);
    const rawEnd = durationType === "half_day"
      ? (body.startDate as string)
      : (body.endDate as string) || (body.startDate as string);
    const end = new Date(rawEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
    }

    // ── Server-side calculation (authoritative) ────────────────────────────
    const { totalDays, totalHours } = serverCalculate(
      durationType, start, end, startTime, endTime
    );

    if (totalDays <= 0) {
      return NextResponse.json(
        { error: "Leave duration must be greater than zero. Ensure your dates include working days." },
        { status: 400 }
      );
    }

    // ── Balance check ──────────────────────────────────────────────────────
    const emp = await prisma.employee.findUnique({
      where: { id: payload.id },
      select: { leaveBalance: true, fullName: true },
    });
    if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

    if (totalDays > emp.leaveBalance) {
      return NextResponse.json(
        { error: `Insufficient leave balance. You have ${emp.leaveBalance} day(s) remaining, but this request needs ${totalDays}.` },
        { status: 400 }
      );
    }

    const category = VALID_CATEGORIES.includes(body.category as string)
      ? (body.category as string)
      : "casual";

    const reason = (body.reason as string).trim();

    // ── Create leave record (with engine-compatibility fallback) ───────────
    await createLeaveRecord({
      prisma,
      employeeId: payload.id,
      start,
      end,
      totalDays,
      totalHours,
      reason,
      category,
      durationType,
      sessionType,
      startTime,
      endTime,
    });

    // ── Notify admins ──────────────────────────────────────────────────────
    const admins = await prisma.employee.findMany({
      where:  { role: "admin", OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
      select: { id: true },
    });

    if (admins.length > 0) {
      const label =
        durationType === "half_day" ? "0.5-day (half day)" : `${totalDays}-day`;
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          recipientId: a.id,
          title:   "New Leave Request",
          message: `${emp.fullName} requested a ${label} leave.`,
          type:    "leave",
          link:    "/dashboard/leave",
        })),
      });
    }

    return NextResponse.json(
      { message: "Leave request submitted.", totalDays, totalHours },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/leave]", err);
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Leave record creation with old-engine fallback ──────────────────────────

async function createLeaveRecord(opts: {
  prisma:       typeof prisma;
  employeeId:   string;
  start:        Date;
  end:          Date;
  totalDays:    number;
  totalHours:   number;
  reason:       string;
  category:     string;
  durationType: string;
  sessionType:  string;
  startTime:    string;
  endTime:      string;
}) {
  const {
    employeeId, start, end, totalDays, totalHours,
    reason, category, durationType, sessionType, startTime, endTime,
  } = opts;

  const storeSessionType = durationType === "half_day" ? sessionType : null;
  const storeStartTime   = durationType === "custom_hours" ? startTime : null;
  const storeEndTime     = durationType === "custom_hours" ? endTime   : null;

  // ── Attempt 1: normal Prisma create with all new fields ──────────────────
  try {
    await opts.prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate:   start,
        endDate:     end,
        days:        totalDays,
        reason,
        category,
        status:      "pending",
        durationType,
        sessionType: storeSessionType,
        startTime:   storeStartTime,
        endTime:     storeEndTime,
        totalHours,
        totalDays,
      } as Parameters<typeof opts.prisma.leaveRequest.create>[0]["data"],
    });
    return; // success
  } catch (prismaErr) {
    const msg = prismaErr instanceof Error ? prismaErr.message : String(prismaErr);
    // Only fall through if this is an engine-compatibility error (unknown field / type mismatch)
    const isEngineCompat =
      msg.includes("Unknown argument") ||
      msg.includes("Unknown field") ||
      msg.includes("Int") ||
      msg.includes("Float") ||
      msg.includes("engine");
    if (!isEngineCompat) throw prismaErr; // surface real errors
    console.warn("[POST /api/leave] Prisma engine outdated, falling back to $runCommandRaw:", msg);
  }

  // ── Attempt 2: raw MongoDB insert (bypasses engine validation) ───────────
  const docId = new ObjectId().toHexString();

  await opts.prisma.$runCommandRaw({
    insert: "LeaveRequest",
    documents: [
      {
        _id:          { $oid: docId },
        employeeId:   { $oid: employeeId },
        startDate:    { $date: { $numberLong: start.getTime().toString() } },
        endDate:      { $date: { $numberLong: end.getTime().toString() } },
        days:         totalDays,
        reason,
        category,
        status:       "pending",
        durationType,
        sessionType:  storeSessionType,
        startTime:    storeStartTime,
        endTime:      storeEndTime,
        totalHours,
        totalDays,
        approvedBy:   null,
        managerComment: null,
        deletedAt:    null,
        createdAt:    { $date: { $numberLong: Date.now().toString() } },
      },
    ],
  });
}
