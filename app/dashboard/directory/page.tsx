"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Mail, Phone, MapPin, Users,
  Building2, ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDirectory } from "@/hooks/useOrg";
import { useDepartments } from "@/hooks/useOrg";
import { cn, getDepartmentColor, getInitials } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function DirectoryPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [dept,   setDept]   = useState("all");
  const { data: departments } = useDepartments();

  const { data: employees, isLoading } = useDirectory({
    search: search || undefined,
    department: dept !== "all" ? dept : undefined,
  });

  // Group by department
  const byDept: Record<string, typeof employees> = {};
  (employees ?? []).forEach((e) => {
    const d = e.department ?? "Other";
    if (!byDept[d]) byDept[d] = [];
    byDept[d]!.push(e);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
        <p className="text-sm text-slate-500 mt-0.5">{employees?.length ?? 0} people</p>
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search by name, email, skill, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-48 h-10 bg-slate-50 border-slate-200 rounded-xl">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(departments ?? []).map((d) => (
              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : (employees?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <Users className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No employees found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter</p>
        </div>
      ) : dept !== "all" ? (
        // Flat grid when filtered
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {employees?.map((e, i) => <EmployeeCard key={e.id} employee={e} idx={i} isAdmin={isAdmin} />)}
        </div>
      ) : (
        // Grouped by department
        Object.entries(byDept).map(([deptName, members]) => (
          <div key={deptName}>
            <div className="flex items-center gap-2.5 mb-3 px-0.5">
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", getDepartmentColor(deptName))}>
                {deptName}
              </span>
              <span className="text-xs text-slate-400">{members?.length} members</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {members?.map((e, i) => <EmployeeCard key={e.id} employee={e} idx={i} isAdmin={isAdmin} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Card component ───────────────────────────────────────────────────────────

function EmployeeCard({
  employee: e,
  idx,
  isAdmin,
}: {
  employee: ReturnType<typeof useDirectory>["data"] extends (infer T)[] | undefined ? T : never;
  idx: number;
  isAdmin: boolean;
}) {
  const [hover, setHover] = useState(false);

  if (!e) return null;

  return (
    <motion.div
      key={e.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-200 transition-all"
    >
      {/* Dept colour accent */}
      <div className={cn("h-1.5", getDepartmentColor(e.department ?? "").split(" ")[0])} />

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-slate-100">
            {e.profile?.avatar
              ? <AvatarImage src={e.profile.avatar} alt={e.fullName} />
              : <AvatarFallback className={cn("text-sm font-bold", getDepartmentColor(e.department ?? ""))}>
                  {getInitials(e.fullName)}
                </AvatarFallback>
            }
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{e.fullName}</p>
            <p className="text-xs text-slate-400 truncate mt-0.5">{e.position ?? "—"}</p>
            {e.department && (
              <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block", getDepartmentColor(e.department))}>
                {e.department}
              </span>
            )}
          </div>
          {isAdmin && (
            <Link href={`/dashboard/employees/${e.id}`}
              className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all", hover ? "opacity-100" : "opacity-0")}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="space-y-1.5">
          <a href={`mailto:${e.email}`}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors truncate">
            <Mail className="w-3 h-3 shrink-0 text-slate-400" />
            <span className="truncate">{e.email}</span>
          </a>
          {e.phone && (
            <a href={`tel:${e.phone}`}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
              <Phone className="w-3 h-3 shrink-0 text-slate-400" />
              {e.phone}
            </a>
          )}
          {e.profile?.workLocation && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
              {e.profile.workLocation}
            </div>
          )}
          {e.managerName && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1 border-t border-slate-50">
              <Building2 className="w-3 h-3 shrink-0" />
              Reports to: <span className="font-medium text-slate-600">{e.managerName}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        {e.profile?.skills && e.profile.skills.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {e.profile.skills.slice(0, 3).map((s) => (
              <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{s}</span>
            ))}
            {e.profile.skills.length > 3 && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">+{e.profile.skills.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
