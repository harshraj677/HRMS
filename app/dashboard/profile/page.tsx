"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEmployee } from "@/hooks/useEmployees";
import { useAttendanceHistory } from "@/hooks/useAttendance";
import { useLeaveRequests } from "@/hooks/useLeave";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Mail, Phone, Building, Calendar, CalendarCheck,
  ClipboardList, CheckCircle2, LogOut,
} from "lucide-react";
import { cn, formatDate, getStatusColor, getDepartmentColor, getInitials } from "@/lib/utils";
import { calculateProfileCompletion } from "@/lib/profileCompletion";

export default function ProfilePage() {
  const router = useRouter();
  const { data: authUser, isLoading: authLoading } = useAuth();
  const userId = authUser?.id ? String(authUser.id) : "";
  const { data: employee, isLoading: empLoading } = useEmployee(userId);
  const { data: profile } = useProfile(userId);
  const { data: leaveRequests } = useLeaveRequests();
  const { data: attendance } = useAttendanceHistory(userId);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return "–";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (authLoading || empLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!employee) return null;

  const leaveUsed = 18 - (employee.leaveBalance ?? 18);
  const myLeaves = (leaveRequests ?? []).filter((l: any) => String(l.employeeId) === userId);
  const profileImg = (profile as any)?.avatar;

  const completion = calculateProfileCompletion({
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone ?? undefined,
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
    department: employee.department ?? undefined,
    position: employee.position ?? undefined,
  });

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <AvatarUploader
              employeeId={userId}
              currentAvatar={profileImg}
              name={employee.fullName}
              size="lg"
            />
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{employee.fullName}</h2>
                <Badge variant="outline" className="capitalize">{employee.role}</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{employee.position ?? "—"}</p>
              {employee.department && (
                <span className={cn("inline-block mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full", getDepartmentColor(employee.department))}>
                  {employee.department}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 shrink-0" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
            {[
              { icon: Mail, label: "Email", value: employee.email },
              { icon: Phone, label: "Phone", value: employee.phone ?? "—" },
              { icon: Building, label: "Department", value: employee.department ?? "—" },
              { icon: Calendar, label: "Joined", value: formatDate(employee.createdAt) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-white border border-slate-100 shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leave History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-semibold text-slate-900">Leave Balance</h3>
              <div>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-slate-600">Annual Leave</span>
                  <span><strong className="text-slate-900">{employee.leaveBalance ?? 18}</strong><span className="text-slate-400">/18 remaining</span></span>
                </div>
                <Progress value={((employee.leaveBalance ?? 18) / 18) * 100} className="h-2" />
                <p className="text-xs text-slate-400 mt-1.5">{leaveUsed} days used</p>
              </div>

              {/* Profile completion */}
              <div className="pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">Profile Completion</p>
                  <span className={cn("text-sm font-bold",
                    completion >= 80 ? "text-emerald-600" : completion >= 50 ? "text-amber-600" : "text-indigo-600"
                  )}>{completion}%</span>
                </div>
                <Progress value={completion} className={cn("h-2",
                  completion >= 80 ? "[&>div]:bg-emerald-500" :
                  completion >= 50 ? "[&>div]:bg-amber-400" : "[&>div]:bg-indigo-500"
                )} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Stats</h3>
              <div className="space-y-3.5">
                {[
                  { icon: CalendarCheck, label: "Leave Balance",     value: `${employee.leaveBalance ?? 18}d`, color: "bg-indigo-50 text-indigo-600" },
                  { icon: ClipboardList, label: "Leave Requests",    value: `${myLeaves.length}`,              color: "bg-amber-50 text-amber-600" },
                  { icon: CheckCircle2,  label: "Attendance Records", value: `${attendance?.length ?? 0}`,     color: "bg-violet-50 text-violet-600" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}><Icon className="w-4 h-4" /></div>
                    <div><p className="text-xs text-slate-400">{label}</p><p className="text-sm font-semibold text-slate-800">{value}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-4 overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-900">Attendance History</h3></div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  {["Date","Check In","Check Out","Hours"].map(h => <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance?.map((r: any) => (
                  <TableRow key={r.id} className="border-slate-100">
                    <TableCell className="font-medium text-sm">{formatDate(r.date)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{fmtTime(r.checkIn)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{fmtTime(r.checkOut)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{r.hours != null ? `${r.hours}h` : "–"}</TableCell>
                  </TableRow>
                ))}
                {(!attendance || attendance.length === 0) && (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">No records yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="leaves">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-4 overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-900">Leave History</h3></div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  {["Duration","Category","Reason","Applied","Status"].map(h => <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeaves.map((l: any) => (
                  <TableRow key={l.id} className="border-slate-100">
                    <TableCell className="text-sm">
                      <span className="text-slate-600">{formatDate(l.startDate)}</span>
                      {l.startDate !== l.endDate && <span className="text-slate-400"> → {formatDate(l.endDate)}</span>}
                      <span className="ml-1 text-xs text-slate-400">({l.days}d)</span>
                    </TableCell>
                    <TableCell><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 capitalize">{l.category ?? "casual"}</span></TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-xs truncate">{l.reason}</TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDate(l.createdAt)}</TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full capitalize", getStatusColor(l.status))}>{l.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {myLeaves.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">No leave requests yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
