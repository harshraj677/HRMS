"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText, ExternalLink, CheckCircle2, XCircle,
  Loader2, Landmark, MapPin, PhoneCall, GraduationCap, User as UserIcon,
} from "lucide-react";
import { cn, getInitials, getDepartmentColor, getRoleBadgeColor, formatDate } from "@/lib/utils";
import { getApprovalStatusBadge } from "@/lib/onboarding";
import { useApproveProfile, useRejectProfile, type OnboardingEmployee } from "@/hooks/useOnboarding";

interface Props {
  employee: OnboardingEmployee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    </div>
  );
}

export default function ProfileReviewPanel({ employee, open, onOpenChange }: Props) {
  const approve = useApproveProfile();
  const reject = useRejectProfile();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setRejecting(false);
      setReason("");
    }
  }, [open]);

  if (!employee) return null;

  const profile = employee.profile;
  const badge = getApprovalStatusBadge(employee.approvalStatus);
  const canDecide = employee.approvalStatus === "PROFILE_SUBMITTED";

  async function handleApprove() {
    await approve.mutateAsync(employee!.id);
    onOpenChange(false);
  }

  async function handleReject() {
    if (!reason.trim()) return;
    await reject.mutateAsync({ id: employee!.id, reason: reason.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{employee.fullName}</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-slate-100">
            {profile?.avatar ? (
              <AvatarImage src={profile.avatar} alt={employee.fullName} />
            ) : (
              <AvatarFallback className={cn("text-base font-bold", getDepartmentColor(employee.department ?? ""))}>
                {getInitials(employee.fullName)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-slate-900 truncate">{employee.fullName}</p>
            <p className="text-sm text-slate-400 truncate">{employee.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {employee.department && (
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", getDepartmentColor(employee.department))}>
                  {employee.department}
                </span>
              )}
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", getRoleBadgeColor(employee.role))}>
                {employee.role}
              </span>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", badge.className)}>
                {badge.label}
              </span>
            </div>
            {employee.approvalStatus === "REJECTED" && employee.rejectionReason && (
              <p className="text-xs text-red-500 mt-1.5">Last feedback: {employee.rejectionReason}</p>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Contact */}
          <div className="space-y-2">
            <SectionTitle icon={<UserIcon className="w-3.5 h-3.5" />} title="Contact" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ViewField label="Email" value={employee.email} />
              <ViewField label="Mobile" value={employee.phone} />
              <ViewField label="Alternate Phone" value={profile?.alternatePhone} />
              <ViewField label="Gender" value={profile?.gender} />
              <ViewField label="Date of Birth" value={profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : null} />
              <ViewField label="Marital Status" value={profile?.maritalStatus} />
              <ViewField label="Nationality" value={profile?.nationality} />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <SectionTitle icon={<MapPin className="w-3.5 h-3.5" />} title="Address" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="col-span-full"><ViewField label="Current Address" value={profile?.addressLine1} /></div>
              <div className="col-span-full"><ViewField label="Permanent Address" value={profile?.addressLine2} /></div>
              <ViewField label="City" value={profile?.city} />
              <ViewField label="State" value={profile?.state} />
              <ViewField label="Country" value={profile?.country} />
              <ViewField label="ZIP / PIN" value={profile?.postalCode} />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <SectionTitle icon={<PhoneCall className="w-3.5 h-3.5" />} title="Emergency Contact" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ViewField label="Name" value={profile?.emergencyName} />
              <ViewField label="Relationship" value={profile?.emergencyRelation} />
              <ViewField label="Phone" value={profile?.emergencyPhone} />
              <ViewField label="Email" value={profile?.emergencyEmail} />
            </div>
          </div>

          {/* Education & Professional */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <SectionTitle icon={<GraduationCap className="w-3.5 h-3.5" />} title="Education & Professional" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ViewField label="Highest Degree" value={profile?.highestEducation} />
              <ViewField label="Institution" value={profile?.institution} />
              <ViewField label="Field of Study" value={profile?.fieldOfStudy} />
              <ViewField label="Graduation Year" value={profile?.graduationYear} />
              <ViewField label="Experience (yrs)" value={profile?.experience} />
            </div>
            {profile?.skills && profile.skills.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s) => <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{s}</span>)}
                </div>
              </div>
            )}
            {profile?.certifications && profile.certifications.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Certifications</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.certifications.map((c) => <span key={c} className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">{c}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Bank Details */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <SectionTitle icon={<Landmark className="w-3.5 h-3.5" />} title="Bank Details" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ViewField label="Account Holder" value={profile?.bankAccountHolder} />
              <ViewField label="Account Number" value={profile?.bankAccountNumber} />
              <ViewField label="IFSC Code" value={profile?.bankIFSC} />
              <ViewField label="Bank Name" value={profile?.bankName} />
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <SectionTitle icon={<FileText className="w-3.5 h-3.5" />} title="Documents" />
            {employee.documents.length === 0 ? (
              <p className="text-xs text-slate-400">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {employee.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{doc.documentName}</p>
                      <p className="text-xs text-slate-400 capitalize">{doc.documentType.replace("_", " ")} · {formatDate(doc.uploadedAt)}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize",
                      doc.verificationStatus === "verified" ? "bg-emerald-50 text-emerald-700" :
                      doc.verificationStatus === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
                      {doc.verificationStatus}
                    </span>
                    <a href={doc.documentUrl} download={doc.documentName} title="Download document"
                      aria-label={`Download ${doc.documentName}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decision */}
          {canDecide && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              {!rejecting ? (
                <div className="flex gap-2">
                  <button type="button" onClick={handleApprove} disabled={approve.isPending}
                    className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {approve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve
                  </button>
                  <button type="button" onClick={() => setRejecting(true)}
                    className="flex-1 h-10 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> Request Changes
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">What needs to change?</p>
                  <textarea rows={3} placeholder="Describe what the employee should fix…" value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleReject} disabled={!reason.trim() || reject.isPending}
                      className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {reject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Send Back
                    </button>
                    <button type="button" onClick={() => { setRejecting(false); setReason(""); }}
                      className="flex-1 h-10 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
