import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** GET /api/dashboard/stats — dashboard stats (role-aware) */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);

  if (payload.role === "admin") {
    // Total non-admin employees
    const [empRows] = await db.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM Employee WHERE role != 'admin'"
    );
    const totalEmployees = (empRows as RowDataPacket[])[0].total;

    // Present today
    const [presentRows] = await db.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM Attendance WHERE date = ? AND checkIn IS NOT NULL",
      [todayStr]
    );
    const presentToday = (presentRows as RowDataPacket[])[0].total;

    // Late today
    const [lateRows] = await db.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM Attendance WHERE date = ? AND status = 'late'",
      [todayStr]
    );
    const lateToday = (lateRows as RowDataPacket[])[0].total;

    // On leave today
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
      lateToday,
      onLeave,
      pendingLeaveRequests,
      percentPresent,
    });
  }

  // Employee dashboard stats — personal data only
  const [myAttendance] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM Attendance WHERE employeeId = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())",
    [payload.id]
  );
  const [myLateCount] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM Attendance WHERE employeeId = ? AND status = 'late' AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())",
    [payload.id]
  );
  const [myLeaves] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM LeaveRequest WHERE employeeId = ? AND status = 'approved' AND MONTH(startDate) = MONTH(CURDATE()) AND YEAR(startDate) = YEAR(CURDATE())",
    [payload.id]
  );
  const [myPending] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM LeaveRequest WHERE employeeId = ? AND status = 'pending'",
    [payload.id]
  );
  const [empInfo] = await db.execute<RowDataPacket[]>(
    "SELECT leaveBalance FROM Employee WHERE id = ?",
    [payload.id]
  );

  return NextResponse.json({
    monthlyAttendance: (myAttendance as RowDataPacket[])[0].total,
    monthlyLate: (myLateCount as RowDataPacket[])[0].total,
    monthlyLeaves: (myLeaves as RowDataPacket[])[0].total,
    pendingRequests: (myPending as RowDataPacket[])[0].total,
    leaveBalance: (empInfo as RowDataPacket[])[0]?.leaveBalance ?? 0,
  });
}
