"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color: "indigo" | "emerald" | "amber" | "rose" | "violet" | "sky";
  delay?: number;
}

const colorConfig = {
  indigo: {
    bg: "bg-indigo-50",
    iconBg: "bg-indigo-600",
    iconShadow: "shadow-indigo-200",
    ring: "ring-indigo-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-600",
    iconShadow: "shadow-emerald-200",
    ring: "ring-emerald-100",
  },
  amber: {
    bg: "bg-amber-50",
    iconBg: "bg-amber-500",
    iconShadow: "shadow-amber-200",
    ring: "ring-amber-100",
  },
  rose: {
    bg: "bg-rose-50",
    iconBg: "bg-rose-600",
    iconShadow: "shadow-rose-200",
    ring: "ring-rose-100",
  },
  violet: {
    bg: "bg-violet-50",
    iconBg: "bg-violet-600",
    iconShadow: "shadow-violet-200",
    ring: "ring-violet-100",
  },
  sky: {
    bg: "bg-sky-50",
    iconBg: "bg-sky-600",
    iconShadow: "shadow-sky-200",
    ring: "ring-sky-100",
  },
};

export function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color,
  delay = 0,
}: DashboardCardProps) {
  const colors = colorConfig[color];
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 cursor-default"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
            className="text-3xl font-bold text-slate-900"
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>

        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
          colors.iconBg,
          colors.iconShadow
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-50">
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5",
            isPositive && "text-emerald-700 bg-emerald-100",
            isNegative && "text-red-700 bg-red-100",
            !isPositive && !isNegative && "text-slate-600 bg-slate-100"
          )}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </div>
          <span className="text-xs text-slate-400">{trendLabel || "vs last month"}</span>
        </div>
      )}
    </motion.div>
  );
}
