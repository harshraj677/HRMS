"use client";

import { motion } from "framer-motion";
import { RoleGuard } from "@/components/RoleGuard";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Users, Clock, AlertTriangle, Trophy,
  Briefcase, UserCheck, Banknote, MessageSquare, LogOut,
  ChevronDown,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAnalytics, useDashboardStats } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fmtINR } from "@/lib/payrollCalculator";

const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#f43f5e","#64748b","#ec4899"];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex justify-between gap-4 text-slate-600">
          <span>{p.name}</span>
          <strong className="text-slate-900">
            {typeof p.value === "number" && p.value > 10000 ? fmtINR(p.value) : p.value}
          </strong>
        </p>
      ))}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: typeof TrendingUp; label: string; value: string | number; sub?: string; color: string; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs font-medium text-emerald-600 mt-0.5">{sub}</p>}
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </motion.div>
  );
}

function ChartCard({ title, delay = 0, children }: { title: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics();
  const { data: stats } = useDashboardStats();

  if (isLoading) return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold text-slate-900">Analytics</h2></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      </div>
    </RoleGuard>
  );

  const a = analytics as any;

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Comprehensive workforce & operations insights</p>
        </div>

        {/* ── KPI Row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            { icon: Users,         label: "Employees",    value: stats?.totalEmployees ?? a?.totalEmployees ?? "–",  color: "bg-indigo-100 text-indigo-600",  sub: undefined },
            { icon: TrendingUp,    label: "Present Today",value: stats?.presentToday ?? "–",   color: "bg-emerald-100 text-emerald-600", sub: stats?.percentPresent ? `${stats.percentPresent}%` : undefined },
            { icon: Clock,         label: "Late Today",   value: stats?.lateToday ?? "–",      color: "bg-amber-100 text-amber-600",    sub: undefined },
            { icon: AlertTriangle, label: "Security Flags",value: a?.suspiciousCount ?? "–",   color: "bg-rose-100 text-rose-600",      sub: undefined },
            { icon: Briefcase,     label: "Active Jobs",  value: a?.recruitment?.activeJobs ?? "–",  color: "bg-violet-100 text-violet-600", sub: undefined },
            { icon: UserCheck,     label: "Selected",     value: a?.recruitment?.selected ?? "–",     color: "bg-teal-100 text-teal-600",    sub: undefined },
            { icon: MessageSquare, label: "Open Tickets", value: a?.helpdesk?.openCount ?? "–",       color: "bg-sky-100 text-sky-600",      sub: undefined },
            { icon: LogOut,        label: "Attrition Rate",value: a?.exits?.attritionRate != null ? `${a.exits.attritionRate}%` : "–", color: "bg-orange-100 text-orange-600", sub: undefined },
          ].map(({ icon, label, value, color, sub }, i) => (
            <KPICard key={label} icon={icon} label={label} value={value} sub={sub} color={color} delay={i * 0.04} />
          ))}
        </div>

        {/* ── Row 1: Attendance Trend + Department Distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {a?.attendanceTrend?.length > 0 && (
            <ChartCard title="Daily Attendance Trend (30 Days)" delay={0.2}>
              <div className="col-span-2 lg:col-span-2" />
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={a.attendanceTrend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RTooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={2} fill="url(#gP)" name="Present" />
                  <Area type="monotone" dataKey="late"    stroke="#f59e0b" strokeWidth={2} fill="url(#gL)"  name="Late" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {a?.departmentDistribution?.length > 0 && (
            <ChartCard title="Department Distribution" delay={0.25}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={a.departmentDistribution} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {a.departmentDistribution.map((_: any, idx: number) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* ── Row 2: Dept Attendance + Employee Growth ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {a?.departmentAttendance?.length > 0 && (
            <ChartCard title="Department Attendance (This Month)" delay={0.3}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={a.departmentAttendance} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="present" fill="#6366f1" radius={[4,4,0,0]} name="Present" />
                  <Bar dataKey="late"    fill="#f59e0b" radius={[4,4,0,0]} name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {a?.employeeGrowth?.length > 0 && (
            <ChartCard title="Employee Growth (12 Months)" delay={0.35}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={a.employeeGrowth} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RTooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: "#8b5cf6", r: 4 }} name="New Hires" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* ── Row 3: Payroll Trend + Recruitment Funnel ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {a?.payroll?.trend?.length > 0 && (
            <ChartCard title="Monthly Payroll Payout (₹)" delay={0.4}>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-700">{fmtINR(a.payroll.totalPaid)}</p>
                  <p className="text-[10px] text-slate-400">Paid</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600">{fmtINR(a.payroll.totalPending)}</p>
                  <p className="text-[10px] text-slate-400">Pending</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={a.payroll.trend} margin={{ top: 0, right: 5, left: -5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="grossSalary" fill="#6366f1" radius={[4,4,0,0]} name="Gross" />
                  <Bar dataKey="netSalary"   fill="#10b981" radius={[4,4,0,0]} name="Net" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {a?.recruitment?.funnel?.length > 0 && (
            <ChartCard title="Recruitment Funnel" delay={0.45}>
              <div className="flex items-center gap-4 mb-3 text-xs">
                <div className="text-center"><p className="text-lg font-bold text-indigo-600">{a.recruitment.totalCandidates}</p><p className="text-slate-400">Total Candidates</p></div>
                <div className="text-center"><p className="text-lg font-bold text-emerald-600">{a.recruitment.selected}</p><p className="text-slate-400">Selected</p></div>
                <div className="text-center"><p className="text-lg font-bold text-violet-600">{a.recruitment.referredCount}</p><p className="text-slate-400">Referrals</p></div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={a.recruitment.funnel} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={65} />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0,4,4,0]} name="Candidates" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* ── Row 4: Helpdesk + Leave Monthly ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {a?.helpdesk && (
            <ChartCard title="Helpdesk Analytics (30 Days)" delay={0.5}>
              <div className="flex items-center gap-5 mb-4 text-xs">
                <div className="text-center"><p className="text-xl font-bold text-red-600">{a.helpdesk.openCount}</p><p className="text-slate-400">Open</p></div>
                <div className="text-center"><p className="text-xl font-bold text-emerald-600">{a.helpdesk.resolvedCount}</p><p className="text-slate-400">Resolved</p></div>
                <div className="text-center"><p className="text-xl font-bold text-slate-700">{a.helpdesk.avgResolutionHours}h</p><p className="text-slate-400">Avg Resolution</p></div>
              </div>
              {a.helpdesk.byCategory?.length > 0 && (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={a.helpdesk.byCategory} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[4,4,0,0]} name="Tickets">
                      {a.helpdesk.byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}

          {a?.leaveMonthly?.length > 0 && (
            <ChartCard title="Monthly Leave Requests" delay={0.55}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={a.leaveMonthly} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="approved" fill="#6366f1" radius={[4,4,0,0]} stackId="a" name="Approved" />
                  <Bar dataKey="rejected" fill="#f43f5e" stackId="a" name="Rejected" />
                  <Bar dataKey="pending"  fill="#f59e0b" radius={[4,4,0,0]} stackId="a" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* ── Employee Ranking ──────────────────────────────────── */}
        {a?.employeeRanking?.length > 0 && (
          <ChartCard title="Top Employees by Attendance (This Month)" delay={0.6}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {a.employeeRanking.map((emp: any, i: number) => (
                <div key={emp.fullName} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className={cn("w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0",
                    i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400")}>
                    {i + 1}
                  </span>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`} />
                    <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">{getInitials(emp.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{emp.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.department ?? "—"}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 shrink-0">{emp.presentDays}d</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}
      </div>
    </RoleGuard>
  );
}
