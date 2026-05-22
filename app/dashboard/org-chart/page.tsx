"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getDepartmentColor, getInitials } from "@/lib/utils";
import { useOrgTree, type OrgNode } from "@/hooks/useOrg";

// ─── Single node card ─────────────────────────────────────────────────────────

function NodeCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  const depthColors = [
    "border-indigo-300 bg-indigo-50",
    "border-violet-300 bg-violet-50",
    "border-sky-300 bg-sky-50",
    "border-teal-300 bg-teal-50",
    "border-slate-200 bg-white",
  ];
  const cardColor = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div className={cn(
        "relative border-2 rounded-2xl px-4 py-3 shadow-sm w-44 text-center transition-all",
        cardColor,
        hasChildren && "cursor-pointer hover:shadow-md",
      )}
        onClick={() => hasChildren && setExpanded((e) => !e)}
      >
        <Avatar className="h-10 w-10 mx-auto mb-2 ring-2 ring-white shadow">
          {node.avatar
            ? <AvatarImage src={node.avatar} alt={node.fullName} />
            : <AvatarFallback className={cn("text-xs font-bold", getDepartmentColor(node.department ?? ""))}>
                {getInitials(node.fullName)}
              </AvatarFallback>
          }
        </Avatar>
        <p className="text-xs font-bold text-slate-800 leading-tight">{node.fullName}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{node.position ?? "—"}</p>
        {node.department && (
          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1.5 inline-block", getDepartmentColor(node.department))}>
            {node.department}
          </span>
        )}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            {expanded
              ? <ChevronDown className="w-3 h-3 text-slate-400" />
              : <ChevronRight className="w-3 h-3 text-slate-400" />}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-6 relative">
          {/* Vertical connector from card */}
          <div className="absolute top-0 left-1/2 -translate-x-px w-0.5 h-4 bg-slate-200" />

          {/* Horizontal bar + vertical drops */}
          <div className="flex items-start gap-6 pt-4 relative">
            {node.children.length > 1 && (
              <div
                className="absolute top-4 h-0.5 bg-slate-200"
                style={{
                  left: `calc(${(1 / (node.children.length * 2)) * 100}%)`,
                  right: `calc(${(1 / (node.children.length * 2)) * 100}%)`,
                }}
              />
            )}
            {node.children.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center relative">
                {/* Vertical drop connector */}
                <div className="w-0.5 h-4 bg-slate-200 mb-0" />
                <NodeCard node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const { data: tree, isLoading } = useOrgTree();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Organisation Chart</h2>
        <p className="text-sm text-slate-500 mt-0.5">Company hierarchy and reporting structure</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 flex flex-col items-center gap-6">
          <Skeleton className="h-16 w-44 rounded-2xl" />
          <div className="flex gap-6">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-44 rounded-2xl" />)}
          </div>
        </div>
      ) : !tree || tree.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <Building2 className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No hierarchy set up yet</p>
          <p className="text-xs text-slate-400 mt-1">Assign reporting managers to employees to build the org chart</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 overflow-x-auto">
          <div className="flex gap-12 min-w-max justify-center">
            {tree.map((root) => (
              <motion.div
                key={root.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <NodeCard node={root} depth={0} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        {[
          { color: "border-indigo-300 bg-indigo-50", label: "Top Level" },
          { color: "border-violet-300 bg-violet-50", label: "Management" },
          { color: "border-sky-300 bg-sky-50",       label: "Team Lead" },
          { color: "border-teal-300 bg-teal-50",     label: "Individual" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn("w-4 h-4 rounded border-2", color)} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
