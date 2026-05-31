"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera, CheckCircle2, RefreshCw, X, Shield, AlertTriangle, Loader2,
  MapPin, LogIn, LogOut, UserCheck, UserX, Eye, ShieldCheck, ShieldX, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { applyGeotagWatermark, clientReverseGeocode } from "@/lib/geotag";
import type {
  AttendanceEvidence, FaceVerificationData, OverridePrompt,
  LivenessClientEvidence, LivenessData,
} from "@/hooks/useAttendance";
import type { FaceVerificationResult } from "@/lib/faceVerify";

interface Props {
  type: "checkin" | "checkout";
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (evidence: AttendanceEvidence) => void;
  isPending: boolean;
  profilePhoto: string | null;
  employeeName?: string;
  overridePrompt?: OverridePrompt | null;
  onOverrideConfirm?: (note: string) => void;
}

type Step = "capture" | "geotagging" | "preview";
type CapturePhase = "ready" | "countdown" | "processing";

const FACE_VERIFY_TIMEOUT_MS = 20_000;
const LIVENESS_FRAME_COUNT   = 6;
const LIVENESS_INTERVAL_MS   = 500;
const LIVENESS_CANVAS_W      = 160;
const LIVENESS_CANVAS_H      = 120;

function computeFrameDiff(a: ImageData, b: ImageData): number {
  let total = 0;
  const len = a.data.length;
  for (let i = 0; i < len; i += 4) {
    total += (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])) / 3;
  }
  return total / (len / 4) / 255;
}

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

export function AttendanceCaptureModal({
  type, isOpen, onClose, onConfirm, isPending, profilePhoto, employeeName = "Employee",
  overridePrompt, onOverrideConfirm,
}: Props) {
  const videoRef          = useRef<HTMLVideoElement>(null);
  const selfieCanvasRef   = useRef<HTMLCanvasElement>(null);
  const livenessCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef         = useRef<MediaStream | null>(null);

  const [step,         setStep]         = useState<Step>("capture");
  const [capturePhase, setCapturePhase] = useState<CapturePhase>("ready");
  const [countdown,    setCountdown]    = useState(3);

  const [photo,         setPhoto]         = useState<string | null>(null);
  const [rawPhoto,      setRawPhoto]      = useState<string | null>(null); // before geotag
  const [cameraReady,   setCameraReady]   = useState(false);
  const [cameraError,   setCameraError]   = useState<string | null>(null);

  const [gps,        setGps]        = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError,   setGpsError]   = useState<string | null>(null);

  const [address,        setAddress]        = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const [overrideNote,     setOverrideNote]     = useState("");
  const [faceVerifying,    setFaceVerifying]    = useState(false);
  const [faceResult,       setFaceResult]       = useState<FaceVerificationResult | null>(null);
  const [livenessEvidence, setLivenessEvidence] = useState<LivenessClientEvidence | null>(null);

  // Camera controls
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
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
      } else if (name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Camera unavailable. GPS-only check-in available.");
      }
    }
  }, []);

  // GPS + reverse geocoding
  const requestGps = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);
    setGps(null);
    setAddress(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported.");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setGps(coords);
        setGpsLoading(false);
        // Start client-side reverse geocoding for display
        setAddressLoading(true);
        const addr = await clientReverseGeocode(coords.latitude, coords.longitude);
        setAddress(addr);
        setAddressLoading(false);
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: "Location permission denied. Enable it in browser settings.",
          2: "Location unavailable. Try again.",
          3: "Location timed out. Try again.",
        };
        setGpsError(msgs[err.code] ?? "Unable to get location.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Face verification
  const runFaceVerification = useCallback(async (capturedPhoto: string) => {
    if (!profilePhoto) { setFaceResult(null); setFaceVerifying(false); return; }
    setFaceVerifying(true);
    setFaceResult(null);
    const timeout = new Promise<FaceVerificationResult>(resolve =>
      setTimeout(() => resolve({ confidence: 0, verified: false, needsReview: true, method: "face-api-client-v1", error: "Verification timed out" }), FACE_VERIFY_TIMEOUT_MS)
    );
    try {
      const { verifyFace } = await import("@/lib/faceVerify");
      const result = await Promise.race([verifyFace(capturedPhoto, profilePhoto), timeout]);
      setFaceResult(result);
    } catch {
      setFaceResult({ confidence: 0, verified: false, needsReview: true, method: "face-api-client-v1", error: "Verification failed — flagged for review" });
    } finally {
      setFaceVerifying(false);
    }
  }, [profilePhoto]);

  // Liveness capture
  const captureLivenessFrames = useCallback(async (): Promise<LivenessClientEvidence> => {
    const video  = videoRef.current;
    const canvas = livenessCanvasRef.current;
    const empty: LivenessClientEvidence = { challengeType: "blink", frameCount: 0, maxFrameDiff: 0, avgFrameDiff: 0, frameIntervalMs: LIVENESS_INTERVAL_MS, diffs: [], capturedAt: Date.now() };
    if (!video || !canvas) return empty;
    canvas.width  = LIVENESS_CANVAS_W;
    canvas.height = LIVENESS_CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return empty;
    const frames: ImageData[] = [];
    const capturedAt = Date.now();
    for (let i = 0; i < LIVENESS_FRAME_COUNT; i++) {
      ctx.drawImage(video, 0, 0, LIVENESS_CANVAS_W, LIVENESS_CANVAS_H);
      frames.push(ctx.getImageData(0, 0, LIVENESS_CANVAS_W, LIVENESS_CANVAS_H));
      if (i < LIVENESS_FRAME_COUNT - 1) await sleep(LIVENESS_INTERVAL_MS);
    }
    const diffs        = frames.slice(1).map((f, i) => computeFrameDiff(frames[i], f));
    const maxFrameDiff = diffs.length > 0 ? Math.max(...diffs) : 0;
    const avgFrameDiff = diffs.length > 0 ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
    return { challengeType: "blink", frameCount: frames.length, maxFrameDiff, avgFrameDiff, frameIntervalMs: LIVENESS_INTERVAL_MS, diffs, capturedAt };
  }, []);

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setStep("capture");
      setCapturePhase("ready");
      setCountdown(3);
      setPhoto(null);
      setRawPhoto(null);
      setCameraError(null);
      setCameraReady(false);
      setGps(null);
      setGpsError(null);
      setAddress(null);
      setFaceResult(null);
      setFaceVerifying(false);
      setLivenessEvidence(null);
      startCamera();
      requestGps();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Capture selfie → apply geotag → show preview
  const handleStartCapture = useCallback(async () => {
    if (!videoRef.current) return;
    setCapturePhase("countdown");

    for (let t = 3; t >= 1; t--) {
      setCountdown(t);
      if (t > 1) await sleep(1000);
    }

    const evidencePromise = captureLivenessFrames();
    await sleep(1000);
    const evidence = await evidencePromise;

    setCapturePhase("processing");

    const canvas = selfieCanvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    canvas.width  = 320;
    canvas.height = 240;
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.7);

    stopCamera();
    setRawPhoto(rawDataUrl);
    setLivenessEvidence(evidence);

    // Apply geotag watermark
    setStep("geotagging");
    const addr = address ?? `${gps?.latitude.toFixed(5) ?? ""}°, ${gps?.longitude.toFixed(5) ?? ""}°`;
    const tagged = await applyGeotagWatermark({
      photoBase64:  rawDataUrl,
      latitude:     gps?.latitude  ?? 0,
      longitude:    gps?.longitude ?? 0,
      address:      addr,
      employeeName: employeeName,
      timestamp:    new Date(),
      type:         type === "checkin" ? "check-in" : "check-out",
    });

    setPhoto(tagged);
    setStep("preview");
    setCapturePhase("ready");
    runFaceVerification(rawDataUrl); // verify using raw (unmodified) photo
  }, [captureLivenessFrames, stopCamera, runFaceVerification, gps, address, employeeName, type]);

  const handleSkipPhoto = () => {
    setPhoto(null);
    setRawPhoto(null);
    setStep("preview");
    stopCamera();
    setFaceResult(null);
    setFaceVerifying(false);
    setLivenessEvidence(null);
  };

  const handleRetake = () => {
    setPhoto(null);
    setRawPhoto(null);
    setFaceResult(null);
    setFaceVerifying(false);
    setLivenessEvidence(null);
    setCountdown(3);
    setCapturePhase("ready");
    setStep("capture");
    startCamera();
  };

  const handleConfirm = () => {
    if (!gps) return;
    const faceVerification: FaceVerificationData | null = faceResult
      ? { confidence: faceResult.confidence, verified: faceResult.verified, needsReview: faceResult.needsReview, method: faceResult.method, error: faceResult.error }
      : null;
    onConfirm({ ...gps, photo, faceVerification, livenessEvidence });
  };

  const isCheckin    = type === "checkin";
  const isCapturing  = capturePhase === "countdown" || capturePhase === "processing";
  const canConfirm   = !!gps && !gpsLoading && !faceVerifying && !isCapturing && !isPending && step === "preview";
  const accentClass  = isCheckin ? "emerald" : "blue";

  if (!isOpen) return null;

  // Status badge components
  const FaceStatusBadge = () => {
    if (!photo) return null;
    if (faceVerifying) return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-indigo-50 text-indigo-700">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        <span>Verifying identity…</span>
      </div>
    );
    if (!profilePhoto) return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-slate-50 text-slate-500">
        <Eye className="w-3.5 h-3.5 shrink-0" />
        <span>No profile photo — face check skipped</span>
      </div>
    );
    if (!faceResult) return null;
    if (faceResult.verified) return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700">
        <UserCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Identity verified</span>
        <span className="ml-auto font-bold">{faceResult.confidence}%</span>
      </div>
    );
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-amber-50 text-amber-700">
        <UserX className="w-3.5 h-3.5 shrink-0" />
        <span>{faceResult.error?.includes("No face") ? faceResult.error : "Low confidence — flagged for review"}</span>
        <span className="ml-auto font-bold">{faceResult.confidence}%</span>
      </div>
    );
  };

  const LivenessBadge = () => {
    if (!livenessEvidence) return null;
    const hasBlink   = livenessEvidence.diffs.some(d => d >= 0.025);
    const likelyPass = livenessEvidence.maxFrameDiff >= 0.004 && livenessEvidence.maxFrameDiff < 0.35 && hasBlink;
    if (likelyPass) return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Liveness check passed</span>
      </div>
    );
    if (livenessEvidence.maxFrameDiff < 0.004) return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-amber-50 text-amber-700">
        <ShieldX className="w-3.5 h-3.5 shrink-0" />
        <span>Blink not detected — will be reviewed</span>
      </div>
    );
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-amber-50 text-amber-700">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Liveness inconclusive — will be reviewed</span>
      </div>
    );
  };

  const countdownPct = ((3 - countdown) / 3) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isPending && !isCapturing ? onClose : undefined}
      />

      <div className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={cn(
          "flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0",
          isCheckin ? "bg-emerald-50" : "bg-blue-50"
        )}>
          <div className="flex items-center gap-2.5">
            {isCheckin
              ? <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><LogIn className="w-4 h-4 text-emerald-600" /></div>
              : <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><LogOut className="w-4 h-4 text-blue-600" /></div>
            }
            <div>
              <h2 className="text-sm font-bold text-slate-900">{isCheckin ? "Check In" : "Check Out"}</h2>
              <p className="text-xs text-slate-500">
                {step === "capture"
                  ? capturePhase === "countdown" ? "Hold still and blink naturally…" : "Take a selfie to continue"
                  : step === "geotagging" ? "Adding geotag watermark…"
                  : "Review and confirm"}
              </p>
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            disabled={isPending || isCapturing || step === "geotagging"}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors disabled:opacity-30"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-3">

            {/* ── Consent notice ─────────────────────────────────────────── */}
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
              <span>Your geotagged selfie, GPS location, face & liveness data are stored as HR attendance evidence.</span>
            </div>

            {/* ── Camera viewfinder ───────────────────────────────────────── */}
            <div className="relative rounded-xl overflow-hidden bg-slate-900 w-full aspect-[4/3]">

              {/* CAPTURE STEP */}
              {step === "capture" && (
                <>
                  <video
                    ref={videoRef} autoPlay playsInline muted
                    className={cn("w-full h-full object-cover scale-x-[-1]", !cameraReady && "opacity-0")}
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

                  {/* Face guide oval */}
                  {cameraReady && capturePhase === "ready" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-24 h-32 rounded-full border-2 border-white/40" />
                    </div>
                  )}

                  {/* ── Geotag info overlay (bottom bar, camera-app style) ── */}
                  {cameraReady && capturePhase === "ready" && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className={cn(
                          "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                          isCheckin ? "bg-emerald-500/90 text-white" : "bg-indigo-500/90 text-white"
                        )}>
                          {isCheckin ? "● CHECK-IN" : "● CHECK-OUT"}
                        </div>
                        <div className="text-[10px] font-mono text-amber-400">
                          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                          <LiveClock />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <p className="text-[10px] text-white/80 truncate">
                          {addressLoading ? "Fetching address…" : address ?? (gps ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : "Getting location…")}
                        </p>
                      </div>
                      {gps && (
                        <p className="text-[9px] font-mono text-white/40 mt-0.5">
                          {gps.latitude.toFixed(5)}°N, {gps.longitude.toFixed(5)}°E
                        </p>
                      )}
                    </div>
                  )}

                  {/* Countdown overlay */}
                  {capturePhase === "countdown" && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                      <div className="text-6xl font-black text-white drop-shadow-lg tabular-nums">{countdown}</div>
                      <p className="text-sm font-semibold text-white/90 mt-1">Blink naturally 👁</p>
                      <div className="absolute bottom-3 left-4 right-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        {/* eslint-disable-next-line react/forbid-dom-props -- dynamic width requires inline style */}
                        <div className="h-full bg-white rounded-full transition-all duration-1000 ease-linear" style={{ width: `${countdownPct}%` }} />
                      </div>
                    </div>
                  )}
                  {capturePhase === "processing" && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <p className="text-xs text-white/80">Processing…</p>
                    </div>
                  )}
                </>
              )}

              {/* GEOTAGGING STEP */}
              {step === "geotagging" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                  {rawPhoto && <img src={rawPhoto} alt="Selfie" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                  <div className="relative flex flex-col items-center gap-2">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isCheckin ? "bg-emerald-500" : "bg-indigo-500")}>
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-white">Adding geotag…</p>
                    <p className="text-xs text-white/60">Stamping location & time</p>
                    <div className="flex gap-1 mt-1">
                      {(["", "[animation-delay:150ms]", "[animation-delay:300ms]"] as const).map((delay, i) => (
                        <div key={i} className={cn("w-1.5 h-1.5 rounded-full animate-bounce", isCheckin ? "bg-emerald-400" : "bg-indigo-400", delay)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PREVIEW STEP */}
              {step === "preview" && (
                <>
                  {photo
                    ? <img src={photo} alt="Geotagged selfie" className="w-full h-full object-cover" />
                    : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <Camera className="w-8 h-8 text-white/30" />
                        <p className="text-xs text-white/50">No photo captured</p>
                      </div>
                  }
                  {faceVerifying && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <p className="text-xs text-white font-medium">Verifying identity…</p>
                    </div>
                  )}
                  {!faceVerifying && faceResult?.verified && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      <UserCheck className="w-3 h-3" /> Verified
                    </div>
                  )}
                  {photo && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      <MapPin className="w-2.5 h-2.5" /> Geotagged
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hidden canvases */}
            <canvas ref={selfieCanvasRef}   className="hidden" />
            <canvas ref={livenessCanvasRef} className="hidden" />

            {/* Preview-step badges */}
            {step === "preview" && (
              <>
                <FaceStatusBadge />
                <LivenessBadge />
              </>
            )}

            {/* GPS + Address status */}
            <div className={cn(
              "rounded-xl px-3 py-2.5 text-xs font-medium space-y-1",
              gpsLoading && "bg-amber-50 text-amber-700",
              !gpsLoading && gps && "bg-emerald-50 text-emerald-700",
              !gpsLoading && gpsError && "bg-red-50 text-red-600",
            )}>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {gpsLoading && <><Loader2 className="w-3 h-3 animate-spin" /><span>Getting your location…</span></>}
                {!gpsLoading && gps && (
                  <>
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>GPS locked · ±{Math.round(gps.accuracy)}m</span>
                  </>
                )}
                {!gpsLoading && gpsError && (
                  <>
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span className="flex-1">{gpsError}</span>
                    <button type="button" onClick={requestGps} className="ml-auto shrink-0 hover:opacity-80" aria-label="Retry GPS">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {gps && (
                <div className="flex items-center gap-1 pl-5">
                  {addressLoading
                    ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /><span className="text-[10px]">Fetching address…</span></>
                    : address
                      ? <span className="text-[11px] font-semibold truncate">📍 {address}</span>
                      : <span className="text-[10px] font-mono">{gps.latitude.toFixed(5)}°, {gps.longitude.toFixed(5)}°</span>
                  }
                </div>
              )}
            </div>

            {/* Policy override prompt */}
            {overridePrompt && step === "preview" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-red-700">{overridePrompt.reason}</p>
                </div>
                {onOverrideConfirm && (
                  <>
                    <textarea rows={2}
                      placeholder="Add a note explaining why you're checking in from this location…"
                      value={overrideNote}
                      onChange={e => setOverrideNote(e.target.value)}
                      className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    />
                    <button type="button" disabled={isPending} onClick={() => onOverrideConfirm(overrideNote)}
                      className="w-full h-9 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      Submit Override (needs HR review)
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-1 pb-1">
              {step === "capture" && (
                <>
                  <button type="button" onClick={handleStartCapture}
                    disabled={!cameraReady || isCapturing || isPending}
                    className={cn(
                      "w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all",
                      isCheckin
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}>
                    {isCapturing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Capturing…</>
                      : <><Camera className="w-4 h-4" /> Capture Selfie</>
                    }
                  </button>
                  {cameraError && !isCapturing && (
                    <button type="button" onClick={handleSkipPhoto} disabled={isPending}
                      className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50">
                      Continue without photo
                    </button>
                  )}
                </>
              )}

              {step === "geotagging" && (
                <div className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-slate-500 bg-slate-50">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  Stamping geotag watermark…
                </div>
              )}

              {step === "preview" && (
                <>
                  <button type="button" onClick={handleConfirm} disabled={!canConfirm}
                    className={cn(
                      "w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all",
                      isCheckin
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}>
                    {isPending       ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    : faceVerifying  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                    : gpsLoading     ? <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for GPS…</>
                    : gpsError       ? <><AlertTriangle className="w-4 h-4" /> Location required</>
                    : <><CheckCircle2 className="w-4 h-4" /> Confirm {isCheckin ? "Check In" : "Check Out"}</>
                    }
                  </button>
                  {!isPending && (
                    <button type="button" onClick={handleRetake} disabled={faceVerifying}
                      className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {photo ? "Retake & redo liveness" : "Take photo"}
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
