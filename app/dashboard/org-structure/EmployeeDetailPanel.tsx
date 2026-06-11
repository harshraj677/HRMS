"use client";

import { Mail, Phone, MapPin, Building2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn, getInitials, getDepartmentColor, getRoleBadgeColor } from "@/lib/utils";
import { getDescendantIds } from "@/lib/orgTree";
import { useAssignManager, type OrgTreeEmployee } from "@/hooks/useOrg";

interface EmployeeDetailPanelProps {
  employee: OrgTreeEmployee | null;
  employees: OrgTreeEmployee[];
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE_VALUE = "__none__";

export default function EmployeeDetailPanel({
  employee, employees, canEdit, open, onOpenChange,
}: EmployeeDetailPanelProps) {
  const assignManager = useAssignManager();

  if (!employee) return null;

  const directReportsCount = employees.filter((e) => e.reportingManagerId === employee.id).length;
  const excludedIds = new Set([employee.id, ...getDescendantIds(employee.id, employees)]);
  const managerOptions = employees.filter((e) => !excludedIds.has(e.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{employee.fullName}</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-slate-100">
            {employee.profile?.avatar ? (
              <AvatarImage src={employee.profile.avatar} alt={employee.fullName} />
            ) : (
              <AvatarFallback className={cn("text-base font-bold", getDepartmentColor(employee.department ?? ""))}>
                {getInitials(employee.fullName)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-slate-900 truncate">{employee.fullName}</p>
            <p className="text-sm text-slate-400 truncate">{employee.position ?? "—"}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {employee.department && (
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", getDepartmentColor(employee.department))}>
                  {employee.department}
                </span>
              )}
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", getRoleBadgeColor(employee.role))}>
                {employee.role}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <a href={`mailto:${employee.email}`}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors truncate">
            <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{employee.email}</span>
          </a>
          {employee.phone && (
            <a href={`tel:${employee.phone}`}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors">
              <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              {employee.phone}
            </a>
          )}
          {employee.profile?.workLocation && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              {employee.profile.workLocation}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            Reports to: <span className="font-medium text-slate-800">{employee.managerName ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            {directReportsCount} direct report{directReportsCount !== 1 ? "s" : ""}
          </div>
        </div>

        {canEdit && (
          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Reporting Manager</label>
            <Select
              value={employee.reportingManagerId ?? NONE_VALUE}
              disabled={assignManager.isPending}
              onValueChange={(value) => {
                assignManager.mutate({
                  employeeId: employee.id,
                  managerId: value === NONE_VALUE ? null : value,
                });
              }}
            >
              <SelectTrigger className="w-full h-10 bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None (top-level)</SelectItem>
                {managerOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
