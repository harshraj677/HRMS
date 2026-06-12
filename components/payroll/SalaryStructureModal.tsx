"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Banknote, CreditCard, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSalaryStructure, useUpsertSalaryStructure } from "@/hooks/usePayroll";
import { fmtINR } from "@/lib/payrollCalculator";

interface Props {
  employeeId: string;
  employeeName: string;
  open: boolean;
  onClose: () => void;
}

const numInput = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
const txtInput = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

export function SalaryStructureModal({ employeeId, employeeName, open, onClose }: Props) {
  const { data: existing } = useSalaryStructure(employeeId);
  const save = useUpsertSalaryStructure(employeeId);

  const blank = {
    basicSalary: 0, hra: 0, specialAllowance: 0, bonus: 0,
    pfDeduction: 0, taxDeduction: 0, otherDeductions: 0,
    bankName: "", accountNumber: "", ifscCode: "", panNumber: "", uanNumber: "",
    salaryEffectiveFrom: "",
  };

  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (existing) {
      setForm({
        basicSalary:      existing.basicSalary,
        hra:              existing.hra,
        specialAllowance: existing.specialAllowance,
        bonus:            existing.bonus,
        pfDeduction:      existing.pfDeduction,
        taxDeduction:     existing.taxDeduction,
        otherDeductions:  existing.otherDeductions,
        bankName:         existing.bankName ?? "",
        accountNumber:    existing.accountNumber ?? "",
        ifscCode:         existing.ifscCode ?? "",
        panNumber:        existing.panNumber ?? "",
        uanNumber:        existing.uanNumber ?? "",
        salaryEffectiveFrom: existing.salaryEffectiveFrom
          ? existing.salaryEffectiveFrom.split("T")[0] : "",
      });
    }
  }, [existing]);

  if (!open) return null;

  const n = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const gross = form.basicSalary + form.hra + form.specialAllowance + form.bonus;
  const deductions = form.pfDeduction + form.taxDeduction + form.otherDeductions;
  const net = Math.max(0, gross - deductions);

  async function handleSave() {
    await save.mutateAsync({
      ...form,
      basicSalary:      Number(form.basicSalary),
      hra:              Number(form.hra),
      specialAllowance: Number(form.specialAllowance),
      bonus:            Number(form.bonus),
      pfDeduction:      Number(form.pfDeduction),
      taxDeduction:     Number(form.taxDeduction),
      otherDeductions:  Number(form.otherDeductions),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Salary Structure</p>
              <p className="text-xs text-slate-400">{employeeName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Live preview */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Gross", value: gross,      color: "text-slate-800" },
              { label: "Deductions", value: deductions, color: "text-red-600" },
              { label: "Net / Month", value: net,  color: "text-emerald-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-2 sm:p-3 text-center">
                <p className={cn("text-sm sm:text-lg font-bold truncate", color)}>{fmtINR(value)}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Earnings */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Earnings</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Basic Salary", key: "basicSalary" as const },
                { label: "HRA", key: "hra" as const },
                { label: "Special Allowance", key: "specialAllowance" as const },
                { label: "Bonus / Incentive", key: "bonus" as const },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
                  <input type="number" min="0" aria-label={label} className={numInput}
                    value={form[key]} onChange={(e) => n(key)(e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Deductions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "PF", key: "pfDeduction" as const },
                { label: "Tax (TDS)", key: "taxDeduction" as const },
                { label: "Other", key: "otherDeductions" as const },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
                  <input type="number" min="0" aria-label={label} className={numInput}
                    value={form[key]} onChange={(e) => n(key)(e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Banking */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Banking Details</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Bank Name",      key: "bankName" as const },
                { label: "Account Number", key: "accountNumber" as const },
                { label: "IFSC Code",      key: "ifscCode" as const },
                { label: "PAN Number",     key: "panNumber" as const },
                { label: "UAN Number",     key: "uanNumber" as const },
                { label: "Effective From", key: "salaryEffectiveFrom" as const, type: "date" },
              ].map(({ label, key, type }) => (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
                  <input type={type ?? "text"} aria-label={label} className={txtInput}
                    value={form[key] ?? ""} placeholder={label}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-700">Changes take effect from the next payroll generation.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={save.isPending}
            className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {save.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Structure"}
          </button>
        </div>
      </div>
    </div>
  );
}
