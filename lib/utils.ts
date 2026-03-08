import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "MMM dd, yyyy") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
}

export function formatTime(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "hh:mm a");
}

export function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-red-100 text-red-700",
    late: "bg-amber-100 text-amber-700",
    "half-day": "bg-blue-100 text-blue-700",
    "on-leave": "bg-purple-100 text-purple-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-slate-100 text-slate-700",
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-slate-100 text-slate-700",
  };
  return map[status] ?? "bg-slate-100 text-slate-700";
}

export function getDepartmentColor(department: string) {
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-teal-100 text-teal-700",
    "bg-pink-100 text-pink-700",
    "bg-orange-100 text-orange-700",
  ];
  const index = department.charCodeAt(0) % colors.length;
  return colors[index];
}

export function calculateHours(checkIn: string, checkOut: string) {
  const start = new Date(`1970-01-01T${checkIn}`);
  const end = new Date(`1970-01-01T${checkOut}`);
  const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.max(0, diff).toFixed(1);
}
