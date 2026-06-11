"use client";

import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Trophy, AlertTriangle, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn, getInitials, getDepartmentColor, getRoleBadgeColor } from "@/lib/utils";
import { RECOMMENDATION_LABELS } from "@/lib/performance";
import type { PerformanceOverviewResponse } from "@/hooks/usePerformance";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#64748b", "#ec4899"];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-slate-600">Avg score: <strong className="text-slate-900">{payload[0].value}</strong></p>
    </div>
  );
}

function MiniEmployeeRow({ rec }: { rec: PerformanceOverviewResponse["topPerformers"][number] }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
      <Avatar className="h-8 w-8 shrink-0">
        {rec.avatar && <AvatarImage src={rec.avatar} alt={rec.fullName} />}
        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-semibold">
          {getInitials(rec.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{rec.fullName}</p>
        <p className="text-xs text-slate-400 truncate">{rec.department ?? "—"}</p>
      </div>
      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full shrink-0", rec.className)}>
        {Math.round(rec.overallScore)}
      </span>
    </div>
  );
}

interface Props {
  data: PerformanceOverviewResponse;
  isAdminOrHr: boolean;
}

export default function PerformanceAdminPanel({ data, isAdminOrHr }: Props) {
  const { rankings, departmentBreakdown, topPerformers, needsAttention, recommendations } = data;

  return (
    <div className="space-y-6">
      {/* Department breakdown + highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Department Performance</h3>
          {departmentBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">No data for this period yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={departmentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <RTooltip content={<ChartTooltip />} />
                <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                  {departmentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Top Performers
            </h3>
            {topPerformers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No data yet.</p>
            ) : (
              <div className="space-y-0.5">
                {topPerformers.map((r) => <MiniEmployeeRow key={r.employeeId} rec={r} />)}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Needs Attention
            </h3>
            {needsAttention.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No flagged employees.</p>
            ) : (
              <div className="space-y-0.5">
                {needsAttention.map((r) => <MiniEmployeeRow key={r.employeeId} rec={r} />)}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Rankings table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:px-6 sm:pt-6">
          <h3 className="text-sm font-semibold text-slate-700">Employee Rankings</h3>
        </div>
        {rankings.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">No performance records for this period yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-12">Rank</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Employee</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Department</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attendance</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tasks</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((r, i) => (
                <TableRow key={r.employeeId} className="border-slate-100 hover:bg-slate-50/60">
                  <TableCell className="text-sm font-bold text-slate-400">#{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {r.avatar && <AvatarImage src={r.avatar} alt={r.fullName} />}
                        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-semibold">
                          {getInitials(r.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{r.fullName}</p>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", getRoleBadgeColor(r.role))}>
                          {r.role}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.department ? (
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", getDepartmentColor(r.department))}>
                        {r.department}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{Math.round(r.attendancePercent)}%</TableCell>
                  <TableCell className="text-sm text-slate-600">{r.tasksCompleted}/{r.tasksAssigned}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", r.className)}>
                      {Math.round(r.overallScore)} · {r.label}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Recommendations (admin/hr only) */}
      {isAdminOrHr && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Recommendations</h3>
          <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-700 text-xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>These are system-generated insights for review only. The system never automatically changes salary,
              role, or employment status — final decisions always remain with Admin.</p>
          </div>
          {recommendations.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No recommendations for this period.</p>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec) => {
                const meta = RECOMMENDATION_LABELS[rec.type];
                return (
                  <div key={rec.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5", meta?.className)}>
                      {meta?.label ?? rec.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{rec.fullName}
                        {rec.department && <span className="text-slate-400 font-normal"> · {rec.department}</span>}
                      </p>
                      {rec.note && <p className="text-xs text-slate-500 mt-0.5">{rec.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
