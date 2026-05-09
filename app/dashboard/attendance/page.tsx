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
  CalendarDays,
} from "lucide-react";
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

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  present: { label: "On Time", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  late:    { label: "Late",    cls: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-500"   },
  absent:  { label: "Absent",  cls: "bg-red-100 text-red-700 border-red-200",          dot: "bg-red-500"     },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const cfg = statusConfig[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", cfg.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default function AttendancePage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: today, isLoading: todayLoading } = useTodayAttendance();
  const { data: history, isLoading: historyLoading } = useAttendanceHistory();
  const checkIn  = useCheckIn();
  const checkOut = useCheckOut();

  const currentTime = format(new Date(), "hh:mm a");
  const currentDate = format(new Date(), "EEEE, MMMM d, yyyy");

  const hasCheckedIn  = !!today?.checkIn;
  const hasCheckedOut = !!today?.checkOut;

  const fmtTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "–";

  const miniStats = [
    { label: "Check In",    value: fmtTime(today?.checkIn),  icon: LogIn,        color: "emerald", bg: "bg-emerald-50", text: "text-emerald-600" },
    { label: "Check Out",   value: fmtTime(today?.checkOut), icon: LogOut,       color: "blue",    bg: "bg-blue-50",    text: "text-blue-600"    },
    { label: "Hours Today", value: today?.hours != null ? `${today.hours}h` : "–", icon: Timer, color: "indigo", bg: "bg-indigo-50", text: "text-indigo-600" },
    { label: "Status",      value: today?.status ?? "Pending", icon: CheckCircle2, color: "violet", bg: "bg-violet-50", text: "text-violet-600" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Attendance</h2>
        <p className="text-sm text-slate-500 mt-0.5">{currentDate}</p>
      </div>

      {/* ── Today's status: 3-col grid ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Check-in / Check-out card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col"
        >
          {/* Analog clock display */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center mb-3 shadow-inner">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="text-center z-10">
                <p className="text-xl font-bold text-indigo-700 font-mono leading-none">{currentTime.split(" ")[0]}</p>
                <p className="text-[10px] font-semibold text-indigo-400 tracking-widest mt-0.5">{currentTime.split(" ")[1]}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Current Time</p>
          </div>

          {/* Status pill */}
          {todayLoading ? (
            <Skeleton className="h-20 w-full rounded-xl mb-5" />
          ) : (
            <div
              className={cn(
                "rounded-xl p-4 mb-5 text-center",
                !hasCheckedIn && "bg-slate-50",
                hasCheckedIn && !hasCheckedOut && "bg-emerald-50",
                hasCheckedOut && "bg-blue-50"
              )}
            >
              {!hasCheckedIn ? (
                <>
                  <p className="text-sm font-semibold text-slate-600">Not Checked In</p>
                  <p className="text-xs text-slate-400 mt-0.5">Location will be verified</p>
                </>
              ) : !hasCheckedOut ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <p className="text-sm font-semibold text-emerald-700">Checked In</p>
                  </div>
                  <p className="text-xs text-emerald-600">
                    Since {fmtTime(today?.checkIn)}
                    {today?.hours != null && ` · ${today.hours}h elapsed`}
                  </p>
                  {today?.status && (
                    <div className="mt-2 flex justify-center">
                      <StatusBadge status={today.status} />
                    </div>
                  )}
                  {today?.distanceFromOffice != null && (
                    <p className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {Math.round(today.distanceFromOffice)}m from office
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-blue-700">Day Complete 🎉</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {fmtTime(today?.checkIn)} – {fmtTime(today?.checkOut)} · {today?.hours}h total
                  </p>
                  {today?.status && (
                    <div className="mt-2 flex justify-center">
                      <StatusBadge status={today.status} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 mt-auto">
            <button
              type="button"
              className={cn(
                "w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all",
                "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
                "hover:bg-emerald-700 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
              disabled={hasCheckedIn || checkIn.isPending}
              onClick={() => checkIn.mutate()}
            >
              {checkIn.isPending ? (
                <><Clock className="w-4 h-4 animate-spin" /> Getting location…</>
              ) : (
                <><LogIn className="w-4 h-4" /> Check In</>
              )}
            </button>
            <button
              type="button"
              className={cn(
                "w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all",
                "bg-white border-slate-200 text-slate-700",
                "hover:bg-slate-50 active:scale-[0.98]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              )}
              disabled={!hasCheckedIn || hasCheckedOut || checkOut.isPending}
              onClick={() => checkOut.mutate()}
            >
              {checkOut.isPending ? (
                <><Clock className="w-4 h-4 animate-spin" /> Checking out…</>
              ) : (
                <><LogOut className="w-4 h-4" /> Check Out</>
              )}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Location &amp; device verified on check-in
          </p>
        </motion.div>

        {/* Mini stat cards (2×2 grid) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 grid grid-cols-2 gap-4 content-start"
        >
          {miniStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                  <Icon className={cn("w-5 h-5", stat.text)} />
                </div>
                <p className="text-2xl font-bold text-slate-900 capitalize leading-none">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1.5">{stat.label}</p>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* ── Attendance history ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Attendance History</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              {isAdmin ? "All employee records" : "Your recent records"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Last 30 days
          </div>
        </div>

        {historyLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Mobile card view (hidden md+) ──────────────────── */}
            <div className="md:hidden divide-y divide-slate-50">
              {history?.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center px-6">
                  <CalendarDays className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">No records found</p>
                  <p className="text-xs text-slate-400 mt-1">Check-in to start tracking attendance</p>
                </div>
              )}
              {history?.map((record: any, i: number) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 hover:bg-slate-50/70 transition-colors"
                >
                  {isAdmin && (
                    <div className="flex items-center gap-2 mb-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                          {getInitials(record.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold text-slate-800">{record.fullName}</span>
                      <div className="ml-auto">
                        <StatusBadge status={record.status} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{formatDate(record.date)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">
                          <span className="text-slate-400">In</span> {fmtTime(record.checkIn)}
                        </span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-500">
                          <span className="text-slate-400">Out</span> {fmtTime(record.checkOut)}
                        </span>
                        {record.hours != null && (
                          <>
                            <span className="text-slate-200">·</span>
                            <span className="text-xs font-medium text-indigo-600">{record.hours}h</span>
                          </>
                        )}
                      </div>
                      {isAdmin && record.distanceFromOffice != null && (
                        <p className={cn(
                          "text-[11px] mt-1.5 flex items-center gap-1 font-medium",
                          record.distanceFromOffice <= 200 ? "text-emerald-600" : "text-red-500"
                        )}>
                          <MapPin className="w-3 h-3" />
                          {Math.round(record.distanceFromOffice)}m from office
                          {record.distanceFromOffice > 200 && <AlertTriangle className="w-3 h-3" />}
                        </p>
                      )}
                    </div>
                    {!isAdmin && <StatusBadge status={record.status} />}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Desktop table view (hidden below md) ───────────── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    {isAdmin && (
                      <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Employee
                      </TableHead>
                    )}
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Check In</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Check Out</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Hours</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
                    {isAdmin && (
                      <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                        Distance
                      </TableHead>
                    )}
                    {isAdmin && (
                      <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">
                        Device
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((record: any, i: number) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.025 }}
                      className="border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                                {getInitials(record.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-slate-800">{record.fullName}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-sm font-medium text-slate-700">{formatDate(record.date)}</TableCell>
                      <TableCell className="text-sm text-slate-500 font-mono">{fmtTime(record.checkIn)}</TableCell>
                      <TableCell className="text-sm text-slate-500 font-mono hidden sm:table-cell">{fmtTime(record.checkOut)}</TableCell>
                      <TableCell className="text-sm text-slate-600 hidden md:table-cell font-medium">
                        {record.hours != null ? `${record.hours}h` : "–"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="hidden lg:table-cell">
                          {record.distanceFromOffice != null ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "text-xs font-semibold inline-flex items-center gap-1",
                                      record.distanceFromOffice <= 200 ? "text-emerald-600" : "text-red-500"
                                    )}
                                  >
                                    <MapPin className="w-3 h-3" />
                                    {Math.round(record.distanceFromOffice)}m
                                    {record.distanceFromOffice > 200 && <AlertTriangle className="w-3 h-3" />}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{record.distanceFromOffice <= 200 ? "Within geofence" : "Outside 200m geofence"}</p>
                                  {record.latitude && (
                                    <p className="text-[10px] text-slate-400">{record.latitude}, {record.longitude}</p>
                                  )}
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
                              <Smartphone className="w-3 h-3 shrink-0 text-slate-400" />
                              {record.device}
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
                      <TableCell
                        colSpan={isAdmin ? 8 : 5}
                        className="text-center py-14"
                      >
                        <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No attendance records found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
