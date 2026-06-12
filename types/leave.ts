export type DurationType = "full_day" | "half_day" | "custom_hours";
export type SessionType = "first_half" | "second_half";

export type LeaveCategory =
  | "casual"
  | "sick"
  | "earned"
  | "maternity"
  | "paternity"
  | "comp_off"
  | "loss_of_pay"
  | "wfh"
  | "unpaid";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveSubmitPayload {
  startDate: string;
  endDate: string;
  durationType: DurationType;
  sessionType?: SessionType;
  startTime?: string;
  endTime?: string;
  category: string;
  reason: string;
  totalHours: number;
  totalDays: number;
}

export interface EnrichedLeaveRecord {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  totalHours: number;
  totalDays: number;
  durationType: string;
  sessionType: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  category: string;
  status: LeaveStatus;
  approvedBy: string | null;
  managerComment: string | null;
  createdAt: string;
  fullName?: string;
  department?: string | null;
  leaveBalance?: number;
}

export const LEAVE_CATEGORY_LABELS: Record<string, string> = {
  casual:      "Casual Leave",
  sick:        "Sick Leave",
  earned:      "Earned Leave",
  maternity:   "Maternity Leave",
  paternity:   "Paternity Leave",
  comp_off:    "Comp Off",
  loss_of_pay: "Loss of Pay",
  wfh:         "Work From Home",
  unpaid:      "Unpaid Leave",
};

export const DURATION_TYPE_LABELS: Record<string, string> = {
  full_day:     "Full Day",
  half_day:     "Half Day",
  custom_hours: "Custom Hours",
};
