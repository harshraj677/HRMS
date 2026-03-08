import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── API Functions ────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),

  logout: () => apiClient.post("/auth/logout"),

  // Dashboard
  getDashboardStats: () =>
    apiClient.get("/dashboard/stats"),

  // Employees
  getEmployees: (params?: { department?: string; search?: string; page?: number }) =>
    apiClient.get("/employees", { params }),

  getEmployee: (id: string) =>
    apiClient.get(`/employees/${id}`),

  // Attendance
  getTodayAttendance: () =>
    apiClient.get("/attendance/today"),

  checkIn: () =>
    apiClient.post("/attendance/checkin"),

  checkOut: () =>
    apiClient.post("/attendance/checkout"),

  getAttendanceHistory: (employeeId?: string, params?: { month?: number; year?: number }) =>
    apiClient.get(`/attendance/history${employeeId ? `/${employeeId}` : ""}`, { params }),

  getAttendanceTrend: () =>
    apiClient.get("/attendance/trend"),

  // Leave
  getLeaveRequests: (params?: { status?: string; page?: number }) =>
    apiClient.get("/leave/requests", { params }),

  submitLeaveRequest: (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => apiClient.post("/leave/request", data),

  approveLeave: (id: string) =>
    apiClient.patch(`/leave/${id}/approve`),

  rejectLeave: (id: string, reason: string) =>
    apiClient.patch(`/leave/${id}/reject`, { reason }),

  getLeaveBalance: () =>
    apiClient.get("/leave/balance"),

  // Messages
  getMessages: () => apiClient.get("/messages"),
  sendMessage: (data: { to: string; subject: string; body: string }) =>
    apiClient.post("/messages", data),

  // Calendar
  getCalendarEvents: (month?: number, year?: number) =>
    apiClient.get("/calendar/events", { params: { month, year } }),

  // Analytics
  getAnalytics: () => apiClient.get("/analytics"),
};
