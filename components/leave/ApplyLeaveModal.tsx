"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Timer,
  Sun,
  Sunset,
  Info,
  Loader2,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  calculateLeaveDuration,
  formatEquivalentDays,
  SESSION_CONFIG,
  type DurationType,
  type SessionType,
} from "@/lib/leaveCalculations";
import { useSubmitLeaveRequest } from "@/hooks/useLeave";
import { useAuth } from "@/hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_TYPES: {
  value: DurationType;
  label: string;
  mobileLabel: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  {
    value:       "full_day",
    label:       "Full Day",
    mobileLabel: "Full",
    icon:        CalendarDays,
    desc:        "One or more complete working days",
  },
  {
    value:       "half_day",
    label:       "Half Day",
    mobileLabel: "Half",
    icon:        Sun,
    desc:        "Morning or afternoon session (4 hrs)",
  },
  {
    value:       "custom_hours",
    label:       "Custom Hours",
    mobileLabel: "Custom",
    icon:        Timer,
    desc:        "Any time range on a working day",
  },
];

const LEAVE_CATEGORIES = [
  { value: "casual",      label: "Casual Leave" },
  { value: "sick",        label: "Sick Leave" },
  { value: "earned",      label: "Earned Leave" },
  { value: "maternity",   label: "Maternity Leave" },
  { value: "paternity",   label: "Paternity Leave" },
  { value: "comp_off",    label: "Comp Off" },
  { value: "loss_of_pay", label: "Loss of Pay" },
  { value: "wfh",         label: "Work From Home" },
  { value: "unpaid",      label: "Unpaid Leave" },
];

// ─── Zod schema ───────────────────────────────────────────────────────────────

const leaveSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate:   z.string().optional(),
    startTime: z.string().optional(),
    endTime:   z.string().optional(),
    category:  z.string().default("casual"),
    reason:    z
      .string()
      .min(10, "Reason must be at least 10 characters")
      .max(250, "Reason cannot exceed 250 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code:    "custom",
        path:    ["endDate"],
        message: "End date cannot be before start date",
      });
    }
  });

type LeaveFormValues = z.infer<typeof leaveSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
      <AlertTriangle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApplyLeaveModal() {
  const [open, setOpen]               = useState(false);
  const [durationType, setDurationType] = useState<DurationType>("full_day");
  const [sessionType, setSessionType]   = useState<SessionType>("first_half");

  const { data: user }     = useAuth();
  const submitLeave        = useSubmitLeaveRequest();
  const leaveBalance: number = user?.leaveBalance ?? 0;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver:      zodResolver(leaveSchema),
    defaultValues: {
      startDate: "",
      endDate:   "",
      startTime: "09:00",
      endTime:   "18:00",
      category:  "casual",
      reason:    "",
    },
  });

  const startDate = watch("startDate");
  const endDate   = watch("endDate");
  const startTime = watch("startTime");
  const endTime   = watch("endTime");
  const reason    = watch("reason");

  // Keep endDate in sync when half_day is selected
  useEffect(() => {
    if (durationType === "half_day" && startDate) {
      setValue("endDate", startDate);
    }
  }, [durationType, startDate, setValue]);

  // Live leave duration calculation
  const calculation = useMemo(
    () =>
      calculateLeaveDuration({
        durationType,
        startDate,
        endDate: durationType === "half_day" ? startDate : endDate ?? "",
        sessionType,
        startTime: startTime ?? "09:00",
        endTime:   endTime   ?? "18:00",
      }),
    [durationType, startDate, endDate, sessionType, startTime, endTime]
  );

  const hasInsufficientBalance =
    calculation.isValid && calculation.totalDays > leaveBalance;

  const canSubmit =
    calculation.isValid && !hasInsufficientBalance && !submitLeave.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleDurationChange(type: DurationType) {
    setDurationType(type);
    if (type === "full_day" || type === "custom_hours") {
      setValue("startTime", "09:00");
      setValue("endTime",   "18:00");
    }
  }

  function handleCancel() {
    reset();
    setDurationType("full_day");
    setSessionType("first_half");
    setOpen(false);
  }

  async function onSubmit(data: LeaveFormValues) {
    if (!canSubmit) return;

    const effectiveEnd =
      durationType === "half_day"
        ? data.startDate
        : data.endDate || data.startDate;

    await submitLeave.mutateAsync({
      startDate:   data.startDate,
      endDate:     effectiveEnd,
      durationType,
      sessionType:
        durationType === "half_day" ? sessionType : undefined,
      startTime:
        durationType === "custom_hours" ? (data.startTime ?? undefined) : undefined,
      endTime:
        durationType === "custom_hours" ? (data.endTime ?? undefined) : undefined,
      category:   data.category,
      reason:     data.reason,
      totalHours: calculation.totalHours,
      totalDays:  calculation.totalDays,
    });

    handleCancel();
  }

  const charCount = reason?.length ?? 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* ─── Trigger ──────────────────────────────────────────────────── */}
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-sm shadow-indigo-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Apply Leave
        </button>
      </DialogTrigger>

      {/* ─── Modal ────────────────────────────────────────────────────── */}
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] flex flex-col overflow-hidden rounded-2xl p-0 gap-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                Apply for Leave
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Submit your request for manager review
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 pt-5 pb-6 space-y-5"
        >
          {/* ── Section 1: Duration Type ──────────────────────────────── */}
          <div>
            <SectionLabel>Duration Type</SectionLabel>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              {DURATION_TYPES.map(({ value, label, mobileLabel, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleDurationChange(value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all duration-150 select-none",
                    durationType === value
                      ? "bg-white shadow-sm text-indigo-700 font-semibold ring-1 ring-indigo-100"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{mobileLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Section 2: Leave Period ───────────────────────────────── */}
          <div>
            <SectionLabel>Leave Period</SectionLabel>

            <AnimatePresence mode="wait" initial={false}>
              {durationType === "half_day" ? (
                /* ── Half Day: single date + session cards ─────────── */
                <motion.div
                  key="half_day"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div>
                    <Label className="text-xs text-slate-500 font-medium">Date</Label>
                    <Input
                      type="date"
                      className={cn(
                        "mt-1.5 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500",
                        errors.startDate && "border-red-400 bg-red-50/60"
                      )}
                      {...register("startDate")}
                    />
                    <FieldError message={errors.startDate?.message} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">
                      Select Session
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(["first_half", "second_half"] as SessionType[]).map(
                        (session) => {
                          const cfg      = SESSION_CONFIG[session];
                          const selected = sessionType === session;
                          return (
                            <button
                              key={session}
                              type="button"
                              onClick={() => setSessionType(session)}
                              className={cn(
                                "p-3.5 rounded-xl border-2 text-left transition-all duration-150 group",
                                selected
                                  ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/80"
                              )}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  {session === "first_half" ? (
                                    <Sun className="w-4 h-4 text-amber-500" />
                                  ) : (
                                    <Sunset className="w-4 h-4 text-orange-500" />
                                  )}
                                  <span
                                    className={cn(
                                      "text-sm font-semibold",
                                      selected ? "text-indigo-700" : "text-slate-700"
                                    )}
                                  >
                                    {cfg.shortLabel}
                                  </span>
                                </div>
                                {selected && (
                                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                                )}
                              </div>
                              <p
                                className={cn(
                                  "text-[11px] font-medium",
                                  selected ? "text-indigo-500" : "text-slate-400"
                                )}
                              >
                                {cfg.displayStart} – {cfg.displayEnd}
                              </p>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ── Full Day / Custom Hours: two-column grid ──────── */
                <motion.div
                  key="date_range"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {/* FROM */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      From
                    </Label>
                    <Input
                      type="date"
                      className={cn(
                        "h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500",
                        errors.startDate && "border-red-400 bg-red-50/60"
                      )}
                      {...register("startDate")}
                    />
                    <FieldError message={errors.startDate?.message} />

                    {durationType === "custom_hours" && (
                      <>
                        <Input
                          type="time"
                          className={cn(
                            "h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500",
                            errors.startTime && "border-red-400 bg-red-50/60"
                          )}
                          {...register("startTime")}
                        />
                        <FieldError message={errors.startTime?.message} />
                      </>
                    )}
                  </div>

                  {/* TO */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      To
                    </Label>
                    <Input
                      type="date"
                      className={cn(
                        "h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500",
                        errors.endDate && "border-red-400 bg-red-50/60"
                      )}
                      {...register("endDate")}
                    />
                    <FieldError message={errors.endDate?.message} />

                    {durationType === "custom_hours" && (
                      <>
                        <Input
                          type="time"
                          className={cn(
                            "h-11 rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-500",
                            errors.endTime && "border-red-400 bg-red-50/60"
                          )}
                          {...register("endTime")}
                        />
                        <FieldError message={errors.endTime?.message} />
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Validation error from calculation engine */}
            {calculation.error && (startDate || endDate) && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {calculation.error}
              </p>
            )}
          </div>

          {/* ── Section 3: Leave Summary ──────────────────────────────── */}
          <AnimatePresence>
            {calculation.isValid && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50/80 border border-indigo-100 rounded-xl">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">
                    Leave Summary
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-slate-400 mb-1">
                        Total Duration
                      </p>
                      <p className="text-2xl font-bold text-indigo-700 leading-none tabular-nums">
                        {calculation.totalHours}
                        <span className="text-sm font-medium text-indigo-400 ml-1">
                          hrs
                        </span>
                      </p>
                      {calculation.description && (
                        <p className="text-xs text-indigo-400 mt-1 leading-tight">
                          {calculation.description}
                        </p>
                      )}
                    </div>
                    <div className="pl-4 border-l border-indigo-100">
                      <p className="text-[11px] text-slate-400 mb-1">
                        Equivalent Leave
                      </p>
                      <p className="text-2xl font-bold text-indigo-700 leading-none tabular-nums">
                        {formatEquivalentDays(calculation.totalDays)}
                      </p>
                      <p className="text-xs text-indigo-400 mt-1">@ 8 hrs / day</p>
                    </div>
                  </div>

                  {/* Balance indicator strip */}
                  <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Leave balance remaining</p>
                    <p
                      className={cn(
                        "text-xs font-bold",
                        hasInsufficientBalance ? "text-red-500" : "text-emerald-600"
                      )}
                    >
                      {leaveBalance % 1 === 0
                        ? leaveBalance
                        : leaveBalance.toFixed(1)}{" "}
                      day{leaveBalance !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Section 4: Leave Category ─────────────────────────────── */}
          <div>
            <SectionLabel>Leave Category</SectionLabel>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                aria-label="Leave category"
                className={cn(
                  "w-full h-11 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-200",
                  "text-sm text-slate-700 appearance-none cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0",
                  "transition-colors hover:border-slate-300"
                )}
                {...register("category")}
              >
                {LEAVE_CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {/* Chevron indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Section 5: Company Working Hours ─────────────────────── */}
          <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">
                Company Working Hours
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                09:00 AM – 06:00 PM · Monday to Friday · 8 hours / day
              </p>
            </div>
            <Info className="w-4 h-4 text-slate-300 ml-auto shrink-0 mt-0.5" />
          </div>

          {/* ── Section 6: Reason ─────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <SectionLabel>Reason</SectionLabel>
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  charCount > 230
                    ? "text-red-500"
                    : charCount > 200
                    ? "text-amber-500"
                    : "text-slate-400"
                )}
              >
                {charCount} / 250
              </span>
            </div>
            <Textarea
              placeholder="Briefly describe the reason for your leave request…"
              maxLength={250}
              className={cn(
                "min-h-[90px] resize-none rounded-xl bg-slate-50 border-slate-200 text-sm",
                "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0",
                errors.reason && "border-red-400 bg-red-50/60"
              )}
              {...register("reason")}
            />
            <FieldError message={errors.reason?.message} />
          </div>

          {/* ── Insufficient Balance Warning ──────────────────────────── */}
          <AnimatePresence>
            {hasInsufficientBalance && (
              <motion.div
                key="balance-warn"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Insufficient Leave Balance
                  </p>
                  <p className="text-xs text-red-500 mt-0.5">
                    You have{" "}
                    <strong>
                      {leaveBalance % 1 === 0 ? leaveBalance : leaveBalance.toFixed(1)}{" "}
                      day{leaveBalance !== 1 ? "s" : ""}
                    </strong>{" "}
                    remaining, but this request requires{" "}
                    <strong>
                      {calculation.totalDays % 1 === 0
                        ? calculation.totalDays
                        : calculation.totalDays.toFixed(2)}{" "}
                      day{calculation.totalDays !== 1 ? "s" : ""}
                    </strong>
                    .
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Footer Buttons ────────────────────────────────────────── */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "flex-1 h-11 rounded-xl text-white text-sm font-semibold transition-all",
                "flex items-center justify-center gap-2",
                "active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
                hasInsufficientBalance
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20"
              )}
            >
              {submitLeave.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Leave Request"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
