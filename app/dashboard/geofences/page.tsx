"use client";

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Circle, Hexagon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useGeofences } from "@/hooks/useAttendance";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface GeoPoint { lat: number; lng: number; }
interface CircleGeom { type: "circle"; lat: number; lng: number; radiusMeters: number; }
interface PolygonGeom { type: "polygon"; coordinates: GeoPoint[]; }
type GeomForm = CircleGeom | PolygonGeom;

const EMPTY_CIRCLE: CircleGeom = { type: "circle", lat: 0, lng: 0, radiusMeters: 200 };
const EMPTY_POLYGON: PolygonGeom = { type: "polygon", coordinates: [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }, { lat: 0, lng: 0 }] };

export default function GeofencesPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <GeofencesContent />
    </RoleGuard>
  );
}

function GeofencesContent() {
  const { data: geofences, isLoading } = useGeofences();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/geofences/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["geofences"] }); toast.success("Geofence deactivated."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Geofences</h2>
          <p className="text-sm text-slate-500 mt-0.5">Define allowed check-in zones for attendance policies</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 h-10 px-4 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Geofence
        </button>
      </div>

      {showForm && (
        <GeofenceForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["geofences"] }); setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : geofences?.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No geofences yet</p>
          <p className="text-xs text-slate-400 mt-1">Create a circle or polygon zone, then reference it in an attendance policy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {geofences?.map((gf: any) => (
            <div key={gf.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                gf.active ? "bg-indigo-50" : "bg-slate-100")}>
                {gf.type === "circle"
                  ? <Circle className={cn("w-5 h-5", gf.active ? "text-indigo-600" : "text-slate-400")} />
                  : <Hexagon className={cn("w-5 h-5", gf.active ? "text-indigo-600" : "text-slate-400")} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{gf.name}</p>
                  {gf.active
                    ? <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Active</span>
                    : <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">Inactive</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {gf.type === "circle"
                    ? `Circle · ${gf.geometry?.lat?.toFixed(5)}, ${gf.geometry?.lng?.toFixed(5)} · radius ${gf.geometry?.radiusMeters}m`
                    : `Polygon · ${gf.geometry?.coordinates?.length ?? 0} vertices`}
                </p>
                {gf.address && <p className="text-xs text-slate-400 mt-0.5">{gf.address}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => { setEditing(gf); setShowForm(true); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => deleteMut.mutate(gf.id)} disabled={deleteMut.isPending}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GeofenceForm({ initial, onClose, onSaved }: {
  initial: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [address, setAddress] = useState<string>(initial?.address ?? "");
  const [type, setType] = useState<"circle" | "polygon">(initial?.type ?? "circle");
  const [geom, setGeom] = useState<GeomForm>(
    initial?.geometry
      ? { ...initial.geometry }
      : type === "circle" ? { ...EMPTY_CIRCLE } : { ...EMPTY_POLYGON }
  );
  const [saving, setSaving] = useState(false);

  const switchType = (t: "circle" | "polygon") => {
    setType(t);
    setGeom(t === "circle" ? { ...EMPTY_CIRCLE } : { ...EMPTY_POLYGON });
  };

  const addVertex = () => {
    if (geom.type !== "polygon") return;
    setGeom({ ...geom, coordinates: [...geom.coordinates, { lat: 0, lng: 0 }] });
  };

  const removeVertex = (i: number) => {
    if (geom.type !== "polygon" || geom.coordinates.length <= 3) return;
    const coords = geom.coordinates.filter((_, idx) => idx !== i);
    setGeom({ ...geom, coordinates: coords });
  };

  const updateVertex = (i: number, field: "lat" | "lng", val: string) => {
    if (geom.type !== "polygon") return;
    const coords = [...geom.coordinates];
    coords[i] = { ...coords[i], [field]: parseFloat(val) || 0 };
    setGeom({ ...geom, coordinates: coords });
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/geofences/${initial.id}` : "/api/geofences";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, geometry: geom, address: address.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Save failed"); return; }
      toast.success(isEdit ? "Geofence updated." : "Geofence created.");
      onSaved();
    } catch { toast.error("Network error."); } finally { setSaving(false); }
  };

  const inp = "h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">{isEdit ? "Edit Geofence" : "New Geofence"}</h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4 h-4" /></button>
      </div>

      {/* Name + address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Name *</label>
          <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Office" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Address (optional)</label>
          <input className={inp} value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 123 Park Ave, Hubli" />
        </div>
      </div>

      {/* Type selector */}
      {!isEdit && (
        <div className="flex gap-2">
          {(["circle", "polygon"] as const).map(t => (
            <button key={t} type="button"
              onClick={() => switchType(t)}
              className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                type === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
              {t === "circle" ? <Circle className="w-3.5 h-3.5" /> : <Hexagon className="w-3.5 h-3.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Circle fields */}
      {geom.type === "circle" && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Centre Latitude *</label>
            <input type="number" step="any" className={inp} value={(geom as CircleGeom).lat || ""}
              onChange={e => setGeom({ ...geom as CircleGeom, lat: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Centre Longitude *</label>
            <input type="number" step="any" className={inp} value={(geom as CircleGeom).lng || ""}
              onChange={e => setGeom({ ...geom as CircleGeom, lng: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Radius (m) *</label>
            <input type="number" min={10} className={inp} value={(geom as CircleGeom).radiusMeters || ""}
              onChange={e => setGeom({ ...geom as CircleGeom, radiusMeters: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      )}

      {/* Polygon fields */}
      {geom.type === "polygon" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vertices * (min 3)</label>
            <button type="button" onClick={addVertex} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add vertex
            </button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {(geom as PolygonGeom).coordinates.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-[10px] text-slate-400 w-5 shrink-0 text-right">{i + 1}</span>
                <input type="number" step="any" placeholder="Lat" className={cn(inp, "flex-1")} value={c.lat || ""}
                  onChange={e => updateVertex(i, "lat", e.target.value)} />
                <input type="number" step="any" placeholder="Lng" className={cn(inp, "flex-1")} value={c.lng || ""}
                  onChange={e => updateVertex(i, "lng", e.target.value)} />
                <button type="button" onClick={() => removeVertex(i)} disabled={(geom as PolygonGeom).coordinates.length <= 3}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Tip: open Google Maps, right-click a point and copy the coordinates.</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 h-9 px-4 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-3.5 h-3.5" /> {isEdit ? "Update" : "Create"} Geofence</>}
        </button>
        <button type="button" onClick={onClose} className="h-9 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
      </div>
    </div>
  );
}
