import { describe, it, expect } from "vitest";
import {
  getCurrentPeriod,
  getPeriodRange,
  previousPeriod,
  nextPeriod,
  periodLabel,
  countWorkingDaysInRange,
  computeAttendanceScore,
  computeTaskScore,
  computeLeaveScore,
  computeOverallScore,
  getPerformanceBand,
  classifyRecommendations,
} from "@/lib/performance";

describe("period helpers", () => {
  it("getCurrentPeriod returns the right format per period type", () => {
    const date = new Date(Date.UTC(2026, 5, 15)); // June 15, 2026
    expect(getCurrentPeriod("monthly", date)).toBe("2026-06");
    expect(getCurrentPeriod("quarterly", date)).toBe("2026-Q2");
    expect(getCurrentPeriod("yearly", date)).toBe("2026");
  });

  it("getPeriodRange computes correct ranges", () => {
    expect(getPeriodRange("2026-06", "monthly")).toEqual({
      start: new Date(Date.UTC(2026, 5, 1)),
      end: new Date(Date.UTC(2026, 6, 1)),
    });
    expect(getPeriodRange("2026-Q2", "quarterly")).toEqual({
      start: new Date(Date.UTC(2026, 3, 1)),
      end: new Date(Date.UTC(2026, 6, 1)),
    });
    expect(getPeriodRange("2026", "yearly")).toEqual({
      start: new Date(Date.UTC(2026, 0, 1)),
      end: new Date(Date.UTC(2027, 0, 1)),
    });
  });

  it("previousPeriod handles year/quarter/month rollover", () => {
    expect(previousPeriod("2026-01", "monthly")).toBe("2025-12");
    expect(previousPeriod("2026-06", "monthly")).toBe("2026-05");
    expect(previousPeriod("2026-Q1", "quarterly")).toBe("2025-Q4");
    expect(previousPeriod("2026-Q3", "quarterly")).toBe("2026-Q2");
    expect(previousPeriod("2026", "yearly")).toBe("2025");
  });

  it("nextPeriod handles year/quarter/month rollover", () => {
    expect(nextPeriod("2025-12", "monthly")).toBe("2026-01");
    expect(nextPeriod("2026-05", "monthly")).toBe("2026-06");
    expect(nextPeriod("2025-Q4", "quarterly")).toBe("2026-Q1");
    expect(nextPeriod("2026-Q2", "quarterly")).toBe("2026-Q3");
    expect(nextPeriod("2025", "yearly")).toBe("2026");
  });

  it("periodLabel formats human-friendly labels", () => {
    expect(periodLabel("2026-06", "monthly")).toBe("June 2026");
    expect(periodLabel("2026-Q2", "quarterly")).toBe("2026 · Q2");
    expect(periodLabel("2026", "yearly")).toBe("2026");
  });

  it("countWorkingDaysInRange excludes Sundays", () => {
    // June 1-7, 2026: Mon..Sun -> 6 working days
    const start = new Date(Date.UTC(2026, 5, 1));
    const end = new Date(Date.UTC(2026, 5, 8));
    expect(countWorkingDaysInRange(start, end)).toBe(6);
  });
});

describe("score computations", () => {
  it("computeAttendanceScore penalizes absences and lateness", () => {
    expect(computeAttendanceScore({ workingDays: 0, presentDays: 0, lateDays: 0 })).toBe(0);
    expect(computeAttendanceScore({ workingDays: 20, presentDays: 20, lateDays: 0 })).toBe(100);
    expect(computeAttendanceScore({ workingDays: 20, presentDays: 18, lateDays: 0 })).toBe(90);
    expect(computeAttendanceScore({ workingDays: 20, presentDays: 20, lateDays: 5 })).toBe(90); // capped at 20pt penalty
    expect(computeAttendanceScore({ workingDays: 20, presentDays: 10, lateDays: 0 })).toBe(50);
  });

  it("computeTaskScore returns neutral baseline with no assigned tasks", () => {
    expect(computeTaskScore({ tasksAssigned: 0, tasksCompleted: 0, tasksOverdue: 0 })).toBe(70);
  });

  it("computeTaskScore rewards completion and penalizes overdue tasks", () => {
    expect(computeTaskScore({ tasksAssigned: 10, tasksCompleted: 10, tasksOverdue: 0 })).toBe(100);
    expect(computeTaskScore({ tasksAssigned: 10, tasksCompleted: 5, tasksOverdue: 0 })).toBe(50);
    expect(computeTaskScore({ tasksAssigned: 10, tasksCompleted: 10, tasksOverdue: 4 })).toBe(70); // capped at 30pt penalty
  });

  it("computeLeaveScore rewards moderate leave usage", () => {
    expect(computeLeaveScore(0, 18)).toBe(100);
    expect(computeLeaveScore(9, 18)).toBe(100); // 50% usage
    expect(computeLeaveScore(27, 18)).toBe(50); // 150% usage
    expect(computeLeaveScore(5, 0)).toBe(100); // no balance configured
  });

  it("computeOverallScore redistributes weights when feedback/training are absent", () => {
    const base = {
      attendanceScore: 80,
      taskScore: 80,
      leaveScore: 80,
      trainingScore: 0,
      managerFeedbackScore: 0,
      peerFeedbackScore: 0,
      hasTraining: false,
      hasFeedback: false,
    };
    // All sub-scores equal -> overall should equal that value regardless of weighting
    expect(computeOverallScore(base)).toBe(80);
  });

  it("computeOverallScore incorporates feedback when present", () => {
    const withFeedback = {
      attendanceScore: 80,
      taskScore: 80,
      leaveScore: 80,
      trainingScore: 80,
      managerFeedbackScore: 40,
      peerFeedbackScore: 40,
      hasTraining: true,
      hasFeedback: true,
    };
    // Feedback (40) drags the overall score below 80
    expect(computeOverallScore(withFeedback)).toBeLessThan(80);
    expect(computeOverallScore(withFeedback)).toBeGreaterThan(40);
  });
});

describe("performance bands", () => {
  it("getPerformanceBand maps scores to bands", () => {
    expect(getPerformanceBand(95)).toBe("excellent");
    expect(getPerformanceBand(85)).toBe("excellent");
    expect(getPerformanceBand(75)).toBe("good");
    expect(getPerformanceBand(60)).toBe("average");
    expect(getPerformanceBand(45)).toBe("needs_improvement");
    expect(getPerformanceBand(20)).toBe("at_risk");
  });
});

describe("classifyRecommendations", () => {
  it("flags high performers and surfaces promotion/appraisal review on a sustained streak", () => {
    const recs = classifyRecommendations({
      overallScore: 90,
      attendancePercent: 98,
      tasksOverdue: 0,
      previousScores: [88, 91],
    });
    const types = recs.map((r) => r.type);
    expect(types).toContain("high_performer");
    expect(types).toContain("promotion_review");
    expect(types).toContain("appraisal_review");
  });

  it("does not recommend promotion/appraisal without a sustained streak", () => {
    const recs = classifyRecommendations({
      overallScore: 90,
      attendancePercent: 98,
      tasksOverdue: 0,
      previousScores: [60, 65],
    });
    const types = recs.map((r) => r.type);
    expect(types).toContain("high_performer");
    expect(types).not.toContain("promotion_review");
    expect(types).not.toContain("appraisal_review");
  });

  it("flags low performers as needing attention", () => {
    const recs = classifyRecommendations({ overallScore: 40, attendancePercent: 90, tasksOverdue: 0 });
    expect(recs.map((r) => r.type)).toContain("needs_attention");
  });

  it("flags poor attendance and overdue tasks for review", () => {
    const recs = classifyRecommendations({ overallScore: 75, attendancePercent: 60, tasksOverdue: 5 });
    const review = recs.find((r) => r.type === "needs_review");
    expect(review).toBeDefined();
    expect(review!.note).toContain("attendance at 60%");
    expect(review!.note).toContain("5 overdue tasks");
  });
});
