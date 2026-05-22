"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Building2, Users, Pencil, Trash2, Loader2, CheckCircle2, X } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getDepartmentColor } from "@/lib/utils";
import {
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  type DepartmentData,
} from "@/hooks/useOrg";
import { useEmployees } from "@/hooks/useEmployees";

function DeptForm({
  initial,
  managers,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<DepartmentData>;
  managers: { id: string; fullName: string }[];
  onSave: (d: { name: string; code: string; description: string; managerId: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [mgr,  setMgr]  = useState(initial?.managerId ?? "");

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Name *</label>
          <input className={inp} value={name} placeholder="e.g. Engineering" onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Code</label>
          <input className={inp} value={code} placeholder="e.g. ENG" onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
          <input className={inp} value={desc} placeholder="Brief description…" onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Department Head</label>
          <select aria-label="Department head" className={inp} value={mgr} onChange={(e) => setMgr(e.target.value)}>
            <option value="">— None —</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 h-9 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
        <button type="button" disabled={!name.trim() || saving}
          onClick={() => onSave({ name, code, description: desc, managerId: mgr })}
          className="flex-1 h-9 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Save</>}
        </button>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments();
  const { data: employees } = useEmployees();
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const remove = useDeleteDepartment();

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const managers = (employees ?? []).filter((e) => e.role === "admin" || e.role === "manager");

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Departments</h2>
            <p className="text-sm text-slate-500 mt-0.5">{departments?.length ?? 0} departments</p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/25">
            <Plus className="w-4 h-4" /> Add Department
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-800 mb-4">New Department</p>
            <DeptForm managers={managers} saving={create.isPending}
              onCancel={() => setShowCreate(false)}
              onSave={async (d) => { await create.mutateAsync(d); setShowCreate(false); }} />
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : departments?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <Building2 className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No departments yet</p>
            <p className="text-xs text-slate-400 mt-1">Create your first department above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments?.map((dept, i) => (
              <motion.div key={dept.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {editId === dept.id ? (
                  <div className="p-5">
                    <p className="text-sm font-semibold text-slate-800 mb-3">Edit Department</p>
                    <DeptForm initial={dept} managers={managers} saving={update.isPending}
                      onCancel={() => setEditId(null)}
                      onSave={async (d) => { await update.mutateAsync({ id: dept.id, ...d }); setEditId(null); }} />
                  </div>
                ) : (
                  <>
                    <div className="h-2" style={{ background: `var(--dept-color, #6366f1)` }}>
                      <div className={cn("h-full", getDepartmentColor(dept.name).split(" ")[0])} />
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold", getDepartmentColor(dept.name))}>
                            {dept.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{dept.name}</p>
                            {dept.code && <p className="text-[10px] font-mono text-slate-400">{dept.code}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setEditId(dept.id)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => remove.mutate(dept.id)} disabled={remove.isPending}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-40">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {dept.description && (
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{dept.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-semibold text-slate-800">{dept.employeeCount}</span>
                          <span>employees</span>
                        </div>
                        {dept.managerName && (
                          <span className="text-xs text-slate-400 truncate max-w-[120px]">
                            Head: <span className="font-medium text-slate-600">{dept.managerName}</span>
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          dept.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {dept.status}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
