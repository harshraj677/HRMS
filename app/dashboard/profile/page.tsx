"use client";

import {
  Mail,
  Phone,
  Building,
  Calendar,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useEmployee } from "@/hooks/useEmployees";
import { useLeaveRequests } from "@/hooks/useLeave";
import { useAttendanceHistory } from "@/hooks/useAttendance";
import { cn, formatDate, getStatusColor, getDepartmentColor, getInitials } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const { data: authUser, isLoading: authLoading } = useAuth();
  const { data: employee, isLoading } = useEmployee(authUser?.id ?? "");
  const { data: leaveRequests } = useLeaveRequests();
  const { data: attendance } = useAttendanceHistory();

  const fmtTime = (iso: string | null) => {
    if (!iso) return "–";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  const leaveUsed = 18 - (employee.leaveBalance ?? 18);
  const myLeaves = leaveRequests ?? [];

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
              <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-700 font-bold">
                {getInitials(employee.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{employee.fullName}</h2>
                <Badge variant="outline" className="capitalize">{employee.role}</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{employee.position ?? "–"}</p>
              {employee.department && (
                <span className={cn(
                  "inline-block mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full",
                  getDepartmentColor(employee.department)
                )}>
                  {employee.department}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
            {[
              { icon: Mail, label: "Email", value: employee.email },
              { icon: Phone, label: "Phone", value: employee.phone ?? "–" },
              { icon: Building, label: "Department", value: employee.department ?? "–" },
              { icon: Calendar, label: "Joined", value: formatDate(employee.createdAt) },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <Tabs defaultValue="overview">
          <TabsList className="bg-white border border-slate-100 shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">My Attendance</TabsTrigger>
            <TabsTrigger value="leaves">My Leave History</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              {/* Leave Balance */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-5">Leave Balance</h3>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">Annual Leave</span>
                  <span className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">{employee.leaveBalance ?? 18}</span>/18 days remaining
                  </span>
                </div>
                <Progress value={((employee.leaveBalance ?? 18) / 18) * 100} className="h-2" />
                <p className="text-xs text-slate-400 mt-1">{leaveUsed} days used of 18 maximum</p>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", value: 18, color: "bg-slate-50 text-slate-700" },
                    { label: "Used", value: leaveUsed, color: "bg-amber-50 text-amber-700" },
                    { label: "Remaining", value: employee.leaveBalance ?? 18, color: "bg-emerald-50 text-emerald-700" },
                  ].map((s) => (
                    <div key={s.label} className={cn("rounded-xl p-3 text-center", s.color)}>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs font-medium mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-5">Quick Stats</h3>
                <div className="space-y-4">
                  {[
                    { icon: CalendarCheck, label: "Leave Balance", value: `${employee.leaveBalance ?? 18} days`, color: "bg-indigo-50 text-indigo-600" },
                    { icon: ClipboardList, label: "Leave Requests", value: `${myLeaves.length}`, color: "bg-amber-50 text-amber-600" },
                    { icon: CheckCircle2, label: "Attendance Records", value: `${attendance?.length ?? 0}`, color: "bg-violet-50 text-violet-600" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", stat.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">{stat.label}</p>
                          <p className="text-sm font-semibold text-slate-800">{stat.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-4 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-900">Attendance History</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Check In</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Check Out</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance?.map((record: any) => (
                    <TableRow key={record.id} className="border-slate-100">
                      <TableCell className="font-medium text-sm">{formatDate(record.date)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{fmtTime(record.checkIn)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{fmtTime(record.checkOut)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{record.hours != null ? `${record.hours}h` : "–"}</TableCell>
                    </TableRow>
                  ))}
                  {(!attendance || attendance.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                        No attendance records yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Leave History */}
          <TabsContent value="leaves">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-4 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-900">Leave History</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Duration</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Reason</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Applied</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myLeaves.map((leave: any) => (
                    <TableRow key={leave.id} className="border-slate-100">
                      <TableCell className="text-sm">
                        <span className="text-slate-600">{formatDate(leave.startDate)}</span>
                        {leave.startDate !== leave.endDate && (
                          <span className="text-slate-400"> → {formatDate(leave.endDate)}</span>
                        )}
                        <span className="ml-1 text-xs text-slate-400">({leave.days}d)</span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">
                        {leave.reason}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatDate(leave.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs font-medium px-2.5 py-0.5 rounded-full capitalize",
                          getStatusColor(leave.status)
                        )}>
                          {leave.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {myLeaves.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                        No leave requests yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
