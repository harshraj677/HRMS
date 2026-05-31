"use client";

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, XCircle, Loader2, Wifi, MapPin } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useGeofences, usePolicies } from "@/hooks/useAttendance";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MODE_CONFIG: Record<string, { label: string; icon: any; cls: string }> = {
  soft:              { label: "Soft (warn)",    icon: ShieldAlert,  cls: "text-amber-600 bg-amber-50 border-amber-200" },
  hard:              { label: "Hard (block)",   icon: ShieldX,      cls: "text-red-600 bg-red-50 border-red-200" },
  "allow-if-matched": { label: "Flag if outside", icon: ShieldCheck, cls: "text-indigo-600 bg-indigo-50 border-indigo-200" },
};

export default function PoliciesPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <PoliciesContent />
    </RoleGuard>
  );
}

function PoliciesContent() {
  const { data: policies, isLoading } = usePolicies();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/policies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["policies"] }); toast.success("Policy deactivated."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Policies</h2>
          <p className="text-sm text-slate-500 mt-0.5">Control how attendance is enforced for your team</p>
        </div>
        <button type="button" onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 h-10 px-4 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Policy
        </button>
      </div>

      {showForm && (
        <PolicyForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["policies"] }); setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : policies?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No policies yet</p>
          <p className="text-xs text-slate-400 mt-1">Create a policy and mark it as default to start enforcing geofence rules.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies?.map((p: any) => {
            const modeConf = MODE_CONFIG[p.enforcementMode] ?? MODE_CONFIG.soft;
            const ModeIcon = modeConf.icon;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                      {p.isDefault && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">Default</span>
                      )}
                      {!p.active && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">Inactive</span>
                      )}
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1", modeConf.cls)}>
                        <ModeIcon className="w-3 h-3" />{modeConf.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {p.allowedGeofenceIds?.length ?? 0} geofence(s)
                      </span>
                      {p.remoteWorkAllowed && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <Wifi className="w-3 h-3" /> Remote allowed
                        </span>
                      )}
                      {p.manualOverrideAllowed && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          ↩ Override allowed
                        </span>
                      )}
                      {p.photoRetentionDays && (
                        <span className="text-xs text-slate-400">Photos: {p.photoRetentionDays}d retention</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => { setEditing(p); setShowForm(true); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteMut.mutate(p.id)} disabled={deleteMut.isPending}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PolicyForm({ initial, onClose, onSaved }: { initial: any | null; onClose: () => void; onSaved: () => void; }) {
  const isEdit = !!initial;
  const { data: geofences } = useGeofences();

  const [name, setName] = useState(initial?.name ?? "");
  const [mode, setMode] = useState<"soft" | "hard" | "allow-if-matched">(initial?.enforcementMode ?? "soft");
  const [gfIds, setGfIds] = useState<string[]>(initial?.allowedGeofenceIds ?? []);
  const [distBuffer, setDistBuffer] = useState<string>(initial?.allowedDistanceMeters?.toString() ?? "");
  const [remote, setRemote] = useState<boolean>(initial?.remoteWorkAllowed ?? false);
  const [override, setOverride] = useState<boolean>(initial?.manualOverrideAllowed ?? true);
  const [faceReq, setFaceReq] = useState<boolean>(initial?.faceVerifyRequired ?? false);
  const [photoDays, setPhotoDays] = useState<string>(initial?.photoRetentionDays?.toString() ?? "");
  const [locDays, setLocDays] = useState<string>(initial?.locationRetentionDays?.toString() ?? "");
  const [isDefault, setIsDefault] = useState<boolean>(initial?.isDefault ?? false);
  const [saving, setSaving] = useState(false);

  const toggleGf = (id: string) => {
    setGfIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/policies/${initial.id}` : "/api/policies";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          enforcementMode: mode,
          allowedGeofenceIds: gfIds,
          allowedDistanceMeters: distBuffer ? parseInt(distBuffer) : null,
          remoteWorkAllowed: remote,
          manualOverrideAllowed: override,
          faceVerifyRequired: faceReq,
          photoRetentionDays: photoDays ? parseInt(photoDays) : null,
          locationRetentionDays: locDays ? parseInt(locDays) : null,
          isDefault,
          active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Save failed"); return; }
      toast.success(isEdit ? "Policy updated." : "Policy created.");
      onSaved();
    } catch { toast.error("Network error."); } finally { setSaving(false); }
  };

  const inp = "h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full";
  const toggle = (val: boolean, set: (v: boolean) => void, label: string) => (
    <button type="button" onClick={() => set(!val)}
      className={cn("flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-medium transition-all",
        val ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
      <span className={cn("w-3 h-3 rounded-full shrink-0", val ? "bg-indigo-500" : "bg-slate-300")} />
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{isEdit ? "Edit Policy" : "New Policy"}</h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4 h-4" /></button>
      </div>

      {/* Name */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Policy Name *</label>
        <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Office Policy" />
      </div>

      {/* Enforcement mode */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Enforcement Mode</label>
        <div className="flex flex-wrap gap-2">
          {(["soft", "hard", "allow-if-matched"] as const).map(m => {
            const c = MODE_CONFIG[m];
            const MIcon = c.icon;
            return (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                  mode === m ? c.cls : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                <MIcon className="w-3.5 h-3.5" />{c.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {mode === "soft" && "Attendance is recorded but a warning is shown and the record is flagged."}
          {mode === "hard" && "Attendance is blocked unless override is requested (if allowed)."}
          {mode === "allow-if-matched" && "Attendance is recorded but flagged for review if outside any geofence."}
        </p>
      </div>

      {/* Geofences */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Allowed Geofences</label>
        {!geofences?.length ? (
          <p className="text-xs text-slate-400">No active geofences. Create one on the Geofences page first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {geofences.filter((g: any) => g.active).map((g: any) => (
              <button key={g.id} type="button" onClick={() => toggleGf(g.id)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                  gfIds.includes(g.id) ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                {g.type === "circle" ? "◉" : "⬡"} {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Distance buffer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Distance buffer (m)</label>
          <input type="number" min="0" className={inp} value={distBuffer} onChange={e => setDistBuffer(e.target.value)} placeholder="e.g. 50 (optional)" />
          <p className="text-xs text-slate-400 mt-0.5">Allowed extra metres beyond geofence edge</p>
        </div>
      </div>

      {/* Flags */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Options</label>
        <div className="flex flex-wrap gap-2">
          {toggle(remote, setRemote, "Remote work allowed")}
          {toggle(override, setOverride, "Manual override allowed")}
          {toggle(faceReq, setFaceReq, "Face verify required")}
          {toggle(isDefault, setIsDefault, "Set as default policy")}
        </div>
      </div>

      {/* Retention */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Photo retention (days)</label>
          <input type="number" min="1" className={cn(inp, "bg-white")} value={photoDays} onChange={e => setPhotoDays(e.target.value)} placeholder="e.g. 90" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Location retention (days)</label>
          <input type="number" min="1" className={cn(inp, "bg-white")} value={locDays} onChange={e => setLocDays(e.target.value)} placeholder="e.g. 365" />
        </div>
        <p className="col-span-2 text-xs text-slate-400">Retention values are displayed in the check-in consent notice for privacy compliance.</p>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 h-9 px-4 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-3.5 h-3.5" /> {isEdit ? "Update" : "Create"} Policy</>}
        </button>
        <button type="button" onClick={onClose} className="h-9 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
      </div>
    </div>
  );
}
