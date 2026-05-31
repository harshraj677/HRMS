"use client";

import { useState, useEffect } from "react";
import {
  Users,
  CalendarCheck,
  ClipboardList,
  UserX,
  ArrowRight,
  Bell,
  Clock,
  LogIn,
  AlertTriangle,
  CalendarDays,
  Timer,
  CheckCircle,
  Sparkles,
  BriefcaseBusiness,
  Banknote,
  HeadphonesIcon,
  Rocket,
  MapPin,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useLeaveRequests, useApproveLeave, useRejectLeave } from "@/hooks/useLeave";
import { useAnnouncements } from "@/hooks/useOrg";
import { Megaphone, Pin } from "lucide-react";
import { useTodayAttendance, useCheckIn, useCheckOut } from "@/hooks/useAttendance";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

function parseCheckError(msg: string): { title: string; message: string } {
  const colonIdx = msg.indexOf(": ");
  if (colonIdx > 0 && colonIdx < 60) {
    return { title: msg.slice(0, colonIdx), message: msg.slice(colonIdx + 2) };
  }
  return { title: "Check-in failed", message: msg };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
  return { text: "Good evening", emoji: "🌙" };
}

const colorTokens: Record<string, { icon: string; gradient: string; border: string; label: string }> = {
  indigo:  { icon: "bg-indigo-100 text-indigo-600",   gradient: "from-indigo-50 to-white",   border: "border-indigo-100",   label: "text-indigo-600"   },
  emerald: { icon: "bg-emerald-100 text-emerald-600", gradient: "from-emerald-50 to-white",  border: "border-emerald-100",  label: "text-emerald-600"  },
  amber:   { icon: "bg-amber-100 text-amber-600",     gradient: "from-amber-50 to-white",    border: "border-amber-100",    label: "text-amber-600"    },
  violet:  { icon: "bg-violet-100 text-violet-600",   gradient: "from-violet-50 to-white",   border: "border-violet-100",   label: "text-violet-600"   },
  rose:    { icon: "bg-rose-100 text-rose-600",       gradient: "from-rose-50 to-white",     border: "border-rose-100",     label: "text-rose-600"     },
  sky:     { icon: "bg-sky-100 text-sky-600",         gradient: "from-sky-50 to-white",      border: "border-sky-100",      label: "text-sky-600"      },
  teal:    { icon: "bg-teal-100 text-teal-600",       gradient: "from-teal-50 to-white",     border: "border-teal-100",     label: "text-teal-600"     },
  orange:  { icon: "bg-orange-100 text-orange-600",   gradient: "from-orange-50 to-white",   border: "border-orange-100",   label: "text-orange-600"   },
};

export default function DashboardPage() {
  const { data: user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: leaveRequests } = useLeaveRequests();
  const { data: todayAttendance } = useTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const isAdmin = user?.role === "admin";
  const userId = user?.id ? String(user.id) : "";
  const { data: announcements } = useAnnouncements();
  const latestAnnouncements = (announcements ?? []).slice(0, 3);
  const profileEmployeeId = isAdmin ? "" : userId;
  const { data: profile } = useProfile(profileEmployeeId);
  const pendingLeaves = leaveRequests?.filter((l: any) => l.status === "pending") ?? [];

  const profileCompletion = !isAdmin ? calculateProfileCompletion({
    fullName: user?.fullName,
    email: (user as any)?.email,
    phone: user?.phone,
    dateOfBirth: (profile as any)?.dateOfBirth,
    gender: (profile as any)?.gender,
    nationality: (profile as any)?.nationality,
    maritalStatus: (profile as any)?.maritalStatus,
    addressLine1: (profile as any)?.addressLine1,
    city: (profile as any)?.city,
    state: (profile as any)?.state,
    postalCode: (profile as any)?.postalCode,
    country: (profile as any)?.country,
    emergencyName: (profile as any)?.emergencyName,
    emergencyPhone: (profile as any)?.emergencyPhone,
    highestEducation: (profile as any)?.highestEducation,
    institution: (profile as any)?.institution,
    skills: (profile as any)?.skills,
    certifications: (profile as any)?.certifications,
    experience: (profile as any)?.experience,
    avatar: (profile as any)?.avatar,
    department: user?.department,
    position: user?.position,
  }) : 100;
  const today = format(new Date(), "EEEE, MMMM d");
  const firstName = user?.fullName?.split(" ")[0] ?? "";
  const { text: greetText, emoji } = getGreeting();

  const hasCheckedIn = !!todayAttendance?.checkIn;
  const hasCheckedOut = !!todayAttendance?.checkOut;

  const [alertHidden, setAlertHidden] = useState(false);
  const activeError = (checkIn.error ?? checkOut.error) as Error | null;

  // Reset dismiss whenever a new mutation attempt starts
  useEffect(() => {
    if (checkIn.isPending || checkOut.isPending) setAlertHidden(false);
  }, [checkIn.isPending, checkOut.isPending]);

  const alertData = activeError && !alertHidden
    ? parseCheckError(activeError.message)
    : null;

  const fmtTime = (iso?: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const adminCards = stats
    ? [
        { title: "Total Employees", value: stats.totalEmployees,       subtitle: "Active team members",        icon: Users,             color: "indigo",  href: "/dashboard/employees"  },
        { title: "Present Today",   value: stats.presentToday,         subtitle: `${stats.percentPresent}% attendance rate`, icon: CalendarCheck, color: "emerald", href: "/dashboard/attendance"  },
        { title: "On Leave",        value: stats.onLeave,              subtitle: "Approved absences",          icon: UserX,             color: "violet",  href: "/dashboard/leave"       },
        { title: "Pending Leaves",  value: stats.pendingLeaveRequests, subtitle: "Awaiting approval",          icon: ClipboardList,     color: "amber",   href: "/dashboard/leave"       },
        { title: "Open Jobs",       value: (stats as any).openJobs ?? 0,       subtitle: "Active job postings",       icon: BriefcaseBusiness, color: "sky",     href: "/dashboard/recruitment" },
        { title: "Pending Payroll", value: (stats as any).pendingPayrolls ?? 0, subtitle: "Payrolls to process",      icon: Banknote,          color: "teal",    href: "/dashboard/payroll"     },
        { title: "Open Tickets",    value: (stats as any).openTickets ?? 0,    subtitle: "Support requests",          icon: HeadphonesIcon,    color: "rose",    href: "/dashboard/helpdesk"    },
        { title: "Active Startups", value: (stats as any).activeStartups ?? 0, subtitle: "In incubation",             icon: Rocket,            color: "orange",  href: "/dashboard/startups"    },
      ]
    : [];

  const employeeCards = stats
    ? [
        { title: "Monthly Attendance", value: `${(stats as any).monthlyAttendance ?? 0}d`, subtitle: "Days checked in", icon: CalendarCheck, color: "emerald" },
        { title: "Late Arrivals", value: (stats as any).monthlyLate ?? 0, subtitle: "This month", icon: Timer, color: "amber" },
        { title: "Leave Balance", value: `${(stats as any).leaveBalance ?? 0}d`, subtitle: "Days remaining", icon: CalendarDays, color: "indigo" },
        { title: "Pending Requests", value: (stats as any).pendingRequests ?? 0, subtitle: "Awaiting review", icon: ClipboardList, color: "rose" },
      ]
    : [];

  const cards = isAdmin ? adminCards : employeeCards;

  return (
    <div className="space-y-6">
      {/* ── Hero banner ──────────────────────────────────────────── */}
              <div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white shadow-lg shadow-indigo-500/25"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-indigo-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                {today}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {emoji} {greetText}, {firstName}!
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {isAdmin
                ? "Here's your workforce overview for today."
                : "Here's your personal activity summary."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && pendingLeaves.length > 0 && (
              <Link href="/dashboard/leave">
                <div className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-xl px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer active:scale-95">
                  <Bell className="w-4 h-4" />
                  <span>{pendingLeaves.length} pending</span>
                </div>
              </Link>
            )}
            {isAdmin && (
              <Link href="/dashboard/employees">
                <div className="flex items-center gap-2 bg-white text-indigo-700 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-indigo-50 transition-colors cursor-pointer shadow-sm active:scale-95">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">View Team</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Check-in / Check-out error banner ────────────────────── */}
      {alertData && (
        <AlertBanner
          type="error"
          title={alertData.title}
          message={alertData.message}
          autoDismiss={8000}
          onDismiss={() => setAlertHidden(true)}
        />
      )}

      {/* ── Quick attendance card ─────────────────────────────────── */}
              <div
          className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          !hasCheckedIn && "bg-white border-slate-100 shadow-sm",
          hasCheckedIn && !hasCheckedOut && "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100",
          hasCheckedOut && "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
        )}
      >
        {hasCheckedIn && !hasCheckedOut && (
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-300/15 rounded-full -translate-y-12 translate-x-12 blur-2xl pointer-events-none" />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                !hasCheckedIn && "bg-slate-100",
                hasCheckedIn && !hasCheckedOut && "bg-emerald-100",
                hasCheckedOut && "bg-blue-100"
              )}
            >
              {hasCheckedIn && !hasCheckedOut ? (
                <div className="relative flex items-center justify-center w-3 h-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                </div>
              ) : hasCheckedOut ? (
                <CheckCircle className="w-6 h-6 text-blue-600" />
              ) : (
                <Clock className="w-6 h-6 text-slate-400" />
              )}
            </div>

            <div>
              <p
                className={cn(
                  "font-semibold text-base",
                  !hasCheckedIn && "text-slate-700",
                  hasCheckedIn && !hasCheckedOut && "text-emerald-800",
                  hasCheckedOut && "text-blue-800"
                )}
              >
                {!hasCheckedIn
                  ? "Not checked in yet"
                  : hasCheckedOut
                  ? "Day complete — great work!"
                  : "You're clocked in"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {fmtTime(todayAttendance?.checkIn)
                  ? `In: ${fmtTime(todayAttendance?.checkIn)}`
                  : "Location will be verified on check-in"}
                {fmtTime(todayAttendance?.checkOut) && ` · Out: ${fmtTime(todayAttendance?.checkOut)}`}
                {todayAttendance?.hours != null && ` · ${todayAttendance.hours}h worked`}
              </p>
              {(todayAttendance as any)?.checkInAddress && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {(todayAttendance as any).checkInAddress}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              disabled={hasCheckedIn || checkIn.isPending}
              onClick={() => checkIn.mutate(undefined)}
              className={cn(
                "flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all",
                "bg-emerald-600 text-white shadow-sm shadow-emerald-500/25",
                "hover:bg-emerald-700 active:scale-[0.97]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              {checkIn.isPending ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" /> Locating…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Check In
                </>
              )}
            </button>
            <button
              type="button"
              disabled={!hasCheckedIn || hasCheckedOut || checkOut.isPending}
              onClick={() => checkOut.mutate(undefined)}
              className={cn(
                "flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border transition-all",
                "bg-white border-slate-200 text-slate-700",
                "hover:bg-slate-50 active:scale-[0.97]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
            >
              Check Out
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI stat cards ────────────────────────────────────────── */}
      {statsLoading ? (
        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 xl:grid-cols-4"
          )}
        >
          {[...Array(isAdmin ? 8 : 4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
              <Skeleton className="h-9 w-9 rounded-xl mb-3" />
              <Skeleton className="h-7 w-12 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : cards.length > 0 ? (
        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 xl:grid-cols-4"
          )}
        >
          {cards.map((card, idx) => {
            const Icon = card.icon;
            const tok = colorTokens[card.color];
            const inner = (
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 sm:p-5 h-full",
                  (card as any).href ? "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer" : "cursor-default",
                  tok.gradient,
                  tok.border
                )}
              >
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", tok.icon)}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1 leading-snug">{card.subtitle}</p>
                <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-2", tok.label)}>
                  {card.title}
                </p>
              </div>
            );

            return (
              <div
                key={card.title}
              >
                {(card as any).href ? (
                  <Link href={(card as any).href}>{inner}</Link>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ── Admin: pending leave requests ────────────────────────── */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Pending Leave Requests</h3>
              <p className="text-xs text-slate-400 mt-0.5">Requires your approval</p>
            </div>
            <Link
              href="/dashboard/leave"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-50">
            {pendingLeaves.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">All caught up!</p>
                <p className="text-xs text-slate-400 mt-0.5">No pending leave requests</p>
              </div>
            ) : (
              pendingLeaves.slice(0, 5).map((leave: any) => (
                <div
                  key={leave.id}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                      {leave.fullName?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{leave.fullName}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(leave.startDate)} → {formatDate(leave.endDate)} ·{" "}
                      <span className="text-indigo-600 font-medium">{leave.days}d</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-400 hidden sm:block max-w-[110px] truncate italic">
                    {leave.reason}
                  </p>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="h-7 px-3 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                      disabled={approveLeave.isPending}
                      onClick={() => approveLeave.mutate(leave.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="h-7 px-3 text-xs font-semibold rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                      disabled={rejectLeave.isPending}
                      onClick={() => rejectLeave.mutate(leave.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Employee: Profile completion card ───────────────────── */}
      {!isAdmin && profileCompletion < 100 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Complete Your Profile</p>
              <p className="text-xs text-slate-400 mt-0.5">Help your team know you better</p>
            </div>
            <Link href="/dashboard/profile"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              Update
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700",
                  profileCompletion >= 80 ? "bg-emerald-500" : profileCompletion >= 50 ? "bg-amber-400" : "bg-indigo-500",
                  profileCompletion >= 90 ? "w-[90%]" : profileCompletion >= 80 ? "w-4/5" :
                  profileCompletion >= 70 ? "w-[70%]" : profileCompletion >= 60 ? "w-3/5" :
                  profileCompletion >= 50 ? "w-1/2"   : profileCompletion >= 40 ? "w-2/5" :
                  profileCompletion >= 30 ? "w-[30%]" : profileCompletion >= 20 ? "w-1/5" :
                  profileCompletion >= 10 ? "w-[10%]" : "w-0"
                )}
              />
            </div>
            <span className={cn("text-sm font-bold shrink-0",
              profileCompletion >= 80 ? "text-emerald-600" : profileCompletion >= 50 ? "text-amber-600" : "text-indigo-600"
            )}>
              {profileCompletion}%
            </span>
          </div>
        </div>
      )}

      {/* ── Employee: quick links ────────────────────────────────── */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              href: "/dashboard/attendance",
              icon: CalendarCheck,
              color: "indigo",
              title: "My Attendance",
              desc: "View & track your check-ins",
            },
            {
              href: "/dashboard/leave",
              icon: ClipboardList,
              color: "violet",
              title: "Leave Requests",
              desc: "Apply & track time off",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            const tok = colorTokens[item.color];
            return (
              <div
                key={item.href}
              >
                <Link href={item.href}>
                  <div className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", tok.icon)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Announcements widget ────────────────────────────────── */}
      {latestAnnouncements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900">Announcements</h3>
            </div>
            <Link href="/dashboard/announcements"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {latestAnnouncements.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                {a.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{a.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                  {new Date(a.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Employee: inspirational footer ──────────────────────── */}
      {!isAdmin && (
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <p className="text-xs text-slate-400">
            Powered by <span className="font-semibold text-indigo-500">Anvesync</span> — Innovation & Entrepreneurial Forum
          </p>
        </div>
      )}
    </div>
  );
}
