"use client";

import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Building,
  User,
  CalendarCheck,
  ClipboardList,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmployee } from "@/hooks/useEmployees";
import { useAttendanceHistory } from "@/hooks/useAttendance";
import { useLeaveRequests } from "@/hooks/useLeave";
import {
  cn,
  formatDate,
  getStatusColor,
  getDepartmentColor,
  getInitials,
} from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EmployeeProfilePage({ params }: Props) {
  const { id } = use(params);
  const { data: employee, isLoading } = useEmployee(id);
  const { data: attendance } = useAttendanceHistory(id);
  const { data: leaveRequests } = useLeaveRequests();

  const fmtTime = (iso: string | null) => {
    if (!iso) return "–";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Employee not found</p>
        <Link href="/dashboard/employees">
          <Button className="mt-4" variant="outline">Back to Employees</Button>
        </Link>
      </div>
    );
  }

  const employeeLeaves = leaveRequests?.filter((l: any) => String(l.employeeId) === id) ?? [];
  const leaveUsed = 18 - (employee.leaveBalance ?? 18);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" className="rounded-xl -ml-2 text-slate-500" asChild>
        <Link href="/dashboard/employees">
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Link>
      </Button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.fullName}`} />
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
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={cn(
                  "text-xs font-medium px-2.5 py-0.5 rounded-full",
                  getDepartmentColor(employee.department ?? "")
                )}>
                  {employee.department}
                </span>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
            {[
              { icon: Mail, label: "Email", value: employee.email },
              { icon: Phone, label: "Phone", value: employee.phone ?? "–" },
              { icon: Building, label: "Department", value: employee.department },
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
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="leaves">Leave History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              {/* Leave Balance */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-5">Leave Balance</h3>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">Annual Leave</span>
                    <span className="text-sm text-slate-500">
                      <span className="font-semibold text-slate-900">{employee.leaveBalance ?? 18}</span>/18 days remaining
                    </span>
                  </div>
                  <Progress
                    value={((employee.leaveBalance ?? 18) / 18) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-slate-400 mt-1">{leaveUsed} days used</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-5">Quick Stats</h3>
                <div className="space-y-4">
                  {[
                    { icon: CalendarCheck, label: "Leave Balance", value: `${employee.leaveBalance ?? 18} days`, color: "bg-indigo-50 text-indigo-600" },
                    { icon: ClipboardList, label: "Leaves Used", value: `${leaveUsed} days`, color: "bg-amber-50 text-amber-600" },
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

          {/* Attendance Tab */}
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
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Leave History Tab */}
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
                  {employeeLeaves.map((leave: any) => (
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
                  {employeeLeaves.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                        No leave history found
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
