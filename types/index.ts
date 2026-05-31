// ─── User & Authentication ──────────────────────────────────────────────────

export type UserRole = "admin" | "employee";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  position?: string;
  phone?: string;
  leaveBalance: number;
  mustChangePassword: boolean;
  status: string;
  createdAt: string;
}

// ─── Employee ────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string;
  leaveBalance: number;
  status: string;
  createdAt: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "late" | "half-day" | "on-leave" | "not-checked-in";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  ipAddress: string | null;
  device: string | null;
  distanceFromOffice: number | null;
  checkInAddress?: string | null;
  checkOutAddress?: string | null;
  checkInPhoto?: string | null;
  checkOutPhoto?: string | null;
  fullName?: string;
}

export interface TodayAttendance {
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  hours: number | null;
  checkInAddress?: string | null;
  checkOutAddress?: string | null;
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvedBy: string | null;
  createdAt: string;
  fullName?: string;
  department?: string | null;
  leaveBalance?: number;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingLeaveRequests: number;
  lateToday: number;
  percentPresent: number;
}

// ─── Charts ───────────────────────────────────────────────────────────────────

export interface AttendanceTrendData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface DepartmentAttendanceData {
  department: string;
  present: number;
  absent: number;
  late: number;
}

// ─── Login History ────────────────────────────────────────────────────────────

export interface LoginHistoryEntry {
  id: string;
  employeeId: string;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  loginTime: string;
  success: boolean;
  fullName?: string;
}

// ─── Suspicious Log ──────────────────────────────────────────────────────────

export interface SuspiciousLogEntry {
  id: string;
  employeeId: string;
  type: string;
  description: string;
  ipAddress: string | null;
  createdAt: string;
  fullName?: string;
}

// ─── Attendance Map Marker ────────────────────────────────────────────────────

export interface AttendanceMapMarker {
  id: string;
  employeeId: string;
  fullName: string;
  latitude: number;
  longitude: number;
  checkIn: string;
  distanceFromOffice: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
