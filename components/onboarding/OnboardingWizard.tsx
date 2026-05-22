"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MapPin, PhoneCall, GraduationCap, Globe,
  FileText, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, Sparkles, Upload, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateProfile, useUploadDocument } from "@/hooks/useProfile";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardData {
  // Personal
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  nationality?: string;
  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  // Emergency
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  emergencyEmail?: string;
  // Education
  highestEducation?: string;
  institution?: string;
  fieldOfStudy?: string;
  graduationYear?: string;
  skills?: string;
  certifications?: string;
  // Professional
  experience?: string;
  previousCompany?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

const STORAGE_KEY = (id: string) => `anvesync_onboarding_${id}`;

// ─── Step config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: "welcome",      label: "Welcome",    icon: Sparkles },
  { id: "personal",     label: "Personal",   icon: User },
  { id: "address",      label: "Address",    icon: MapPin },
  { id: "emergency",    label: "Emergency",  icon: PhoneCall },
  { id: "education",    label: "Education",  icon: GraduationCap },
  { id: "professional", label: "Links",      icon: Globe },
  { id: "documents",    label: "Documents",  icon: FileText },
  { id: "complete",     label: "Complete",   icon: CheckCircle2 },
];

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-10 px-3.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:bg-white transition-all";
const selectCls = inputCls;

function TF({ label, field, data, set, type = "text", placeholder = "" }: {
  label: string; field: keyof WizardData; data: WizardData;
  set: (k: keyof WizardData, v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input type={type} aria-label={label} placeholder={placeholder}
        className={inputCls} value={data[field] ?? ""}
        onChange={(e) => set(field, e.target.value)} />
    </Field>
  );
}

function SF({ label, field, data, set, options }: {
  label: string; field: keyof WizardData; data: WizardData;
  set: (k: keyof WizardData, v: string) => void; options: string[];
}) {
  return (
    <Field label={label}>
      <select aria-label={label} className={selectCls} value={data[field] ?? ""}
        onChange={(e) => set(field, e.target.value)}>
        <option value="">— Select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  employeeId: string;
  employeeName: string;
  onComplete: () => void;
}

export function OnboardingWizard({ employeeId, employeeName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY(employeeId)) ?? "{}"); } catch { return {}; }
  });
  const [docFiles, setDocFiles] = useState<{ file: File; type: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const update = useUpdateProfile(employeeId);
  const uploadDoc = useUploadDocument(employeeId);

  // Persist draft to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY(employeeId), JSON.stringify(data));
    }
  }, [data, employeeId]);

  const set = useCallback((k: keyof WizardData, v: string) => {
    setData((d) => ({ ...d, [k]: v }));
  }, []);

  const firstName = employeeName.split(" ")[0];

  async function handleFinish() {
    setSaving(true);
    try {
      // Save profile data
      const profilePayload: Record<string, unknown> = { ...data, onboardingCompleted: true };
      if (data.graduationYear) profilePayload.graduationYear = Number(data.graduationYear);
      if (data.skills) profilePayload.skills = data.skills.split(",").map((s) => s.trim()).filter(Boolean);
      if (data.certifications) profilePayload.certifications = data.certifications.split(",").map((s) => s.trim()).filter(Boolean);
      delete profilePayload.experience_raw;

      await update.mutateAsync(profilePayload);

      // Upload any queued documents
      for (const doc of docFiles) {
        await uploadDoc.mutateAsync({ file: doc.file, documentName: doc.name, documentType: doc.type });
      }

      localStorage.removeItem(STORAGE_KEY(employeeId));
      toast.success("Onboarding complete! Welcome aboard 🎉");
      onComplete();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      // Auto-save at each step
      if (step > 0 && step < STEPS.length - 2) {
        update.mutate(data as Record<string, unknown>);
      }
      setStep((s) => s + 1);
    } else {
      await handleFinish();
    }
  }

  const isLast = step === STEPS.length - 1;
  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-violet-950/95 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "90vh" }}>

        {/* Top progress bar */}
        <div className="h-1 bg-slate-100">
          <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
            animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>

        {/* Step pills */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 transition-all",
                  i === step ? "bg-indigo-600 text-white" :
                  i < step ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                )}>
                  {i < step ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>

              {/* Step 0: Welcome */}
              {step === 0 && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-9 h-9 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Welcome, {firstName}! 👋</h2>
                  <p className="text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                    We&apos;re excited to have you on the Anvesana team. Let&apos;s take a few minutes to complete your profile so everything is ready for you.
                  </p>
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { icon: User, label: "Personal Info" },
                      { icon: MapPin, label: "Address" },
                      { icon: GraduationCap, label: "Education" },
                      { icon: FileText, label: "Documents" },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-5">Takes about 3–5 minutes · Your progress is saved automatically</p>
                </div>
              )}

              {/* Step 1: Personal Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Basic details about you</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SF label="Gender" field="gender" data={data} set={set} options={["Male","Female","Non-binary","Prefer not to say"]} />
                    <TF label="Date of Birth" field="dateOfBirth" data={data} set={set} type="date" />
                    <SF label="Blood Group" field="bloodGroup" data={data} set={set} options={["A+","A-","B+","B-","AB+","AB-","O+","O-"]} />
                    <SF label="Marital Status" field="maritalStatus" data={data} set={set} options={["Single","Married","Divorced","Widowed"]} />
                    <TF label="Nationality" field="nationality" data={data} set={set} placeholder="e.g. Indian" />
                  </div>
                </div>
              )}

              {/* Step 2: Address */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Address</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Where you currently live</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <TF label="Current Address" field="addressLine1" data={data} set={set} placeholder="Street, locality…" />
                    </div>
                    <div className="col-span-2">
                      <TF label="Permanent Address (if different)" field="addressLine2" data={data} set={set} placeholder="Street, locality…" />
                    </div>
                    <TF label="City"    field="city"       data={data} set={set} placeholder="e.g. Hubli" />
                    <TF label="State"   field="state"      data={data} set={set} placeholder="e.g. Karnataka" />
                    <TF label="Country" field="country"    data={data} set={set} placeholder="e.g. India" />
                    <TF label="ZIP / PIN" field="postalCode" data={data} set={set} placeholder="580001" />
                  </div>
                </div>
              )}

              {/* Step 3: Emergency Contact */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Emergency Contact</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Who should we contact in an emergency?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TF label="Contact Name"   field="emergencyName"     data={data} set={set} placeholder="e.g. Ramesh Kumar" />
                    <TF label="Relationship"   field="emergencyRelation" data={data} set={set} placeholder="e.g. Father" />
                    <TF label="Phone Number"   field="emergencyPhone"    data={data} set={set} type="tel" placeholder="+91 99999 00000" />
                    <TF label="Email (optional)" field="emergencyEmail"  data={data} set={set} type="email" placeholder="email@example.com" />
                  </div>
                </div>
              )}

              {/* Step 4: Education & Skills */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Education & Skills</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Your academic background and capabilities</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TF label="Highest Degree"     field="highestEducation" data={data} set={set} placeholder="B.Tech / MBA…" />
                    <TF label="College / University" field="institution"    data={data} set={set} placeholder="University name" />
                    <TF label="Field of Study"      field="fieldOfStudy"    data={data} set={set} placeholder="Computer Science…" />
                    <TF label="Graduation Year"     field="graduationYear"  data={data} set={set} type="number" placeholder="2022" />
                    <div className="col-span-2">
                      <TF label="Skills (comma-separated)" field="skills" data={data} set={set} placeholder="React, Node.js, Python, AWS…" />
                    </div>
                    <div className="col-span-2">
                      <TF label="Certifications (comma-separated)" field="certifications" data={data} set={set} placeholder="AWS Cloud Practitioner, PMP…" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Professional Links */}
              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Professional Details</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Your professional background and online presence</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TF label="Years of Experience"  field="experience"      data={data} set={set} type="number" placeholder="3" />
                    <TF label="Previous Company"     field="previousCompany" data={data} set={set} placeholder="Company name" />
                    <div className="col-span-2">
                      <TF label="LinkedIn URL" field="linkedinUrl" data={data} set={set} type="url" placeholder="https://linkedin.com/in/yourname" />
                    </div>
                    <TF label="GitHub URL"    field="githubUrl"    data={data} set={set} type="url" placeholder="https://github.com/yourname" />
                    <TF label="Portfolio URL" field="portfolioUrl" data={data} set={set} type="url" placeholder="https://yoursite.com" />
                  </div>
                </div>
              )}

              {/* Step 6: Documents */}
              {step === 6 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Upload Documents</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Add important documents — you can always upload more later</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {["resume","aadhaar","pan","certificate","offer_letter"].map((type) => {
                      const existing = docFiles.find((d) => d.type === type);
                      return (
                        <label key={type} className={cn(
                          "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center",
                          existing ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/50"
                        )}>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label={`Upload ${type}`} className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setDocFiles((prev) => [
                                ...prev.filter((d) => d.type !== type),
                                { file: f, type, name: f.name },
                              ]);
                              e.target.value = "";
                            }} />
                          {existing ? (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-700">{type.replace("_", " ")}</span>
                              <span className="text-[10px] text-emerald-600 truncate w-full">{existing.name}</span>
                              <button type="button" title="Remove file"
                                onClick={(e) => { e.preventDefault(); setDocFiles((p) => p.filter((d) => d.type !== type)); }}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200">
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-slate-300" />
                              <span className="text-xs font-medium text-slate-500 capitalize">{type.replace("_", " ")}</span>
                            </>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400">PDF, JPEG, PNG · Max 10 MB each · Documents are reviewed by admin</p>
                </div>
              )}

              {/* Step 7: Complete */}
              {step === 7 && (
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-900">You&apos;re all set, {firstName}!</h2>
                  <p className="text-slate-500 mt-2 max-w-md mx-auto">
                    Your profile is being set up. Admins will review your documents shortly.
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-2xl px-5 py-3 mx-auto w-fit">
                    <Sparkles className="w-4 h-4" />
                    Welcome to the Anvesana team!
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className={cn(
              "flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border transition-all",
              "border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            )}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-indigo-500" : i < step ? "w-1.5 bg-emerald-400" : "w-1.5 bg-slate-200")} />
            ))}
          </div>

          <button type="button" onClick={handleNext} disabled={saving || update.isPending}
            className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-sm shadow-indigo-500/25">
            {saving || update.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{isLast ? "Saving…" : "Saving…"}</>
            ) : isLast ? (
              <><CheckCircle2 className="w-4 h-4" /> Complete Setup</>
            ) : step === 0 ? (
              <>Let&apos;s start <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
