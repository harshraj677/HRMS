import { eachDayOfInterval, isWeekend, parseISO } from "date-fns";

export type DurationType = "full_day" | "half_day" | "custom_hours";
export type SessionType = "first_half" | "second_half";

export const WORKING_HOURS_PER_DAY = 8;
export const COMPANY_START_TIME = "09:00";
export const COMPANY_END_TIME = "18:00";

export const SESSION_CONFIG: Record<
  SessionType,
  {
    label: string;
    shortLabel: string;
    start: string;
    end: string;
    displayStart: string;
    displayEnd: string;
  }
> = {
  first_half: {
    label: "First Half (Morning)",
    shortLabel: "Morning",
    start: "09:00",
    end: "13:00",
    displayStart: "09:00 AM",
    displayEnd: "01:00 PM",
  },
  second_half: {
    label: "Second Half (Afternoon)",
    shortLabel: "Afternoon",
    start: "14:00",
    end: "18:00",
    displayStart: "02:00 PM",
    displayEnd: "06:00 PM",
  },
};

export interface LeaveCalculationParams {
  durationType: DurationType;
  startDate: string;
  endDate: string;
  sessionType?: SessionType;
  startTime?: string;
  endTime?: string;
  workingHoursPerDay?: number;
}

export interface LeaveCalculationResult {
  totalHours: number;
  totalDays: number;
  description: string;
  isValid: boolean;
  error?: string;
}

function countBusinessDays(start: Date, end: Date): number {
  if (start > end) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => !isWeekend(d)).length;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function calculateLeaveDuration(
  params: LeaveCalculationParams
): LeaveCalculationResult {
  const {
    durationType,
    startDate,
    endDate,
    sessionType = "first_half",
    startTime = "09:00",
    endTime = "18:00",
    workingHoursPerDay = WORKING_HOURS_PER_DAY,
  } = params;

  if (!startDate) {
    return {
      totalHours: 0,
      totalDays: 0,
      description: "Select a date to calculate",
      isValid: false,
    };
  }

  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate || startDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        totalHours: 0,
        totalDays: 0,
        description: "Invalid dates",
        isValid: false,
        error: "Invalid dates",
      };
    }

    if (start > end) {
      return {
        totalHours: 0,
        totalDays: 0,
        description: "",
        isValid: false,
        error: "Start date must be before end date",
      };
    }

    if (durationType === "full_day") {
      const businessDays = countBusinessDays(start, end);
      if (businessDays === 0) {
        return {
          totalHours: 0,
          totalDays: 0,
          description: "No working days in selected range",
          isValid: false,
          error: "Selected range contains no working days (weekends only)",
        };
      }
      const totalHours = businessDays * workingHoursPerDay;
      return {
        totalHours,
        totalDays: businessDays,
        description:
          businessDays === 1 ? "1 Working Day" : `${businessDays} Working Days`,
        isValid: true,
      };
    }

    if (durationType === "half_day") {
      const cfg = SESSION_CONFIG[sessionType];
      return {
        totalHours: 4,
        totalDays: 0.5,
        description: `${cfg.displayStart} – ${cfg.displayEnd}`,
        isValid: true,
      };
    }

    if (durationType === "custom_hours") {
      const startMins = timeToMinutes(startTime);
      const endMins = timeToMinutes(endTime);
      const diffMins = endMins - startMins;

      if (diffMins <= 0) {
        return {
          totalHours: 0,
          totalDays: 0,
          description: "",
          isValid: false,
          error: "End time must be after start time",
        };
      }

      const totalHours = parseFloat((diffMins / 60).toFixed(2));
      const totalDays = parseFloat(
        (totalHours / workingHoursPerDay).toFixed(4)
      );
      const h = Math.floor(totalHours);
      const m = Math.round((totalHours - h) * 60);
      const timeLabel =
        m > 0 ? `${h}h ${m}m` : `${h} Hour${h !== 1 ? "s" : ""}`;

      return {
        totalHours,
        totalDays,
        description: timeLabel,
        isValid: true,
      };
    }

    return { totalHours: 0, totalDays: 0, description: "", isValid: false };
  } catch {
    return {
      totalHours: 0,
      totalDays: 0,
      description: "Calculation error",
      isValid: false,
    };
  }
}

export function formatEquivalentDays(totalDays: number): string {
  if (totalDays === 0) return "—";
  if (totalDays === 0.5) return "0.5 Day";
  if (totalDays === 1) return "1 Day";
  if (Number.isInteger(totalDays)) return `${totalDays} Days`;
  return `${totalDays.toFixed(2)} Days`;
}

export function formatDaysLabel(days: number): string {
  if (days === 0.5) return "0.5 day";
  if (days === 1) return "1 day";
  if (Number.isInteger(days)) return `${days} days`;
  return `${days.toFixed(2)} days`;
}
