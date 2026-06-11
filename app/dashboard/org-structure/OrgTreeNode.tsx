"use client";

import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials, getDepartmentColor, getRoleBadgeColor } from "@/lib/utils";
import type { OrgNode } from "@/lib/orgTree";

interface OrgTreeNodeProps {
  node: OrgNode;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  matchIds: Set<string>;
  visibleIds: Set<string>;
  filtering: boolean;
  selectedId: string | null;
}

export default function OrgTreeNode({
  node,
  expandedIds,
  onToggleExpand,
  onSelect,
  matchIds,
  visibleIds,
  filtering,
  selectedId,
}: OrgTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const expanded = filtering ? visibleIds.has(node.id) : expandedIds.has(node.id);
  const dimmed = filtering && !visibleIds.has(node.id);
  const highlighted = filtering && matchIds.has(node.id);
  const selected = selectedId === node.id;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: dimmed ? 0.3 : 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={() => onSelect(node.id)}
        className={cn(
          "bg-white rounded-xl border border-slate-100 shadow-sm p-2.5 min-w-[180px] cursor-pointer hover:shadow-md hover:border-slate-200 transition-shadow",
          dimmed && "pointer-events-none",
          highlighted && "ring-2 ring-amber-400",
          selected && "ring-2 ring-indigo-500"
        )}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-slate-100">
            {node.profile?.avatar ? (
              <AvatarImage src={node.profile.avatar} alt={node.fullName} />
            ) : (
              <AvatarFallback className={cn("text-[10px] font-bold", getDepartmentColor(node.department ?? ""))}>
                {getInitials(node.fullName)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate">{node.fullName}</p>
            <p className="text-[10px] text-slate-400 truncate">{node.position ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {node.department && (
            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", getDepartmentColor(node.department))}>
              {node.department}
            </span>
          )}
          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", getRoleBadgeColor(node.role))}>
            {node.role}
          </span>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {node.children.length} report{node.children.length !== 1 ? "s" : ""}
          </button>
        )}
      </motion.div>

      {hasChildren && expanded && (
        <>
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex">
            {node.children.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center px-3 relative">
                {node.children.length > 1 && (
                  <div
                    className={cn(
                      "absolute top-0 h-px bg-slate-300",
                      i === 0 && "left-1/2 right-0",
                      i === node.children.length - 1 && "left-0 right-1/2",
                      i > 0 && i < node.children.length - 1 && "left-0 right-0"
                    )}
                  />
                )}
                <div className="w-px h-4 bg-slate-300" />
                <OrgTreeNode
                  node={child}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  onSelect={onSelect}
                  matchIds={matchIds}
                  visibleIds={visibleIds}
                  filtering={filtering}
                  selectedId={selectedId}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
