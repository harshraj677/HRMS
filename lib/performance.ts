// ─── Period helpers ────────────────────────────────────────────────────────

export type PeriodType = "monthly" | "quarterly" | "yearly";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Returns the current period string for a given period type, e.g. "2026-06", "2026-Q2", "2026". */
export function getCurrentPeriod(periodType: PeriodType, date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  if (periodType === "yearly") return String(y);
  if (periodType === "quarterly") return `${y}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  return `${y}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Returns the [start, end) UTC date range covered by a period. */
export function getPeriodRange(period: string, periodType: PeriodType): { start: Date; end: Date } {
  if (periodType === "yearly") {
    const y = Number(period);
    return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)) };
  }
  if (periodType === "quarterly") {
    const [yStr, qStr] = period.split("-Q");
    const y = Number(yStr);
    const q = Number(qStr);
    const startMonth = (q - 1) * 3;
    return { start: new Date(Date.UTC(y, startMonth, 1)), end: new Date(Date.UTC(y, startMonth + 3, 1)) };
  }
  const [yStr, mStr] = period.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

/** Returns the period string immediately preceding `period`. */
export function previousPeriod(period: string, periodType: PeriodType): string {
  if (periodType === "yearly") return String(Number(period) - 1);
  if (periodType === "quarterly") {
    const [yStr, qStr] = period.split("-Q");
    let y = Number(yStr);
    let q = Number(qStr) - 1;
    if (q < 1) { q = 4; y -= 1; }
    return `${y}-Q${q}`;
  }
  const [yStr, mStr] = period.split("-");
  let y = Number(yStr);
  let m = Number(mStr) - 1;
  if (m < 1) { m = 12; y -= 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Returns the period string immediately following `period`. */
export function nextPeriod(period: string, periodType: PeriodType): string {
  if (periodType === "yearly") return String(Number(period) + 1);
  if (periodType === "quarterly") {
    const [yStr, qStr] = period.split("-Q");
    let y = Number(yStr);
    let q = Number(qStr) + 1;
    if (q > 4) { q = 1; y += 1; }
    return `${y}-Q${q}`;
  }
  const [yStr, mStr] = period.split("-");
  let y = Number(yStr);
  let m = Number(mStr) + 1;
  if (m > 12) { m = 1; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Human-friendly label for a period, e.g. "2026-06" -> "June 2026". */
export function periodLabel(period: string, periodType: PeriodType): string {
  if (periodType === "yearly") return period;
  if (periodType === "quarterly") return period.replace("-Q", " · Q");
  const [y, m] = period.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

/** Number of calendar days (Mon–Sat, 6-day work-week) in a date range. */
export function countWorkingDaysInRange(start: Date, end: Date): number {
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    if (cursor.getUTCDay() !== 0) count++; // exclude Sunday
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

// ─── Score computation ─────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export interface AttendanceStats {
  workingDays: number;
  presentDays: number;
  lateDays: number;
}

/** 0–100 attendance score, penalized for lateness. */
export function computeAttendanceScore({ workingDays, presentDays, lateDays }: AttendanceStats): number {
  if (workingDays <= 0) return 0;
  const attendancePercent = (presentDays / workingDays) * 100;
  const latePenalty = Math.min(20, lateDays * 2);
  return clamp(attendancePercent - latePenalty, 0, 100);
}

export interface TaskStats {
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
}

/** 0–100 task score based on completion rate, penalized for overdue tasks. */
export function computeTaskScore({ tasksAssigned, tasksCompleted, tasksOverdue }: TaskStats): number {
  if (tasksAssigned === 0) return 70; // neutral baseline — nothing assigned this period
  const completionRate = (tasksCompleted / tasksAssigned) * 100;
  const overduePenalty = Math.min(30, tasksOverdue * 10);
  return clamp(completionRate - overduePenalty, 0, 100);
}

/** 0–100 leave score — moderate leave usage scores highest, excessive usage scores lowest. */
export function computeLeaveScore(leavesTaken: number, leaveBalance: number): number {
  if (leaveBalance <= 0) return 100;
  const usageRatio = leavesTaken / leaveBalance;
  if (usageRatio <= 0.5) return 100;
  if (usageRatio >= 1.5) return 50;
  return clamp(100 - (usageRatio - 0.5) * 50, 50, 100);
}

export interface OverallScoreInputs {
  attendanceScore: number;
  taskScore: number;
  leaveScore: number;
  trainingScore: number;
  managerFeedbackScore: number;
  peerFeedbackScore: number;
  hasTraining: boolean;
  hasFeedback: boolean;
}

/**
 * Weighted overall score. Training and feedback weights only apply when that
 * data exists for the period, so periods without reviews/training aren't
 * unfairly dragged down by zeroed-out scores.
 */
export function computeOverallScore(input: OverallScoreInputs): number {
  let weights = { attendance: 35, task: 45, leave: 20, training: 0, feedback: 0 };
  if (input.hasFeedback && input.hasTraining) {
    weights = { attendance: 25, task: 35, leave: 10, training: 10, feedback: 20 };
  } else if (input.hasFeedback) {
    weights = { attendance: 30, task: 40, leave: 10, training: 0, feedback: 20 };
  } else if (input.hasTraining) {
    weights = { attendance: 30, task: 40, leave: 15, training: 15, feedback: 0 };
  }

  const feedbackScore = (input.managerFeedbackScore + input.peerFeedbackScore) / 2;
  const total =
    input.attendanceScore * weights.attendance +
    input.taskScore * weights.task +
    input.leaveScore * weights.leave +
    input.trainingScore * weights.training +
    feedbackScore * weights.feedback;
  const totalWeight = weights.attendance + weights.task + weights.leave + weights.training + weights.feedback;
  return clamp(total / totalWeight, 0, 100);
}

// ─── Bands & badges ─────────────────────────────────────────────────────────

export type PerformanceBand = "excellent" | "good" | "average" | "needs_improvement" | "at_risk";

export function getPerformanceBand(score: number): PerformanceBand {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "average";
  if (score >= 40) return "needs_improvement";
  return "at_risk";
}

export function getPerformanceBandStyle(band: PerformanceBand): { label: string; className: string } {
  switch (band) {
    case "excellent": return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
    case "good": return { label: "Good", className: "bg-sky-50 text-sky-700" };
    case "average": return { label: "Average", className: "bg-amber-50 text-amber-700" };
    case "needs_improvement": return { label: "Needs Improvement", className: "bg-orange-50 text-orange-700" };
    case "at_risk": return { label: "At Risk", className: "bg-red-50 text-red-700" };
  }
}

// ─── Recommendations (advisory only — never auto-applied) ──────────────────

export type RecommendationType =
  | "high_performer"
  | "consistent_performer"
  | "needs_attention"
  | "needs_review"
  | "promotion_review"
  | "appraisal_review";

export interface RecommendationContext {
  overallScore: number;
  attendancePercent: number;
  tasksOverdue: number;
  /** Most-recent-first overall scores from prior periods. */
  previousScores?: number[];
}

export const RECOMMENDATION_LABELS: Record<RecommendationType, { label: string; className: string }> = {
  high_performer:        { label: "High Performer",        className: "bg-emerald-50 text-emerald-700" },
  consistent_performer:  { label: "Consistent Performer",   className: "bg-sky-50 text-sky-700" },
  needs_attention:       { label: "Needs Attention",        className: "bg-red-50 text-red-700" },
  needs_review:          { label: "Flagged for Review",     className: "bg-amber-50 text-amber-700" },
  promotion_review:      { label: "Promotion Review",       className: "bg-violet-50 text-violet-700" },
  appraisal_review:      { label: "Appraisal Review",       className: "bg-indigo-50 text-indigo-700" },
};

/**
 * Derives advisory performance recommendations for a period. These are
 * informational signals only — the system never automatically changes
 * salary, role, or employment status. Final decisions remain with Admin.
 */
export function classifyRecommendations(ctx: RecommendationContext): { type: RecommendationType; note: string }[] {
  const { overallScore, attendancePercent, tasksOverdue, previousScores = [] } = ctx;
  const recs: { type: RecommendationType; note: string }[] = [];

  if (overallScore >= 85) {
    recs.push({ type: "high_performer", note: "Overall score is in the top performance band for this period." });
    const consistentlyHigh = previousScores.length >= 2 && previousScores.slice(0, 2).every((s) => s >= 80);
    if (consistentlyHigh) {
      recs.push({ type: "promotion_review", note: "Consistently high performance over the last 3 periods — consider for a promotion review." });
      recs.push({ type: "appraisal_review", note: "Consistently high performance over the last 3 periods — consider for a compensation review." });
    }
  } else if (overallScore >= 70) {
    recs.push({ type: "consistent_performer", note: "Steady, reliable performance this period." });
  } else if (overallScore < 50) {
    recs.push({ type: "needs_attention", note: "Overall score fell below the acceptable threshold for this period." });
  }

  const flags: string[] = [];
  if (attendancePercent < 75) flags.push(`attendance at ${Math.round(attendancePercent)}%`);
  if (tasksOverdue > 2) flags.push(`${tasksOverdue} overdue tasks`);
  if (flags.length > 0) {
    recs.push({ type: "needs_review", note: `Flagged for review: ${flags.join(" and ")}.` });
  }

  return recs;
}
