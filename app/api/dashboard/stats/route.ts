import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** GET /api/dashboard/stats — admin dashboard stats */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);

  // Total non-admin employees
  const [empRows] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM Employee WHERE role != 'admin'"
  );
  const totalEmployees = (empRows as RowDataPacket[])[0].total;

  // Present today (have checkIn for today)
  const [presentRows] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM Attendance WHERE date = ? AND checkIn IS NOT NULL",
    [todayStr]
  );
  const presentToday = (presentRows as RowDataPacket[])[0].total;

  // On leave today (approved leave that covers today)
  const [leaveRows] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM LeaveRequest WHERE status = 'approved' AND startDate <= ? AND endDate >= ?",
    [todayStr, todayStr]
  );
  const onLeave = (leaveRows as RowDataPacket[])[0].total;

  // Pending leave requests
  const [pendingRows] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM LeaveRequest WHERE status = 'pending'"
  );
  const pendingLeaveRequests = (pendingRows as RowDataPacket[])[0].total;

  const percentPresent = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

  return NextResponse.json({
    totalEmployees,
    presentToday,
    onLeave,
    pendingLeaveRequests,
    percentPresent,
  });
}
