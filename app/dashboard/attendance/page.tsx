"use client";

import { motion } from "framer-motion";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  Timer,
  MapPin,
  AlertTriangle,
  Shield,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTodayAttendance, useAttendanceHistory, useCheckIn, useCheckOut } from "@/hooks/useAttendance";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { format } from "date-fns";

const statusBadge = (status: string | null) => {
  if (!status) return null;
  const map: Record<string, { label: string; cls: string }> = {
    present: { label: "On Time", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    late: { label: "Late", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    absent: { label: "Absent", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const m = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return <Badge variant="outline" className={cn("text-[10px] font-semibold capitalize", m.cls)}>{m.label}</Badge>;
};

export default function AttendancePage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: today, isLoading: todayLoading } = useTodayAttendance();
  const { data: history, isLoading: historyLoading } = useAttendanceHistory();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const now = new Date();
  const currentTime = format(now, "hh:mm a");
  const currentDate = format(now, "EEEE, MMMM d, yyyy");

  const hasCheckedIn = !!today?.checkIn;
  const hasCheckedOut = !!today?.checkOut;

  const fmtTime = (iso: string | null) => {
    if (!iso) return "–";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Attendance</h2>
        <p className="text-sm text-slate-500 mt-0.5">{currentDate}</p>
      </div>

      {/* Today's Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Check In/Out Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
        >
          {/* Clock */}
          <div className="text-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 mb-3"
            >
              <p className="text-2xl font-bold text-indigo-700">{currentTime}</p>
            </motion.div>
            <p className="text-sm text-slate-500">Current Time</p>
          </div>

          {/* Status */}
          {todayLoading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : (
            <div className={cn(
              "rounded-xl p-4 mb-5 text-center",
              !hasCheckedIn && "bg-slate-50",
              hasCheckedIn && !hasCheckedOut && "bg-emerald-50",
              hasCheckedOut && "bg-blue-50",
            )}>
              {!hasCheckedIn ? (
                <>
                  <p className="text-sm font-semibold text-slate-600">Not Checked In</p>
                  <p className="text-xs text-slate-400 mt-0.5">Location will be verified</p>
                </>
              ) : !hasCheckedOut ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-semibold text-emerald-700">Checked In</p>
                  </div>
                  <p className="text-xs text-emerald-600">
                    Since {fmtTime(today.checkIn)} {today.hours != null && `• ${today.hours}h elapsed`}
                  </p>
                  {today.status && <div className="mt-2">{statusBadge(today.status)}</div>}
                  {today.distanceFromOffice != null && (
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3" /> {Math.round(today.distanceFromOffice)}m from office
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-blue-700">Day Complete</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {fmtTime(today.checkIn)} – {fmtTime(today.checkOut)} • {today.hours}h total
                  </p>
                  {today.status && <div className="mt-2">{statusBadge(today.status)}</div>}
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11 font-semibold"
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
              variant="outline"
              className="w-full rounded-xl h-11 font-semibold border-slate-200 hover:bg-slate-50"
              disabled={!hasCheckedIn || hasCheckedOut || checkOut.isPending}
              onClick={() => checkOut.mutate()}
            >
              {checkOut.isPending ? (
                <><Clock className="w-4 h-4 animate-spin" /> Checking Out...</>
              ) : (
                <><LogOut className="w-4 h-4" /> Check Out</>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Location & device verified on check-in
          </p>
        </motion.div>

        {/* Today's Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 grid grid-cols-2 gap-4 content-start"
        >
          {[
            { label: "Check In", value: fmtTime(today?.checkIn ?? null), icon: LogIn, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Check Out", value: fmtTime(today?.checkOut ?? null), icon: LogOut, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Hours Today", value: today?.hours != null ? `${today.hours}h` : "–", icon: Timer, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Status", value: today?.status ?? "Not Marked", icon: CheckCircle2, color: "text-violet-600", bg: "bg-violet-50" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                  <Icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <p className="text-2xl font-bold text-slate-900 capitalize">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Attendance History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm"
      >
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Attendance History</h3>
          <p className="text-sm text-slate-400">
            {isAdmin ? "All employee records" : "Your recent attendance records"}
          </p>
        </div>

        {historyLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  {isAdmin && <TableHead className="text-xs font-semibold text-slate-500 uppercase">Employee</TableHead>}
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Check In</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Check Out</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Hours</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                  {isAdmin && <TableHead className="text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Distance</TableHead>}
                  {isAdmin && <TableHead className="text-xs font-semibold text-slate-500 uppercase hidden xl:table-cell">Device</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.map((record: any, i: number) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-slate-100 hover:bg-slate-50/50"
                  >
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${record.fullName}`} />
                            <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                              {getInitials(record.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{record.fullName}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-sm font-medium">{formatDate(record.date)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{fmtTime(record.checkIn)}</TableCell>
                    <TableCell className="text-sm text-slate-600 hidden sm:table-cell">{fmtTime(record.checkOut)}</TableCell>
                    <TableCell className="text-sm text-slate-600 hidden md:table-cell">
                      {record.hours != null ? `${record.hours}h` : "–"}
                    </TableCell>
                    <TableCell>{statusBadge(record.status)}</TableCell>
                    {isAdmin && (
                      <TableCell className="hidden lg:table-cell">
                        {record.distanceFromOffice != null ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "text-xs font-medium inline-flex items-center gap-1",
                                  record.distanceFromOffice <= 200 ? "text-emerald-600" : "text-red-600"
                                )}>
                                  <MapPin className="w-3 h-3" />
                                  {Math.round(record.distanceFromOffice)}m
                                  {record.distanceFromOffice > 200 && <AlertTriangle className="w-3 h-3" />}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{record.distanceFromOffice <= 200 ? "Within geofence" : "Outside 200m geofence"}</p>
                                {record.latitude && <p className="text-[10px]">{record.latitude}, {record.longitude}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-slate-400">–</span>
                        )}
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell className="hidden xl:table-cell">
                        {record.device ? (
                          <span className="text-xs text-slate-500 flex items-center gap-1 max-w-[120px] truncate">
                            <Smartphone className="w-3 h-3 shrink-0" /> {record.device}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">–</span>
                        )}
                      </TableCell>
                    )}
                  </motion.tr>
                ))}
                {(!history || history.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 5} className="text-center py-12 text-slate-400 text-sm">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
