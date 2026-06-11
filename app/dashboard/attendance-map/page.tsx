"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, Clock, AlertTriangle, RefreshCw, X, Navigation, Camera, Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAttendanceMap } from "@/hooks/useAttendance";
import { useTodayCheckins, type TodayCheckin } from "@/hooks/useTodayCheckins";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const OFFICE_LAT = 13.962271577211828;
const OFFICE_LNG = 75.50897323054004;
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function AttendanceMapPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AttendanceMapContent />
    </RoleGuard>
  );
}

function AttendanceMapContent() {
  const { data: markers, isLoading, refetch } = useAttendanceMap();
  const { data: checkins, isLoading: checkinsLoading } = useTodayCheckins();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<{ id: string; name: string; address: string | null; time: string | null } | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === "undefined" || !GOOGLE_MAPS_KEY) return;
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !window.google) return;
    if (!mapLoaded || !mapRef.current || mapInstance.current) return;
    
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: OFFICE_LAT, lng: OFFICE_LNG },
      zoom: 15,
      mapId: "anvesana-attendance-map",
      styles: [
        { featureType: "poi", stylers: [{ visibility: "simplified" }] },
      ],
    });

    // Office marker
    new window.google.maps.Circle({
      map: mapInstance.current,
      center: { lat: OFFICE_LAT, lng: OFFICE_LNG },
      radius: 1000,
      strokeColor: "#6366f1",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#6366f1",
      fillOpacity: 0.1,
    });
  }, [mapLoaded]);

  // Update employee markers
  useEffect(() => {
    if (typeof window === "undefined" || !window.google) return;
    if (!mapInstance.current || !markers) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    markers.forEach((m) => {
      const markerEl = document.createElement("div");
      markerEl.innerHTML = `
        <div style="background: ${m.distanceFromOffice > 1000 ? '#ef4444' : '#10b981'}; color: white; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          ${m.fullName}
        </div>
      `;

      const advMarker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstance.current!,
        position: { lat: m.latitude, lng: m.longitude },
        content: markerEl,
        title: `${m.fullName} - ${m.distanceFromOffice}m from office`,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: Inter, sans-serif;">
            <p style="font-weight: 600; margin: 0 0 4px;">${m.fullName}</p>
            <p style="color: #64748b; font-size: 12px; margin: 0 0 2px;">Check-in: ${new Date(m.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            <p style="color: #64748b; font-size: 12px; margin: 0;">Distance: ${m.distanceFromOffice}m from office</p>
          </div>
        `,
      });

      advMarker.addListener("click", () => {
        infoWindow.open({ anchor: advMarker, map: mapInstance.current });
      });

      markersRef.current.push(advMarker);
    });
  }, [markers, mapLoaded]);

  const totalCheckedIn = markers?.length ?? 0;
  const outsideZone = markers?.filter((m) => m.distanceFromOffice > 1000).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Live Attendance Map</h2>
          <p className="text-sm text-slate-500">Real-time employee check-in locations</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCheckedIn}</p>
              <p className="text-xs text-slate-400">Checked in today</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCheckedIn - outsideZone}</p>
              <p className="text-xs text-slate-400">Within office zone</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{outsideZone}</p>
              <p className="text-xs text-slate-400">Outside office zone</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Map */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {!GOOGLE_MAPS_KEY ? (
          <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 gap-3">
            <MapPin className="w-12 h-12" />
            <p className="text-sm font-medium">Google Maps API key not configured</p>
            <p className="text-xs">Set <code className="bg-slate-100 px-1.5 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your environment</p>
          </div>
        ) : (
          <div ref={mapRef} className="h-[500px] w-full" />
        )}
      </motion.div>

      {/* Today's check-in photo + location panel */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Today&apos;s Check-ins</h3>
            <p className="text-xs text-slate-400 mt-0.5">Geotagged selfies with live location addresses</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {checkins?.length ?? 0} employees
          </span>
        </div>

        {checkinsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        ) : !checkins?.length ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-16">
            <Camera className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">No check-ins recorded today</p>
            <p className="text-xs text-slate-400 mt-1">Check-in selfies will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checkins.map(c => <CheckinCard key={c.id} c={c} onPhotoClick={setLightbox} />)}
          </div>
        )}
      </motion.div>

      {/* Photo lightbox */}
      <AnimatePresence>
        {lightbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setLightbox(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm"
            >
              <button
                type="button" title="Close photo" aria-label="Close photo"
                onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <LazyPhoto id={lightbox.id} name={lightbox.name} />
              <div className="p-4 space-y-1">
                <p className="text-sm font-bold text-slate-900">{lightbox.name}</p>
                {lightbox.time && <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {lightbox.time}</p>}
                {lightbox.address && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {lightbox.address}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Lazy photo loader ─────────────────────────────────────────────────────────

function LazyPhoto({ id, name }: { id: string; name: string }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/attendance/photo?id=${id}&which=in`)
      .then(r => r.json())
      .then(d => setPhoto(d.photo))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
    </div>
  );
  if (!photo) return (
    <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
      <Camera className="w-8 h-8 text-slate-300" />
    </div>
  );
  return <img src={photo} alt={`${name} selfie`} className="w-full object-cover" />;
}

// ── Checkin card ──────────────────────────────────────────────────────────────

function CheckinCard({
  c,
  onPhotoClick,
}: {
  c: TodayCheckin;
  onPhotoClick: (lb: { id: string; name: string; address: string | null; time: string | null }) => void;
}) {
  const initials = c.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const fmtTime  = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  const statusColors: Record<string, string> = {
    present: "bg-emerald-100 text-emerald-700",
    late:    "bg-amber-100 text-amber-700",
    absent:  "bg-red-100 text-red-700",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo placeholder — only loads on click */}
      {c.hasCheckInPhoto ? (
        <button
          type="button"
          title="View geotagged selfie"
          aria-label={`View ${c.fullName}'s check-in selfie`}
          onClick={() => onPhotoClick({ id: c.id, name: c.fullName, address: c.checkInAddress, time: fmtTime(c.checkIn) })}
          className="relative w-full h-36 block overflow-hidden group bg-slate-800"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/60">
            <Camera className="w-7 h-7 group-hover:text-white transition-colors" />
            <span className="text-[10px] font-medium group-hover:text-white transition-colors">Tap to view</span>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            <MapPin className="w-2.5 h-2.5" /> Geotagged
          </div>
        </button>
      ) : (
        <div className="w-full h-36 bg-slate-100 flex flex-col items-center justify-center gap-1">
          <Camera className="w-6 h-6 text-slate-300" />
          <p className="text-[10px] text-slate-400">No selfie</p>
        </div>
      )}

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 shrink-0">
            {c.avatar && <AvatarImage src={c.avatar} alt={c.fullName} />}
            <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{c.fullName}</p>
            <p className="text-[10px] text-slate-400 truncate">{c.department ?? "—"}</p>
          </div>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", statusColors[c.status] ?? "bg-slate-100 text-slate-600")}>
            {c.status}
          </span>
        </div>

        <div className="space-y-1">
          {c.checkInAddress && (
            <p className="text-[11px] text-slate-600 flex items-start gap-1">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-emerald-500" />
              <span className="leading-snug">{c.checkInAddress}</span>
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> In: {fmtTime(c.checkIn) ?? "—"}
              {c.checkOut && <> · Out: {fmtTime(c.checkOut)}</>}
            </p>
            {c.latitude && c.longitude && (
              <a
                href={`https://maps.google.com/?q=${c.latitude},${c.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on Google Maps"
                aria-label="View location on Google Maps"
                className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-medium"
              >
                <Navigation className="w-2.5 h-2.5" /> Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
