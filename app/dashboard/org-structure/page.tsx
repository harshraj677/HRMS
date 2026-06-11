"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Users, Building2, UsersRound, Layers,
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useOrgTree } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { canManageOrgStructure } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  buildOrgForest, getOrgStats, getDistinctValues, getMatchIds, getVisibleIds,
} from "@/lib/orgTree";
import OrgTreeNode from "./OrgTreeNode";
import EmployeeDetailPanel from "./EmployeeDetailPanel";

const ALL = "all";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

export default function OrgStructurePage() {
  const { data: user } = useAuth();
  const { data: employees, isLoading } = useOrgTree();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState(ALL);
  const [positionFilter, setPositionFilter] = useState(ALL);
  const [locationFilter, setLocationFilter] = useState(ALL);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  const canEdit = canManageOrgStructure(user?.role ?? "");

  const forest = useMemo(() => buildOrgForest(employees ?? []), [employees]);
  const stats = useMemo(() => getOrgStats(employees ?? []), [employees]);
  const departments = useMemo(() => getDistinctValues(employees ?? [], (e) => e.department), [employees]);
  const positions = useMemo(() => getDistinctValues(employees ?? [], (e) => e.position), [employees]);
  const locations = useMemo(() => getDistinctValues(employees ?? [], (e) => e.profile?.workLocation), [employees]);

  const hasActiveFilter = !!search || deptFilter !== ALL || positionFilter !== ALL || locationFilter !== ALL;

  const matchIds = useMemo(
    () => getMatchIds(employees ?? [], search, {
      department: deptFilter !== ALL ? deptFilter : undefined,
      position: positionFilter !== ALL ? positionFilter : undefined,
      location: locationFilter !== ALL ? locationFilter : undefined,
    }),
    [employees, search, deptFilter, positionFilter, locationFilter]
  );
  const visibleIds = useMemo(() => getVisibleIds(forest, matchIds), [forest, matchIds]);

  // Pre-expand the top 2 levels by default once data loads.
  useEffect(() => {
    if (forest.length > 0 && expandedIds.size === 0) {
      const ids = new Set<string>();
      for (const root of forest) {
        ids.add(root.id);
        for (const child of root.children) ids.add(child.id);
      }
      setExpandedIds(ids);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forest]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDeptFilter(ALL);
    setPositionFilter(ALL);
    setLocationFilter(ALL);
  };

  const selectedEmployee = employees?.find((e) => e.id === selectedEmployeeId) ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Organization Structure</h2>
        <p className="text-sm text-slate-500 mt-0.5">{employees?.length ?? 0} people</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Employees" value={stats.totalEmployees} color="bg-indigo-100 text-indigo-600" delay={0} />
        <StatCard icon={Building2} label="Departments" value={stats.totalDepartments} color="bg-violet-100 text-violet-600" delay={0.04} />
        <StatCard icon={UsersRound} label="Managers" value={stats.totalManagers} color="bg-sky-100 text-sky-600" delay={0.08} />
        <StatCard icon={Layers} label="Org Depth" value={stats.maxDepth} color="bg-teal-100 text-teal-600" delay={0.12} />
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search by name, email, position, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-50 border-slate-200 rounded-xl">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Departments</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-50 border-slate-200 rounded-xl">
            <SelectValue placeholder="All Designations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Designations</SelectItem>
            {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-50 border-slate-200 rounded-xl">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Locations</SelectItem>
            {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="h-10 px-4 rounded-xl text-sm font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Tree container */}
      {isLoading ? (
        <Skeleton className="h-[500px] rounded-2xl" />
      ) : (employees?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <Users className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No employees found</p>
        </div>
      ) : hasActiveFilter && matchIds.size === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <Search className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No matches found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={cn(
            "relative bg-white border border-slate-100 shadow-sm overflow-auto",
            isFullscreen ? "h-full p-6" : "rounded-2xl p-4 h-[600px]"
          )}
        >
          <div className="sticky top-0 right-0 float-right z-10 flex items-center gap-1 bg-white/90 backdrop-blur rounded-xl border border-slate-200 shadow-sm p-1 w-fit">
            <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(1)))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoom(1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(1)))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button onClick={toggleFullscreen}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            className="transition-transform duration-150 min-w-max inline-flex gap-8 pt-10 pb-4"
          >
            {forest.map((root) => (
              <OrgTreeNode
                key={root.id}
                node={root}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
                onSelect={setSelectedEmployeeId}
                matchIds={matchIds}
                visibleIds={visibleIds}
                filtering={hasActiveFilter}
                selectedId={selectedEmployeeId}
              />
            ))}
          </div>
        </div>
      )}

      <EmployeeDetailPanel
        employee={selectedEmployee}
        employees={employees ?? []}
        canEdit={canEdit}
        open={!!selectedEmployeeId}
        onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, delay }: {
  icon: typeof Users; label: string; value: number; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </motion.div>
  );
}
