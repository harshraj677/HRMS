"use client";

import { motion } from "framer-motion";
import { RoleGuard } from "@/components/RoleGuard";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Users, Clock, AlertTriangle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useDashboard";
import { useDashboardStats } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics();
  const { data: stats } = useDashboardStats();

  const kpis = [
    {
      label: "Total Employees",
      value: stats?.totalEmployees ?? "–",
      icon: Users,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Present Today",
      value: stats?.presentToday ?? "–",
      subtitle: stats?.percentPresent != null ? `${stats.percentPresent}% rate` : undefined,
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Late Today",
      value: stats?.lateToday ?? "–",
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Suspicious Events",
      value: analytics?.suspiciousCount ?? "–",
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50",
    },
  ];

  if (isLoading) {
    return (
      <RoleGuard allow={["admin"]}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Analytics Dashboard</h2>
            <p className="text-sm text-slate-500 mt-0.5">Loading insights...</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border p-5">
                <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <Skeleton className="h-4 w-48 mb-4" />
            <Skeleton className="h-[240px] w-full rounded-xl" />
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allow={["admin"]}>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Analytics Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">Workforce insights and performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", kpi.color)}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
            {kpi.subtitle && (
              <p className="text-xs font-medium text-emerald-600 mt-1">{kpi.subtitle}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Attendance Trend (30-day) */}
      {analytics?.attendanceTrend && analytics.attendanceTrend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Attendance Trend (Last 30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics.attendanceTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={2} fill="url(#gPresent)" name="Present" />
              <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="url(#gLate)" name="Late" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Two Column: Department + Employee Ranking */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Department Attendance */}
        {analytics?.departmentAttendance && analytics.departmentAttendance.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
          >
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Department-wise Attendance</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.departmentAttendance} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="present" fill="#6366f1" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Employee Ranking */}
        {analytics?.employeeRanking && analytics.employeeRanking.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
          >
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Top Employees by Attendance
            </h3>
            <div className="space-y-3">
              {analytics.employeeRanking.map((emp: any, i: number) => (
                <div key={emp.fullName} className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-slate-200 text-slate-600" :
                    i === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-50 text-slate-400"
                  )}>
                    {i + 1}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`} />
                    <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                      {getInitials(emp.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{emp.fullName}</p>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{emp.presentDays}d</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Monthly Leave Trend */}
      {analytics?.leaveMonthly && analytics.leaveMonthly.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Leave Requests (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.leaveMonthly} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="approved" fill="#6366f1" radius={[4, 4, 0, 0]} stackId="a" name="Approved" />
              <Bar dataKey="rejected" fill="#f43f5e" radius={[0, 0, 0, 0]} stackId="a" name="Rejected" />
              <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
    </RoleGuard>
  );
}
