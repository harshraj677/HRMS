"use client";

import { useRouter } from "next/navigation";
import { Clock, LogOut, CheckCircle2 } from "lucide-react";

interface Props {
  employeeName: string;
}

const SUBMITTED_ITEMS = [
  "Personal & contact details",
  "Address & emergency contact",
  "Education & professional info",
  "Bank details",
  "Identity documents",
];

export function PendingApprovalScreen({ employeeName }: Props) {
  const router = useRouter();
  const firstName = employeeName.split(" ")[0] || "there";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-violet-950/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/30">
          <Clock className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Thanks, {firstName}!</h2>
        <p className="text-slate-500 mt-2 leading-relaxed">
          Your profile has been submitted and is awaiting admin approval. We&apos;ll notify you as soon as it&apos;s reviewed.
        </p>

        <div className="mt-6 text-left bg-slate-50 rounded-2xl p-4 space-y-2">
          {SUBMITTED_ITEMS.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <button type="button" onClick={handleLogout}
          className="mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
