"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Briefcase, MapPin, PhoneCall,
  GraduationCap, Globe, FileText, CalendarCheck,
  ClipboardList, CheckCircle2, Mail, Phone, Building,
  Calendar, ShieldCheck, ShieldOff, ExternalLink,
  Loader2, Trash2, Upload, Banknote,
} from "lucide-react";
import { SalaryStructureModal } from "@/components/payroll/SalaryStructureModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEmployee } from "@/hooks/useEmployees";
import { useProfile, useUpdateProfile, useProfileDocuments, useDeleteDocument, useVerifyDocument, useUploadDocument } from "@/hooks/useProfile";
import { useAttendanceHistory } from "@/hooks/useAttendance";
import { useLeaveRequests } from "@/hooks/useLeave";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate, getDepartmentColor, getStatusColor, getInitials } from "@/lib/utils";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { toast } from "sonner";
import { useRef } from "react";

const GENDERS     = ["Male","Female","Non-binary","Prefer not to say"];
const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const MARITAL     = ["Single","Married","Divorced","Widowed"];
const EMP_TYPES   = ["Full-time","Part-time","Contract","Intern","Consultant"];
const EMP_STATUS  = ["Active","On-leave","Probation","Notice-period","Inactive"];
const SHIFTS      = ["Morning (9–5)","Evening (2–10)","Night (10–6)","Flexible","Remote"];
const DOC_TYPES   = ["resume","aadhaar","pan","certificate","offer_letter"];

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <select
        aria-label={label}
        className="w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <input
        type={type}
        className="w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ViewField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700">
        {value !== null && value !== undefined && value !== "" ? String(value) : <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

function SectionCard({ title, icon, canEdit, children, onEdit, editing, onSave, onCancel, saving }: {
  title: string; icon: React.ReactNode; canEdit: boolean; children: React.ReactNode;
  onEdit?: () => void; editing?: boolean; onSave?: () => void; onCancel?: () => void; saving?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">{icon}</div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={onEdit}
            className="text-xs font-medium text-slate-400 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1">
            <span className="text-[11px]">✎</span> Edit
          </button>
        )}
        {canEdit && editing && (
          <div className="flex gap-2">
            <button type="button" onClick={onCancel}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
            <button type="button" onClick={onSave} disabled={saving}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-all">
              {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : <>✓ Save</>}
            </button>
          </div>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface Props { params: Promise<{ id: string }> }

export default function EmployeeProfilePage({ params }: Props) {
  const { id } = use(params);
  const { data: user } = useAuth();
  const { data: employee, isLoading: empLoad } = useEmployee(id);
  const { data: profile, isLoading: profLoad } = useProfile(id);
  const { data: docs = [] } = useProfileDocuments(id);
  const { data: attendance } = useAttendanceHistory(id);
  const { data: leaveRequests } = useLeaveRequests();
  const update = useUpdateProfile(id);
  const deleteDoc = useDeleteDocument(id);
  const verifyDoc = useVerifyDocument(id);
  const uploadDoc = useUploadDocument(id);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "admin";
  const isSelf  = user?.id != null && String(user.id) === id;
  const canEdit = isAdmin || isSelf;

  // section edit states
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [docType, setDocType] = useState("resume");
  const [docName, setDocName] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);

  function startEdit(section: string) {
    setEditing(section);
    setDraft({});
  }
  function set(key: string, val: unknown) { setDraft((d) => ({ ...d, [key]: val })); }
  function get(key: string): string { return (draft[key] as string) ?? (profile as Record<string, unknown>)?.[key] as string ?? ""; }

  async function save() {
    if (!editing) return;
    await update.mutateAsync(draft);
    setEditing(null);
    setDraft({});
  }

  function cancel() { setEditing(null); setDraft({}); }

  const fmtTime = (iso: string | null) => {
    if (!iso) return "–";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const completion = calculateProfileCompletion({
    fullName: employee?.fullName,
    email: employee?.email,
    phone: employee?.phone ?? undefined,
    dateOfBirth: (profile as any)?.dateOfBirth,
    gender: (profile as any)?.gender,
    nationality: (profile as any)?.nationality,
    maritalStatus: (profile as any)?.maritalStatus,
    addressLine1: (profile as any)?.addressLine1,
    city: (profile as any)?.city,
    state: (profile as any)?.state,
    postalCode: (profile as any)?.postalCode,
    country: (profile as any)?.country,
    emergencyName: (profile as any)?.emergencyName,
    emergencyPhone: (profile as any)?.emergencyPhone,
    highestEducation: (profile as any)?.highestEducation,
    institution: (profile as any)?.institution,
    skills: (profile as any)?.skills,
    certifications: (profile as any)?.certifications,
    experience: (profile as any)?.experience,
    avatar: (profile as any)?.avatar,
    department: employee?.department ?? undefined,
    position: employee?.position ?? undefined,
  });

  const leaveUsed = 18 - (employee?.leaveBalance ?? 18);
  const employeeLeaves = leaveRequests?.filter((l: any) => String(l.employeeId) === id) ?? [];

  if (empLoad || profLoad) return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
    </div>
  );

  if (!employee) return (
    <div className="text-center py-20">
      <p className="text-slate-500">Employee not found</p>
      <Link href="/dashboard/employees"><Button variant="outline" className="mt-4">Back</Button></Link>
    </div>
  );

  const profileImg = (profile as any)?.avatar;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="rounded-xl -ml-2 text-slate-500" asChild>
          <Link href="/dashboard/employees"><ArrowLeft className="w-4 h-4" /> Back to Employees</Link>
        </Button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setSalaryModalOpen(true)}
            className="ml-auto flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <Banknote className="w-4 h-4" /> Set Salary
          </button>
        )}
      </div>

      {/* ── Profile Header ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-28 sm:h-36 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />
        <div className="px-5 sm:px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="relative z-10">
              <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
                {profileImg
                  ? <AvatarImage src={profileImg} alt={employee.fullName} />
                  : <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white font-bold">{getInitials(employee.fullName)}</AvatarFallback>
                }
              </Avatar>
              {canEdit && (
                <button type="button" onClick={() => { setDocType("avatar"); fileRef.current?.click(); }}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors"
                  title="Change photo">
                  <Upload className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{employee.fullName}</h2>
                <Badge variant="outline" className={cn("capitalize text-xs font-semibold",
                  employee.role === "admin" ? "border-violet-200 text-violet-700 bg-violet-50" : "border-slate-200 text-slate-600")}>
                  {employee.role}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{employee.position ?? "—"}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {employee.department && (
                  <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full", getDepartmentColor(employee.department))}>
                    {employee.department}
                  </span>
                )}
                <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full",
                  completion >= 80 ? "bg-emerald-50 text-emerald-700" : completion >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>
                  {completion}% complete
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
            {[
              { icon: Mail,     label: "Email",      value: employee.email },
              { icon: Phone,    label: "Phone",      value: employee.phone ?? "—" },
              { icon: Building, label: "Department", value: employee.department ?? "—" },
              { icon: Calendar, label: "Joined",     value: formatDate(employee.createdAt) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden file input for avatar */}
      <input ref={fileRef} type="file" accept="image/*" aria-label="Upload profile photo" className="sr-only" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Compress via canvas then upload
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = async () => {
            const MAX = 400;
            const r = Math.min(MAX/img.width, MAX/img.height, 1);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width*r); canvas.height = Math.round(img.height*r);
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            await fetch(`/api/profile/${id}/avatar`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageData: dataUrl }),
            });
            window.location.reload();
          };
          img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = "";
      }} />

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="profile">
        <TabsList className="bg-white border border-slate-100 shadow-sm h-10 p-1 rounded-xl">
          <TabsTrigger value="profile"    className="rounded-lg text-xs font-semibold">Profile</TabsTrigger>
          <TabsTrigger value="documents"  className="rounded-lg text-xs font-semibold">Documents</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-lg text-xs font-semibold">Attendance</TabsTrigger>
          <TabsTrigger value="leaves"     className="rounded-lg text-xs font-semibold">Leave History</TabsTrigger>
        </TabsList>

        {/* ── PROFILE TAB ───────────────────────────────────────── */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">

            {/* Sidebar: Completion + Stats */}
            <div className="lg:col-span-1 space-y-4">
              {/* Profile Completion Ring */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Profile Completion</h3>
                <div className="flex items-center gap-4">
                  {(() => {
                    const r = 36; const c = 2*Math.PI*r; const off = c - (completion/100)*c;
                    const col = completion >= 80 ? "#10b981" : completion >= 50 ? "#f59e0b" : "#f87171";
                    return (
                      <div className="relative shrink-0">
                        <svg width="88" height="88" viewBox="0 0 88 88">
                          <circle cx="44" cy="44" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
                          <circle cx="44" cy="44" r={r} fill="none" stroke={col} strokeWidth="7"
                            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
                            transform="rotate(-90 44 44)" className="transition-[stroke-dashoffset] duration-500 ease-in-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={cn("text-xl font-bold leading-none",
                            completion >= 80 ? "text-emerald-500" : completion >= 50 ? "text-amber-500" : "text-red-400"
                          )}>{completion}%</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">complete</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex-1 space-y-1.5">
                    {[
                      { label: "Basic Info", done: !!(employee.phone && (profile as any)?.gender) },
                      { label: "Address", done: !!(profile as any)?.city },
                      { label: "Emergency Contact", done: !!(profile as any)?.emergencyName },
                      { label: "Education", done: !!(profile as any)?.highestEducation },
                      { label: "Photo", done: !!(profile as any)?.avatar },
                      { label: "Documents", done: docs.length > 0 },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-1.5">
                        <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0", s.done ? "bg-emerald-100" : "bg-slate-100")}>
                          {s.done ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        </div>
                        <span className={cn("text-[11px] font-medium", s.done ? "text-slate-600" : "text-slate-400")}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leave Stats */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Leave Balance</h3>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-slate-600">Annual Leave</span>
                  <span><strong className="text-slate-900">{employee.leaveBalance ?? 18}</strong><span className="text-slate-400">/18</span></span>
                </div>
                <Progress value={((employee.leaveBalance ?? 18) / 18) * 100} className="h-2" />
                <p className="text-xs text-slate-400 mt-1.5">{leaveUsed} days used</p>
                <div className="mt-3 pt-3 border-t border-slate-50 space-y-2.5">
                  {[
                    { icon: CalendarCheck, label: "Balance", value: `${employee.leaveBalance ?? 18}d`, color: "bg-indigo-50 text-indigo-600" },
                    { icon: ClipboardList, label: "Taken",   value: `${leaveUsed}d`,                   color: "bg-amber-50 text-amber-600" },
                    { icon: CheckCircle2,  label: "Records", value: `${attendance?.length ?? 0}`,       color: "bg-violet-50 text-violet-600" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", color)}><Icon className="w-4 h-4" /></div>
                      <div><p className="text-[11px] text-slate-400">{label}</p><p className="text-sm font-semibold text-slate-800">{value}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main: All Sections */}
            <div className="lg:col-span-2 space-y-4">

              {/* Personal Info */}
              <SectionCard title="Personal Information" icon={<User className="w-4 h-4" />} canEdit={canEdit}
                editing={editing === "personal"} onEdit={() => startEdit("personal")}
                onSave={save} onCancel={cancel} saving={update.isPending}>
                {editing === "personal" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <SelectField label="Gender"         value={get("gender")}        options={GENDERS}     onChange={(v) => set("gender", v)} />
                    <TextField   label="Date of Birth"  value={get("dateOfBirth")?.split("T")[0] ?? ""} onChange={(v) => set("dateOfBirth", v)} type="date" />
                    <SelectField label="Blood Group"    value={get("bloodGroup") ?? (profile as any)?.bloodGroup ?? ""} options={BLOOD_TYPES} onChange={(v) => set("bloodGroup", v)} />
                    <SelectField label="Marital Status" value={get("maritalStatus")} options={MARITAL}     onChange={(v) => set("maritalStatus", v)} />
                    <TextField   label="Nationality"    value={get("nationality")}   onChange={(v) => set("nationality", v)} placeholder="e.g. Indian" />
                    <TextField   label="Bio"            value={get("bio")}           onChange={(v) => set("bio", v)} placeholder="A short bio…" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <ViewField label="Gender"         value={(profile as any)?.gender} />
                    <ViewField label="Date of Birth"  value={(profile as any)?.dateOfBirth ? formatDate((profile as any).dateOfBirth) : null} />
                    <ViewField label="Blood Group"    value={(profile as any)?.bloodGroup} />
                    <ViewField label="Marital Status" value={(profile as any)?.maritalStatus} />
                    <ViewField label="Nationality"    value={(profile as any)?.nationality} />
                    <ViewField label="Bio"            value={(profile as any)?.bio} />
                  </div>
                )}
              </SectionCard>

              {/* Work Info (admin only edit) */}
              <SectionCard title="Work Information" icon={<Briefcase className="w-4 h-4" />} canEdit={isAdmin}
                editing={editing === "work"} onEdit={() => startEdit("work")}
                onSave={save} onCancel={cancel} saving={update.isPending}>
                {editing === "work" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <SelectField label="Employee Type"     value={get("employeeType")}     options={EMP_TYPES}  onChange={(v) => set("employeeType", v)} />
                    <TextField   label="Joining Date"      value={get("joiningDate")?.split("T")[0] ?? ""}    onChange={(v) => set("joiningDate", v)} type="date" />
                    <TextField   label="Reporting Manager" value={get("reportingManager")} onChange={(v) => set("reportingManager", v)} placeholder="Manager name" />
                    <TextField   label="Work Location"     value={get("workLocation")}     onChange={(v) => set("workLocation", v)} placeholder="e.g. Hubli HQ" />
                    <SelectField label="Shift Timing"      value={get("shiftTiming")}      options={SHIFTS}     onChange={(v) => set("shiftTiming", v)} />
                    <SelectField label="Employment Status" value={get("employmentStatus")} options={EMP_STATUS} onChange={(v) => set("employmentStatus", v)} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <ViewField label="Department"         value={employee.department} />
                    <ViewField label="Designation"        value={employee.position} />
                    <ViewField label="Employee Type"      value={(profile as any)?.employeeType} />
                    <ViewField label="Joining Date"       value={(profile as any)?.joiningDate ? formatDate((profile as any).joiningDate) : null} />
                    <ViewField label="Reporting Manager"  value={(profile as any)?.reportingManager} />
                    <ViewField label="Work Location"      value={(profile as any)?.workLocation} />
                    <ViewField label="Shift Timing"       value={(profile as any)?.shiftTiming} />
                    <ViewField label="Employment Status"  value={(profile as any)?.employmentStatus} />
                  </div>
                )}
              </SectionCard>

              {/* Address */}
              <SectionCard title="Address" icon={<MapPin className="w-4 h-4" />} canEdit={canEdit}
                editing={editing === "address"} onEdit={() => startEdit("address")}
                onSave={save} onCancel={cancel} saving={update.isPending}>
                {editing === "address" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="col-span-full"><TextField label="Current Address"   value={get("addressLine1")}  onChange={(v) => set("addressLine1", v)} placeholder="Street, area…" /></div>
                    <div className="col-span-full"><TextField label="Permanent Address" value={get("addressLine2")}  onChange={(v) => set("addressLine2", v)} placeholder="Street, area…" /></div>
                    <TextField label="City"    value={get("city")}       onChange={(v) => set("city", v)} />
                    <TextField label="State"   value={get("state")}      onChange={(v) => set("state", v)} />
                    <TextField label="Country" value={get("country")}    onChange={(v) => set("country", v)} />
                    <TextField label="ZIP"     value={get("postalCode")} onChange={(v) => set("postalCode", v)} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="col-span-full"><ViewField label="Current Address"   value={(profile as any)?.addressLine1} /></div>
                    <div className="col-span-full"><ViewField label="Permanent Address" value={(profile as any)?.addressLine2} /></div>
                    <ViewField label="City"    value={(profile as any)?.city} />
                    <ViewField label="State"   value={(profile as any)?.state} />
                    <ViewField label="Country" value={(profile as any)?.country} />
                    <ViewField label="ZIP"     value={(profile as any)?.postalCode} />
                  </div>
                )}
              </SectionCard>

              {/* Emergency Contact */}
              <SectionCard title="Emergency Contact" icon={<PhoneCall className="w-4 h-4" />} canEdit={canEdit}
                editing={editing === "emergency"} onEdit={() => startEdit("emergency")}
                onSave={save} onCancel={cancel} saving={update.isPending}>
                {editing === "emergency" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <TextField label="Contact Name"   value={get("emergencyName")}     onChange={(v) => set("emergencyName", v)} />
                    <TextField label="Relationship"   value={get("emergencyRelation")} onChange={(v) => set("emergencyRelation", v)} />
                    <TextField label="Phone"          value={get("emergencyPhone")}    onChange={(v) => set("emergencyPhone", v)} type="tel" />
                    <TextField label="Email"          value={get("emergencyEmail")}    onChange={(v) => set("emergencyEmail", v)} type="email" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <ViewField label="Contact Name"  value={(profile as any)?.emergencyName} />
                    <ViewField label="Relationship"  value={(profile as any)?.emergencyRelation} />
                    <ViewField label="Phone"         value={(profile as any)?.emergencyPhone} />
                    <ViewField label="Email"         value={(profile as any)?.emergencyEmail} />
                  </div>
                )}
              </SectionCard>

              {/* Education */}
              <SectionCard title="Education & Skills" icon={<GraduationCap className="w-4 h-4" />} canEdit={canEdit}
                editing={editing === "education"} onEdit={() => startEdit("education")}
                onSave={save} onCancel={cancel} saving={update.isPending}>
                {editing === "education" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <TextField label="Degree"          value={get("highestEducation")} onChange={(v) => set("highestEducation", v)} />
                      <TextField label="College / Uni"   value={get("institution")}      onChange={(v) => set("institution", v)} />
                      <TextField label="Field of Study"  value={get("fieldOfStudy")}     onChange={(v) => set("fieldOfStudy", v)} />
                      <TextField label="Graduation Year" value={String(get("graduationYear") || "")} onChange={(v) => set("graduationYear", v ? Number(v) : null)} type="number" />
                    </div>
                    <div>
                      <label htmlFor="skills-input" className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Skills (comma-separated)</label>
                      <input id="skills-input" aria-label="Skills" placeholder="React, Node.js, Python…"
                        className="w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={(draft.skills as string[] ?? (profile as any)?.skills ?? []).join(", ")}
                        onChange={(e) => set("skills", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
                    </div>
                    <div>
                      <label htmlFor="certs-input" className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Certifications (comma-separated)</label>
                      <input id="certs-input" aria-label="Certifications" placeholder="AWS, PMP, CPA…"
                        className="w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={(draft.certifications as string[] ?? (profile as any)?.certifications ?? []).join(", ")}
                        onChange={(e) => set("certifications", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <ViewField label="Degree"          value={(profile as any)?.highestEducation} />
                      <ViewField label="College / Uni"   value={(profile as any)?.institution} />
                      <ViewField label="Field of Study"  value={(profile as any)?.fieldOfStudy} />
                      <ViewField label="Graduation Year" value={(profile as any)?.graduationYear} />
                    </div>
                    {((profile as any)?.skills?.length > 0) && (
                      <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(profile as any).skills.map((s: string) => <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{s}</span>)}
                        </div></div>
                    )}
                    {((profile as any)?.certifications?.length > 0) && (
                      <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Certifications</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(profile as any).certifications.map((c: string) => <span key={c} className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">{c}</span>)}
                        </div></div>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* Professional */}
              <SectionCard title="Professional Details" icon={<Globe className="w-4 h-4" />} canEdit={canEdit}
                editing={editing === "professional"} onEdit={() => startEdit("professional")}
                onSave={save} onCancel={cancel} saving={update.isPending}>
                {editing === "professional" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <TextField label="Experience (yrs)" value={get("experience")}      onChange={(v) => set("experience", v)} />
                    <TextField label="Previous Company"  value={get("previousCompany") ?? (profile as any)?.previousCompany ?? ""} onChange={(v) => set("previousCompany", v)} />
                    <TextField label="LinkedIn"          value={get("linkedinUrl") ?? (profile as any)?.linkedinUrl ?? ""}      onChange={(v) => set("linkedinUrl", v)} type="url" />
                    <TextField label="GitHub"            value={get("githubUrl") ?? (profile as any)?.githubUrl ?? ""}          onChange={(v) => set("githubUrl", v)} type="url" />
                    <TextField label="Portfolio"         value={get("portfolioUrl") ?? (profile as any)?.portfolioUrl ?? ""}    onChange={(v) => set("portfolioUrl", v)} type="url" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <ViewField label="Experience" value={(profile as any)?.experience ? `${(profile as any).experience} yrs` : null} />
                    <ViewField label="Prev. Company" value={(profile as any)?.previousCompany} />
                    {(profile as any)?.linkedinUrl && <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">LinkedIn</p><a href={(profile as any).linkedinUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View</a></div>}
                    {(profile as any)?.githubUrl && <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">GitHub</p><a href={(profile as any).githubUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View</a></div>}
                    {(profile as any)?.portfolioUrl && <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Portfolio</p><a href={(profile as any).portfolioUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />View</a></div>}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ── DOCUMENTS TAB ─────────────────────────────────────── */}
        <TabsContent value="documents">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mt-4">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><FileText className="w-4 h-4 text-indigo-600" /></div>
              <h3 className="text-sm font-semibold text-slate-800">Documents</h3>
            </div>

            {/* Upload area */}
            {canEdit && (
              <div className="space-y-3 mb-6">
                <div className="flex flex-wrap gap-2">
                  {DOC_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setDocType(t)}
                      className={cn("text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                        docType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300")}>
                      {t.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Document name (e.g. Aadhaar Card)" value={docName} onChange={(e) => setDocName(e.target.value)} />
                  <label className={cn("flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all",
                    "bg-indigo-600 text-white hover:bg-indigo-700", !docName.trim() && "opacity-50 pointer-events-none")}>
                    <Upload className="w-4 h-4" /> Upload
                    <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f || !docName.trim()) return;
                        uploadDoc.mutate({ file: f, documentName: docName, documentType: docType });
                        setDocName(""); e.target.value = "";
                      }} />
                  </label>
                </div>
              </div>
            )}

            {/* Rejection modal */}
            {rejectTarget && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800">Reject Document</h3>
                  <input className="w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Reason for rejection…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                      className="flex-1 h-9 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={async () => {
                      await verifyDoc.mutateAsync({ docId: rejectTarget, status: "rejected", rejectionReason: rejectReason });
                      setRejectTarget(null); setRejectReason("");
                    }} className="flex-1 h-9 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Reject</button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents list */}
            {docs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3"><FileText className="w-6 h-6 text-slate-300" /></div>
                <p className="text-sm font-medium text-slate-500">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(docs as any[]).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all group">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{doc.documentName}</p>
                      <p className="text-xs text-slate-400">{doc.documentType} · {formatDate(doc.uploadedAt)}</p>
                      {doc.verificationStatus === "rejected" && doc.rejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5">Rejected: {doc.rejectionReason}</p>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                      doc.verificationStatus === "verified" ? "bg-emerald-50 text-emerald-700" :
                      doc.verificationStatus === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
                      {doc.verificationStatus}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={doc.documentUrl} download={doc.documentName} title="Download document" aria-label={`Download ${doc.documentName}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {isAdmin && doc.verificationStatus !== "verified" && (
                        <button type="button" onClick={() => verifyDoc.mutate({ docId: doc.id, status: "verified" })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Verify">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && doc.verificationStatus !== "rejected" && (
                        <button type="button" onClick={() => setRejectTarget(doc.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50" title="Reject">
                          <ShieldOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(isAdmin || isSelf) && (
                        <button type="button" title="Delete document" onClick={() => deleteDoc.mutate(doc.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── ATTENDANCE TAB ────────────────────────────────────── */}
        <TabsContent value="attendance">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-4 overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-900">Attendance History</h3></div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  {["Date","Check In","Check Out","Hours","Status"].map(h => <TableHead key={h} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance?.map((r: any) => (
                  <TableRow key={r.id} className="border-slate-100">
                    <TableCell className="font-medium text-sm">{formatDate(r.date)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{fmtTime(r.checkIn)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{fmtTime(r.checkOut)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{r.hours != null ? `${r.hours}h` : "–"}</TableCell>
                    <TableCell><span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", getStatusColor(r.status))}>{r.status}</span></TableCell>
                  </TableRow>
                ))}
                {(!attendance || attendance.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 text-sm">No records</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── LEAVE HISTORY TAB ─────────────────────────────────── */}
        <TabsContent value="leaves">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-4 overflow-hidden">
            <div className="p-5 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-900">Leave History</h3></div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  {["Duration","Category","Reason","Applied","Status"].map(h => <TableHead key={h} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeLeaves.map((l: any) => (
                  <TableRow key={l.id} className="border-slate-100">
                    <TableCell className="text-sm">
                      <span className="text-slate-600">{formatDate(l.startDate)}</span>
                      {l.startDate !== l.endDate && <span className="text-slate-400"> → {formatDate(l.endDate)}</span>}
                      <span className="ml-1 text-xs text-slate-400">({l.days}d)</span>
                    </TableCell>
                    <TableCell><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 capitalize">{l.category ?? "casual"}</span></TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-xs truncate">{l.reason}</TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDate(l.createdAt)}</TableCell>
                    <TableCell><span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full capitalize", getStatusColor(l.status))}>{l.status}</span></TableCell>
                  </TableRow>
                ))}
                {employeeLeaves.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 text-sm">No leave history</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Salary Structure Modal */}
      {isAdmin && employee && (
        <SalaryStructureModal
          open={salaryModalOpen}
          onClose={() => setSalaryModalOpen(false)}
          employeeId={id}
          employeeName={employee.fullName}
        />
      )}
    </div>
  );
}
