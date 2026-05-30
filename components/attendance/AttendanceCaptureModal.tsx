"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  X,
  Shield,
  AlertTriangle,
  Loader2,
  MapPin,
  LogIn,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceEvidence } from "@/hooks/useAttendance";

interface Props {
  type: "checkin" | "checkout";
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (evidence: AttendanceEvidence) => void;
  isPending: boolean;
}

type Step = "capture" | "preview";

export function AttendanceCaptureModal({
  type,
  isOpen,
  onClose,
  onConfirm,
  isPending,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      const name = err instanceof Error ? (err as any).name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. You can still check in with GPS only.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Camera unavailable. You can still check in with GPS only.");
      }
    }
  }, []);

  const requestGps = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);
    setGps(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsLoading(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Enable it in your browser settings.",
          2: "Location unavailable. Try again.",
          3: "Location request timed out. Try again.",
        };
        setGpsError(messages[err.code] ?? "Unable to get location.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Initialise / tear down on open/close
  useEffect(() => {
    if (isOpen) {
      setStep("capture");
      setPhoto(null);
      setCameraError(null);
      setCameraReady(false);
      setGps(null);
      setGpsError(null);
      startCamera();
      requestGps();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Draw unmirrored (video CSS is mirrored for UX; stored photo is natural orientation)
    ctx.drawImage(video, 0, 0, 320, 240);
    setPhoto(canvas.toDataURL("image/jpeg", 0.5));
    setStep("preview");
    stopCamera();
  };

  const handleSkipPhoto = () => {
    setPhoto(null);
    setStep("preview");
    stopCamera();
  };

  const handleRetake = () => {
    setPhoto(null);
    setStep("capture");
    startCamera();
  };

  const handleConfirm = () => {
    if (!gps) return;
    onConfirm({ ...gps, photo });
  };

  const isCheckin = type === "checkin";
  const canCapture = cameraReady || !!cameraError;
  const canConfirm = !!gps && !gpsLoading && !isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isPending ? onClose : undefined}
      />

      <div className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-4 border-b border-slate-100",
            isCheckin ? "bg-emerald-50" : "bg-blue-50"
          )}
        >
          <div className="flex items-center gap-2.5">
            {isCheckin ? (
              <LogIn className="w-4 h-4 text-emerald-600" />
            ) : (
              <LogOut className="w-4 h-4 text-blue-600" />
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isCheckin ? "Check In" : "Check Out"}
              </h2>
              <p className="text-xs text-slate-500">
                {step === "capture" ? "Take a selfie, then confirm" : "Review and confirm"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Consent notice */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span>
              Your selfie and GPS location will be stored as attendance evidence and used only for
              HR verification.
            </span>
          </div>

          {/* Camera viewfinder / captured photo */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900 w-full aspect-[4/3]">
            {/* Live viewfinder (capture step) */}
            {step === "capture" && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover",
                    // Mirror for natural selfie UX
                    "scale-x-[-1]",
                    !cameraReady && "opacity-0"
                  )}
                />
                {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
                    <p className="text-xs text-white/50">Starting camera…</p>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                    <Camera className="w-8 h-8 text-white/30" />
                    <p className="text-xs text-white/60 leading-snug">{cameraError}</p>
                  </div>
                )}
                {/* Selfie guide overlay */}
                {cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-32 rounded-full border-2 border-white/40" />
                  </div>
                )}
              </>
            )}

            {/* Preview (after capture or skip) */}
            {step === "preview" && (
              <>
                {photo ? (
                  <img
                    src={photo}
                    alt="Captured selfie"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Camera className="w-8 h-8 text-white/30" />
                    <p className="text-xs text-white/50">No photo captured</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* GPS status */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium",
              gpsLoading && "bg-amber-50 text-amber-700",
              !gpsLoading && gps && "bg-emerald-50 text-emerald-700",
              !gpsLoading && gpsError && "bg-red-50 text-red-600"
            )}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {gpsLoading && (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Getting your location…</span>
              </>
            )}
            {!gpsLoading && gps && (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Location ready · ±{Math.round(gps.accuracy)}m accuracy</span>
              </>
            )}
            {!gpsLoading && gpsError && (
              <>
                <AlertTriangle className="w-3 h-3" />
                <span className="flex-1">{gpsError}</span>
                <button
                  type="button"
                  onClick={requestGps}
                  className="ml-auto shrink-0 hover:opacity-80"
                  aria-label="Retry GPS"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            {step === "capture" && (
              <>
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!cameraReady || isPending}
                  className={cn(
                    "w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all",
                    isCheckin
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Camera className="w-4 h-4" />
                  Capture Selfie
                </button>
                {cameraError && (
                  <button
                    type="button"
                    onClick={handleSkipPhoto}
                    disabled={isPending}
                    className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    Continue without photo
                  </button>
                )}
              </>
            )}

            {step === "preview" && (
              <>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className={cn(
                    "w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all",
                    isCheckin
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                    </>
                  ) : gpsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Waiting for GPS…
                    </>
                  ) : gpsError ? (
                    <>
                      <AlertTriangle className="w-4 h-4" /> Location required
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm {isCheckin ? "Check In" : "Check Out"}
                    </>
                  )}
                </button>
                {!isPending && (
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {photo ? "Retake photo" : "Take photo"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
