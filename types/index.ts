// ─── User & Authentication ──────────────────────────────────────────────────

export type UserRole = "admin" | "hr" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department: string;
  position: string;
  employeeId: string;
  joinDate: string;
  phone: string;
  status: "active" | "inactive";
}

// ─── Employee ────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  role: UserRole;
  joinDate: string;
  status: "active" | "inactive" | "on-leave";
  avatar?: string;
  manager?: string;
  location: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "late" | "half-day" | "on-leave";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  notes?: string;
}

export interface TodayAttendance {
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus | "not-checked-in";
  hoursWorked?: number;
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export type LeaveType = "annual" | "sick" | "casual" | "maternity" | "paternity" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  rejectionReason?: string;
}

export interface LeaveBalance {
  annual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
  casual: { total: number; used: number; remaining: number };
  maternity?: { total: number; used: number; remaining: number };
  paternity?: { total: number; used: number; remaining: number };
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingLeaveRequests: number;
  percentPresent: number;
  percentChange: {
    employees: number;
    present: number;
    leave: number;
    pending: number;
  };
}

// ─── Charts ───────────────────────────────────────────────────────────────────

export interface AttendanceTrendData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface LeaveDistributionData {
  name: string;
  value: number;
  color: string;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export type MessageStatus = "unread" | "read" | "sent";

export interface Message {
  id: string;
  from: string;
  fromId: string;
  to: string;
  toId: string;
  subject: string;
  body: string;
  timestamp: string;
  status: MessageStatus;
  avatar?: string;
}

// ─── Calendar Event ───────────────────────────────────────────────────────────

export type CalendarEventType = "leave" | "holiday" | "meeting" | "event";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: CalendarEventType;
  employeeId?: string;
  employeeName?: string;
  color: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
