"use client";

import { motion } from "framer-motion";
import { RoleGuard } from "@/components/RoleGuard";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockAttendanceTrend } from "@/lib/mock-data";

const departmentData = [
  { dept: "Engineering", present: 24, absent: 2, late: 3 },
  { dept: "Design", present: 8, absent: 1, late: 1 },
  { dept: "Marketing", present: 6, absent: 1, late: 2 },
  { dept: "Finance", present: 5, absent: 0, late: 0 },
  { dept: "HR", present: 4, absent: 1, late: 1 },
  { dept: "Operations", present: 10, absent: 2, late: 1 },
];

const leaveTypePieData = [
  { name: "Annual", value: 42, color: "#6366f1" },
  { name: "Sick", value: 18, color: "#f43f5e" },
  { name: "Casual", value: 26, color: "#f59e0b" },
  { name: "Unpaid", value: 8, color: "#94a3b8" },
  { name: "Maternity", value: 6, color: "#a855f7" },
];

const monthlyLeaveData = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (5 - i));
  return {
    month: d.toLocaleString("en-IN", { month: "short" }),
    approved: Math.floor(Math.random() * 12) + 4,
    rejected: Math.floor(Math.random() * 4) + 1,
    pending: Math.floor(Math.random() * 6) + 2,
  };
});

const kpis = [
  { label: "Avg Attendance Rate", value: "94.2%", change: +2.1, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
  { label: "Leave Utilization", value: "68%", change: -1.5, icon: Clock, color: "text-indigo-600 bg-indigo-50" },
  { label: "Active Employees", value: "57", change: +3, icon: Users, color: "text-violet-600 bg-violet-50" },
  { label: "On Leave Today", value: "4", change: -1, icon: XCircle, color: "text-rose-600 bg-rose-50" },
];

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

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AnalyticsPage() {
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
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              kpi.change > 0 ? "text-emerald-600" : "text-rose-500"
            )}>
              {kpi.change > 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />}
              {Math.abs(kpi.change)}{typeof kpi.change === "number" && !kpi.label.includes("Employee") ? "%" : ""} vs last month
            </div>
          </motion.div>
        ))}
      </div>

      {/* Attendance Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
      >
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={mockAttendanceTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomBarTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={2} fill="url(#gPresent)" name="Present" />
            <Area type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={2} fill="url(#gAbsent)" name="Absent" />
            <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="4 2" name="Late" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Two Charts Row */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Department Attendance BarChart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Department-wise Attendance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={departmentData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dept" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="present" fill="#6366f1" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Absent" />
              <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Leave Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Leave Type Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={leaveTypePieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {leaveTypePieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} requests`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {leaveTypePieData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-500">{item.name}</span>
                <span className="text-xs font-semibold text-slate-700 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Monthly Leave Trend BarChart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
      >
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Leave Requests (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyLeaveData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
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
    </div>
    </RoleGuard>
  );
}
