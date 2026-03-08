"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

// These hooks were removed — Charts component is unused.
// Providing minimal stubs to avoid compile errors.
const useAttendanceTrend = () => ({ data: [] as any[], isLoading: false });
const useLeaveDistribution = () => ({ data: [] as { name: string; value: number; color: string }[], isLoading: false });

// ─── Attendance Trend Chart ───────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-3 text-xs space-y-1.5">
        <p className="font-semibold text-slate-700">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500 capitalize">{entry.name}:</span>
            <span className="font-semibold text-slate-800">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AttendanceTrendChart() {
  const { data, isLoading } = useAttendanceTrend();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <Skeleton className="h-5 w-40 mb-1" />
        <Skeleton className="h-4 w-56 mb-6" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Attendance Trend</h3>
          <p className="text-sm text-slate-400">Last 30 days daily attendance</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-slate-500">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-slate-500">Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-500">Late</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fb7185" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="present"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#presentGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="absent"
            stroke="#fb7185"
            strokeWidth={2}
            fill="url(#absentGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="late"
            stroke="#fbbf24"
            strokeWidth={2}
            fill="transparent"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ─── Leave Distribution Chart ─────────────────────────────────────────────────

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.08) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function LeaveDistributionChart() {
  const { data, isLoading } = useLeaveDistribution();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <Skeleton className="h-5 w-40 mb-1" />
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="flex items-center justify-center">
          <Skeleton className="h-44 w-44 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
    >
      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-900">Leave Distribution</h3>
        <p className="text-sm text-slate-400">By leave type this quarter</p>
      </div>

      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value} days`, ""]}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 gap-2 w-full mt-2">
          {data?.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-500">{entry.name}</span>
              <span className="ml-auto font-semibold text-slate-700">{entry.value}d</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
