"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { useAttendanceMap } from "@/hooks/useAttendance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const OFFICE_LAT = 15.3647;
const OFFICE_LNG = 75.1240;
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

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
    if (!mapLoaded || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: { lat: OFFICE_LAT, lng: OFFICE_LNG },
      zoom: 15,
      mapId: "anvesana-attendance-map",
      styles: [
        { featureType: "poi", stylers: [{ visibility: "simplified" }] },
      ],
    });

    // Office marker
    new google.maps.Circle({
      map: mapInstance.current,
      center: { lat: OFFICE_LAT, lng: OFFICE_LNG },
      radius: 200,
      strokeColor: "#6366f1",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#6366f1",
      fillOpacity: 0.1,
    });
  }, [mapLoaded]);

  // Update employee markers
  useEffect(() => {
    if (!mapInstance.current || !markers) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    markers.forEach((m) => {
      const markerEl = document.createElement("div");
      markerEl.innerHTML = `
        <div style="background: ${m.distanceFromOffice > 200 ? '#ef4444' : '#10b981'}; color: white; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          ${m.fullName}
        </div>
      `;

      const advMarker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance.current!,
        position: { lat: m.latitude, lng: m.longitude },
        content: markerEl,
        title: `${m.fullName} - ${m.distanceFromOffice}m from office`,
      });

      const infoWindow = new google.maps.InfoWindow({
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
  const outsideGeofence = markers?.filter((m) => m.distanceFromOffice > 200).length ?? 0;

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
              <p className="text-2xl font-bold text-slate-900">{totalCheckedIn - outsideGeofence}</p>
              <p className="text-xs text-slate-400">Within geofence</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{outsideGeofence}</p>
              <p className="text-xs text-slate-400">Outside geofence</p>
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

      {/* Employee List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : markers && markers.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Check-in Details</h3>
          <div className="space-y-3">
            {markers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white",
                  m.distanceFromOffice <= 200 ? "bg-emerald-500" : "bg-red-500"
                )}>
                  {m.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{m.fullName}</p>
                  <p className="text-xs text-slate-400">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(m.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Badge variant={m.distanceFromOffice <= 200 ? "default" : "destructive"} className="text-xs">
                  {m.distanceFromOffice}m
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No check-ins today yet</p>
        </div>
      )}
    </div>
  );
}
