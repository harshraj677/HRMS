import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  DashboardStats,
  AttendanceTrendData,
  LeaveDistributionData,
  Message,
  CalendarEvent,
  LeaveBalance,
  TodayAttendance,
} from "@/types";

// ─── Employees ───────────────────────────────────────────────────────────────

export const mockEmployees: Employee[] = [
  {
    id: "1",
    employeeId: "AIEF001",
    name: "Arjun Sharma",
    email: "arjun.sharma@anvesana.org",
    phone: "+91 98765 43210",
    department: "Engineering",
    position: "Senior Software Engineer",
    role: "employee",
    joinDate: "2022-03-15",
    status: "active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
    manager: "Priya Nair",
    location: "Bangalore",
  },
  {
    id: "2",
    employeeId: "AIEF002",
    name: "Priya Nair",
    email: "priya.nair@anvesana.org",
    phone: "+91 87654 32109",
    department: "Engineering",
    position: "Engineering Manager",
    role: "admin",
    joinDate: "2021-01-10",
    status: "active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    location: "Bangalore",
  },
  {
    id: "3",
    employeeId: "AIEF003",
    name: "Rahul Verma",
    email: "rahul.verma@anvesana.org",
    phone: "+91 76543 21098",
    department: "Design",
    position: "UI/UX Designer",
    role: "employee",
    joinDate: "2023-06-01",
    status: "active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
    manager: "Priya Nair",
    location: "Mumbai",
  },
  {
    id: "4",
    employeeId: "AIEF004",
    name: "Sneha Patel",
    email: "sneha.patel@anvesana.org",
    phone: "+91 65432 10987",
    department: "Marketing",
    position: "Marketing Specialist",
    role: "employee",
    joinDate: "2022-09-20",
    status: "on-leave",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
    manager: "Vikram Iyer",
    location: "Delhi",
  },
  {
    id: "5",
    employeeId: "AIEF005",
    name: "Vikram Iyer",
    email: "vikram.iyer@anvesana.org",
    phone: "+91 54321 09876",
    department: "Marketing",
    position: "Marketing Head",
    role: "hr",
    joinDate: "2020-11-05",
    status: "active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
    location: "Chennai",
  },
  {
    id: "6",
    employeeId: "AIEF006",
    name: "Ananya Krishnan",
    email: "ananya.krishnan@anvesana.org",
    phone: "+91 43210 98765",
    department: "Operations",
    position: "Operations Analyst",
    role: "employee",
    joinDate: "2023-01-15",
    status: "active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
    manager: "Priya Nair",
    location: "Hyderabad",
  },
  {
    id: "7",
    employeeId: "AIEF007",
    name: "Rohan Gupta",
    email: "rohan.gupta@anvesana.org",
    phone: "+91 32109 87654",
    department: "Finance",
    position: "Financial Analyst",
    role: "employee",
    joinDate: "2022-07-12",
    status: "active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan",
    manager: "Vikram Iyer",
    location: "Pune",
  },
  {
    id: "8",
    employeeId: "AIEF008",
    name: "Meera Reddy",
    email: "meera.reddy@anvesana.org",
    phone: "+91 21098 76543",
    department: "HR",
    position: "HR Manager",
    role: "hr",
    joinDate: "2021-04-22",
    status: "active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Meera",
    location: "Bangalore",
  },
  {
    id: "9",
    employeeId: "AIEF009",
    name: "Karthik Menon",
    email: "karthik.menon@anvesana.org",
    phone: "+91 10987 65432",
    department: "Engineering",
    position: "Backend Developer",
    role: "employee",
    joinDate: "2023-08-01",
    status: "active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Karthik",
    manager: "Priya Nair",
    location: "Bangalore",
  },
  {
    id: "10",
    employeeId: "AIEF010",
    name: "Divya Joshi",
    email: "divya.joshi@anvesana.org",
    phone: "+91 09876 54321",
    department: "Design",
    position: "Graphic Designer",
    role: "employee",
    joinDate: "2023-03-10",
    status: "inactive",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Divya",
    manager: "Rahul Verma",
    location: "Mumbai",
  },
];

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const mockDashboardStats: DashboardStats = {
  totalEmployees: 10,
  presentToday: 8,
  onLeave: 1,
  pendingLeaveRequests: 3,
  percentPresent: 80,
  percentChange: {
    employees: 5,
    present: 2,
    leave: -1,
    pending: 1,
  },
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const mockAttendanceRecords: AttendanceRecord[] = [
  { id: "a1", employeeId: "1", date: "2026-03-07", checkIn: "09:05", checkOut: "18:10", status: "present", hoursWorked: 9.1 },
  { id: "a2", employeeId: "1", date: "2026-03-06", checkIn: "09:20", checkOut: "18:00", status: "present", hoursWorked: 8.7 },
  { id: "a3", employeeId: "1", date: "2026-03-05", checkIn: "10:15", checkOut: "18:30", status: "late", hoursWorked: 8.25 },
  { id: "a4", employeeId: "1", date: "2026-03-04", checkIn: "09:00", checkOut: "13:00", status: "half-day", hoursWorked: 4.0 },
  { id: "a5", employeeId: "1", date: "2026-03-03", status: "absent" },
  { id: "a6", employeeId: "1", date: "2026-02-28", checkIn: "09:02", checkOut: "18:05", status: "present", hoursWorked: 9.05 },
  { id: "a7", employeeId: "1", date: "2026-02-27", checkIn: "09:10", checkOut: "18:00", status: "present", hoursWorked: 8.8 },
];

export const mockTodayAttendance: TodayAttendance = {
  checkIn: "09:05",
  status: "present",
  hoursWorked: undefined,
};

// ─── Attendance Trend ─────────────────────────────────────────────────────────

export const mockAttendanceTrend: AttendanceTrendData[] = [
  { date: "Feb 9", present: 8, absent: 2, late: 1 },
  { date: "Feb 10", present: 9, absent: 1, late: 0 },
  { date: "Feb 11", present: 7, absent: 3, late: 2 },
  { date: "Feb 12", present: 10, absent: 0, late: 0 },
  { date: "Feb 13", present: 8, absent: 2, late: 1 },
  { date: "Feb 17", present: 9, absent: 1, late: 1 },
  { date: "Feb 18", present: 8, absent: 2, late: 0 },
  { date: "Feb 19", present: 7, absent: 3, late: 2 },
  { date: "Feb 20", present: 9, absent: 1, late: 1 },
  { date: "Feb 24", present: 10, absent: 0, late: 0 },
  { date: "Feb 25", present: 8, absent: 2, late: 1 },
  { date: "Feb 26", present: 9, absent: 1, late: 0 },
  { date: "Feb 27", present: 7, absent: 3, late: 2 },
  { date: "Feb 28", present: 8, absent: 2, late: 1 },
  { date: "Mar 3", present: 9, absent: 1, late: 0 },
  { date: "Mar 4", present: 8, absent: 2, late: 1 },
  { date: "Mar 5", present: 7, absent: 3, late: 2 },
  { date: "Mar 6", present: 9, absent: 1, late: 1 },
  { date: "Mar 7", present: 8, absent: 2, late: 1 },
];

// ─── Leave Distribution ───────────────────────────────────────────────────────

export const mockLeaveDistribution: LeaveDistributionData[] = [
  { name: "Annual", value: 45, color: "#6366f1" },
  { name: "Sick", value: 25, color: "#f43f5e" },
  { name: "Casual", value: 15, color: "#f59e0b" },
  { name: "Maternity", value: 10, color: "#8b5cf6" },
  { name: "Unpaid", value: 5, color: "#94a3b8" },
];

// ─── Leave Requests ───────────────────────────────────────────────────────────

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: "l1", employeeId: "4", employeeName: "Sneha Patel",
    leaveType: "annual", startDate: "2026-03-04", endDate: "2026-03-08",
    days: 5, reason: "Family vacation", status: "approved",
    appliedOn: "2026-02-28", approvedBy: "Meera Reddy", approvedOn: "2026-03-01",
  },
  {
    id: "l2", employeeId: "1", employeeName: "Arjun Sharma",
    leaveType: "sick", startDate: "2026-03-10", endDate: "2026-03-11",
    days: 2, reason: "Not feeling well", status: "pending",
    appliedOn: "2026-03-07",
  },
  {
    id: "l3", employeeId: "3", employeeName: "Rahul Verma",
    leaveType: "casual", startDate: "2026-03-15", endDate: "2026-03-15",
    days: 1, reason: "Personal work", status: "pending",
    appliedOn: "2026-03-06",
  },
  {
    id: "l4", employeeId: "6", employeeName: "Ananya Krishnan",
    leaveType: "annual", startDate: "2026-03-20", endDate: "2026-03-22",
    days: 3, reason: "Short trip", status: "pending",
    appliedOn: "2026-03-05",
  },
  {
    id: "l5", employeeId: "9", employeeName: "Karthik Menon",
    leaveType: "sick", startDate: "2026-02-20", endDate: "2026-02-21",
    days: 2, reason: "Fever", status: "approved",
    appliedOn: "2026-02-19", approvedBy: "Meera Reddy",
  },
  {
    id: "l6", employeeId: "7", employeeName: "Rohan Gupta",
    leaveType: "casual", startDate: "2026-02-14", endDate: "2026-02-14",
    days: 1, reason: "Personal work", status: "rejected",
    appliedOn: "2026-02-12", rejectionReason: "Critical deadline",
  },
];

// ─── Leave Balance ────────────────────────────────────────────────────────────

export const mockLeaveBalance: LeaveBalance = {
  annual: { total: 21, used: 5, remaining: 16 },
  sick: { total: 10, used: 2, remaining: 8 },
  casual: { total: 7, used: 1, remaining: 6 },
  maternity: { total: 90, used: 0, remaining: 90 },
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const mockMessages: Message[] = [
  {
    id: "m1", from: "Meera Reddy", fromId: "8", to: "Arjun Sharma", toId: "1",
    subject: "Leave Policy Update",
    body: "Hi Arjun, please note that the annual leave policy has been updated for FY 2026-27. Kindly review the updated policy document shared on the portal.",
    timestamp: "2026-03-07T10:30:00", status: "unread",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Meera",
  },
  {
    id: "m2", from: "Priya Nair", fromId: "2", to: "Arjun Sharma", toId: "1",
    subject: "Sprint Review Meeting",
    body: "Hi team, please join the sprint review meeting scheduled for March 8th at 2:00 PM. Agenda will be shared by EOD today.",
    timestamp: "2026-03-06T15:45:00", status: "read",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
  },
  {
    id: "m3", from: "HR Team", fromId: "8", to: "Arjun Sharma", toId: "1",
    subject: "Performance Review - March 2026",
    body: "Your quarterly performance review is scheduled for March 15, 2026. Please fill out the self-assessment form before the review.",
    timestamp: "2026-03-05T09:15:00", status: "read",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=HR",
  },
  {
    id: "m4", from: "Vikram Iyer", fromId: "5", to: "Arjun Sharma", toId: "1",
    subject: "Cross-team Collaboration Opportunity",
    body: "Hi Arjun, we have an exciting cross-team project coming up. Would you be interested in contributing to the marketing tech initiative?",
    timestamp: "2026-03-04T11:00:00", status: "read",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
  },
];

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: "e1", title: "Sneha Patel - Annual Leave", date: "2026-03-04",
    endDate: "2026-03-08", type: "leave", employeeId: "4",
    employeeName: "Sneha Patel", color: "#6366f1",
  },
  {
    id: "e2", title: "Arjun Sharma - Sick Leave", date: "2026-03-10",
    endDate: "2026-03-11", type: "leave", employeeId: "1",
    employeeName: "Arjun Sharma", color: "#f43f5e",
  },
  {
    id: "e3", title: "Rahul Verma - Casual Leave", date: "2026-03-15",
    endDate: "2026-03-15", type: "leave", employeeId: "3",
    employeeName: "Rahul Verma", color: "#f59e0b",
  },
  {
    id: "e4", title: "Holi Holiday", date: "2026-03-14",
    type: "holiday", color: "#10b981",
  },
  {
    id: "e5", title: "Quarterly Review", date: "2026-03-20",
    type: "meeting", color: "#8b5cf6",
  },
  {
    id: "e6", title: "Annual Day", date: "2026-03-31",
    type: "event", color: "#f97316",
  },
];
