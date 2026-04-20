"use client";

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
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useLeaveRequests, useApproveLeave, useRejectLeave } from "@/hooks/useLeave";
import { useTodayAttendance, useCheckIn, useCheckOut } from "@/hooks/useAttendance";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

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
  const pendingLeaves = leaveRequests?.filter((l: any) => l.status === "pending") ?? [];
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  const hasCheckedIn = !!todayAttendance?.checkIn;
  const hasCheckedOut = !!todayAttendance?.checkOut;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName}!
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && pendingLeaves.length > 0 && (
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link href="/dashboard/leave">
                <Bell className="w-4 h-4" />
                <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-indigo-600">{pendingLeaves.length}</Badge>
                Pending Leaves
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700" asChild>
              <Link href="/dashboard/employees">
                <Users className="w-4 h-4" /> View Team
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Attendance Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              hasCheckedIn && !hasCheckedOut ? "bg-emerald-50" : hasCheckedOut ? "bg-blue-50" : "bg-slate-50"
            )}>
              <Clock className={cn(
                "w-5 h-5",
                hasCheckedIn && !hasCheckedOut ? "text-emerald-600" : hasCheckedOut ? "text-blue-600" : "text-slate-400"
              )} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {!hasCheckedIn ? "Not checked in yet" : hasCheckedOut ? "Day complete" : "Currently working"}
              </p>
              <p className="text-xs text-slate-400">
                {todayAttendance?.checkIn && `In: ${new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                {todayAttendance?.checkOut && ` — Out: ${new Date(todayAttendance.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                {todayAttendance?.hours != null && ` — ${todayAttendance.hours}h`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              disabled={hasCheckedIn || checkIn.isPending}
              onClick={() => checkIn.mutate()}
            >
              {checkIn.isPending ? (
                <><Clock className="w-4 h-4 animate-spin" /> Getting location...</>
              ) : (
                <><LogIn className="w-4 h-4" /> Check In</>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={!hasCheckedIn || hasCheckedOut || checkOut.isPending}
              onClick={() => checkOut.mutate()}
            >
              Check Out
            </Button>
          </div>
        </div>
      </div>

      {/* Admin Stats Grid */}
      {isAdmin && (
        statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border p-6">
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-36" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              { title: "Total Employees", value: stats.totalEmployees, subtitle: "Active team members", icon: Users, color: "indigo" },
              { title: "Present Today", value: stats.presentToday, subtitle: `${stats.percentPresent}% attendance`, icon: CalendarCheck, color: "emerald" },
              { title: "Late Today", value: stats.lateToday ?? 0, subtitle: "Arrived after 9:30 AM", icon: AlertTriangle, color: "amber" },
              { title: "On Leave", value: stats.onLeave, subtitle: "Approved absences", icon: UserX, color: "violet" },
              { title: "Pending Requests", value: stats.pendingLeaveRequests, subtitle: "Awaiting approval", icon: ClipboardList, color: "rose" },
            ].map((card) => {
              const Icon = card.icon;
              const colorMap: Record<string, string> = {
                indigo: "bg-indigo-50 text-indigo-600",
                emerald: "bg-emerald-50 text-emerald-600",
                amber: "bg-amber-50 text-amber-600",
                violet: "bg-violet-50 text-violet-600",
                rose: "bg-rose-50 text-rose-600",
              };
              return (
                <div key={card.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", colorMap[card.color])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
                </div>
              );
            })}
          </div>
        ) : null
      )}

      {/* Employee Personal Stats */}
      {!isAdmin && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { title: "This Month Attendance", value: (stats as any).monthlyAttendance ?? 0, subtitle: "Days checked in", icon: CalendarCheck, color: "emerald" },
            { title: "Late This Month", value: (stats as any).monthlyLate ?? 0, subtitle: "After 9:30 AM", icon: Timer, color: "amber" },
            { title: "Leave Balance", value: (stats as any).leaveBalance ?? 0, subtitle: "Days remaining", icon: CalendarDays, color: "indigo" },
            { title: "Pending Requests", value: (stats as any).pendingRequests ?? 0, subtitle: "Awaiting approval", icon: ClipboardList, color: "rose" },
          ].map((card) => {
            const Icon = card.icon;
            const colorMap: Record<string, string> = {
              emerald: "bg-emerald-50 text-emerald-600",
              amber: "bg-amber-50 text-amber-600",
              indigo: "bg-indigo-50 text-indigo-600",
              rose: "bg-rose-50 text-rose-600",
            };
            return (
              <div key={card.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", colorMap[card.color])}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Leave Requests (admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Pending Leave Requests</h3>
              <p className="text-sm text-slate-400">Requires your approval</p>
            </div>
            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 text-xs" asChild>
              <Link href="/dashboard/leave">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {pendingLeaves.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                No pending leave requests
              </div>
            ) : (
              pendingLeaves.slice(0, 5).map((leave: any) => (
                <div
                  key={leave.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leave.fullName}`} />
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                      {leave.fullName?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{leave.fullName}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(leave.startDate)} → {formatDate(leave.endDate)} · {leave.days}d
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 hidden sm:block max-w-[120px] truncate">{leave.reason}</p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={approveLeave.isPending}
                      onClick={() => approveLeave.mutate(leave.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                      disabled={rejectLeave.isPending}
                      onClick={() => rejectLeave.mutate(leave.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Employee quick links */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/attendance">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">My Attendance</p>
                  <p className="text-xs text-slate-400">View attendance history</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />
              </div>
            </div>
          </Link>
          <Link href="/dashboard/leave">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">My Leave Requests</p>
                  <p className="text-xs text-slate-400">Apply & track leave</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
