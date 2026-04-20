import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** GET /api/analytics — admin analytics data */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  // Attendance trend: last 30 days daily stats
  const [trendRows] = await db.execute<RowDataPacket[]>(`
    SELECT
      DATE_FORMAT(a.date, '%b %d') as date,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
      (SELECT COUNT(*) FROM Employee WHERE role != 'admin') -
        COUNT(DISTINCT a.employeeId) as absent
    FROM Attendance a
    WHERE a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY a.date
    ORDER BY a.date ASC
  `);

  // Department-wise attendance (current month)
  const [deptRows] = await db.execute<RowDataPacket[]>(`
    SELECT
      COALESCE(e.department, 'Unassigned') as department,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN a.status = 'absent' OR a.status IS NULL THEN 1 ELSE 0 END) as absent
    FROM Employee e
    LEFT JOIN Attendance a ON a.employeeId = e.id
      AND MONTH(a.date) = MONTH(CURDATE())
      AND YEAR(a.date) = YEAR(CURDATE())
    WHERE e.role != 'admin'
    GROUP BY e.department
  `);

  // Monthly leave requests breakdown
  const [leaveMonthly] = await db.execute<RowDataPacket[]>(`
    SELECT
      DATE_FORMAT(createdAt, '%b') as month,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM LeaveRequest
    WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY YEAR(createdAt), MONTH(createdAt), DATE_FORMAT(createdAt, '%b')
    ORDER BY YEAR(createdAt), MONTH(createdAt) ASC
  `);

  // Employee attendance ranking (current month)
  const [rankingRows] = await db.execute<RowDataPacket[]>(`
    SELECT
      e.id, e.fullName, e.department,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as presentDays,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as lateDays,
      COUNT(a.id) as totalDays
    FROM Employee e
    LEFT JOIN Attendance a ON a.employeeId = e.id
      AND MONTH(a.date) = MONTH(CURDATE())
      AND YEAR(a.date) = YEAR(CURDATE())
    WHERE e.role != 'admin'
    GROUP BY e.id, e.fullName, e.department
    ORDER BY presentDays DESC
    LIMIT 10
  `);

  // Suspicious activity count
  const [suspiciousRows] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM SuspiciousLog WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
  );

  return NextResponse.json({
    attendanceTrend: trendRows,
    departmentAttendance: deptRows,
    leaveMonthly,
    employeeRanking: rankingRows,
    suspiciousCount: (suspiciousRows as RowDataPacket[])[0].total,
  });
}
