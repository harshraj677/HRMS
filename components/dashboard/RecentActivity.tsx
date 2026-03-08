"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { mockLeaveRequests, mockAttendanceRecords } from "@/lib/mock-data";

const activities = [
  {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    title: "Sneha Patel's leave approved",
    desc: "Annual leave Mar 4–8 approved by Meera Reddy",
    time: "2h ago",
  },
  {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: "New leave request",
    desc: "Arjun Sharma requested sick leave for Mar 10–11",
    time: "4h ago",
  },
  {
    icon: Clock,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    title: "Late check-in",
    desc: "Rahul Verma checked in at 10:15 AM",
    time: "Yesterday",
  },
  {
    icon: XCircle,
    color: "text-rose-600",
    bg: "bg-rose-50",
    title: "Leave request rejected",
    desc: "Rohan Gupta's casual leave was rejected",
    time: "2 days ago",
  },
  {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    title: "Karthik Menon's leave approved",
    desc: "Sick leave Feb 20–21 approved",
    time: "3 days ago",
  },
];

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
    >
      <div className="mb-5">
        <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
        <p className="text-sm text-slate-400">Latest team updates</p>
      </div>

      <div className="space-y-4">
        {activities.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.07 }}
              className="flex items-start gap-3"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`}>
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{item.desc}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{item.time}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
