"use client";

import { useState, useRef, useCallback, useId } from "react";
import { Camera, Loader2, X, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadAvatar, useDeleteAvatar } from "@/hooks/useProfile";
import { toast } from "sonner";

interface Props {
  employeeId: string;
  currentAvatar?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  onUpdate?: (avatar: string | null) => void;
}

const SIZE_CONFIG = {
  sm: {
    wrap:        "w-16 h-16",
    initials:    "text-xl",
    spinner:     "w-5 h-5",
    camBtn:      "w-6 h-6 -bottom-0.5 -right-0.5",
    camIcon:     "w-3 h-3",
    delBtn:      "w-5 h-5 -top-0.5 -right-0.5",
    delIcon:     "w-2.5 h-2.5",
    cropPreview: "w-28 h-28",
  },
  md: {
    wrap:        "w-24 h-24",
    initials:    "text-3xl",
    spinner:     "w-7 h-7",
    camBtn:      "w-8 h-8 -bottom-1 -right-1",
    camIcon:     "w-4 h-4",
    delBtn:      "w-6 h-6 -top-1 -right-1",
    delIcon:     "w-3 h-3",
    cropPreview: "w-36 h-36",
  },
  lg: {
    wrap:        "w-32 h-32",
    initials:    "text-4xl",
    spinner:     "w-9 h-9",
    camBtn:      "w-10 h-10 -bottom-1.5 -right-1.5",
    camIcon:     "w-5 h-5",
    delBtn:      "w-8 h-8 -top-1.5 -right-1.5",
    delIcon:     "w-4 h-4",
    cropPreview: "w-44 h-44",
  },
} as const;

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function compressImage(file: File, maxPx = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Not an image file")); return; }
    if (file.size > 5 * 1024 * 1024)    { reject(new Error("File exceeds 5 MB limit")); return; }

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function AvatarUploader({
  employeeId,
  currentAvatar,
  name = "User",
  size = "md",
  onUpdate,
}: Props) {
  const inputId      = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload       = useUploadAvatar(employeeId);
  const remove       = useDeleteAvatar(employeeId);
  const cfg          = SIZE_CONFIG[size];

  const [preview,    setPreview]    = useState<string | null>(currentAvatar ?? null);
  const [cropSrc,    setCropSrc]    = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const isBusy = upload.isPending || compressing;

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setCropSrc(compressed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process image");
    } finally {
      setCompressing(false);
    }
  }, []);

  const handleSavePhoto = useCallback(async () => {
    if (!cropSrc) return;
    try {
      const blob = await (await fetch(cropSrc)).blob();
      await upload.mutateAsync(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      setPreview(cropSrc);
      onUpdate?.(cropSrc);
      setCropSrc(null);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
    }
  }, [cropSrc, upload, onUpdate]);

  const handleDelete = useCallback(async () => {
    try {
      await remove.mutateAsync();
      setPreview(null);
      onUpdate?.(null);
      toast.success("Profile photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  }, [remove, onUpdate]);

  const initials = getInitials(name);

  return (
    <>
      {/* ── Avatar circle ────────────────────────────────────────────── */}
      <div className={cn("relative inline-block group shrink-0", cfg.wrap)}>

        {/* Circle */}
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg ring-2 ring-slate-200">
          {preview ? (
            <img src={preview} alt={`${name} profile photo`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600">
              <span className={cn("text-white font-bold leading-none", cfg.initials)}>{initials}</span>
            </div>
          )}
        </div>

        {/* Uploading overlay */}
        {isBusy && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 className={cn("text-white animate-spin", cfg.spinner)} />
          </div>
        )}

        {/* Camera button */}
        {!isBusy && (
          <label
            htmlFor={inputId}
            title="Change profile photo"
            className={cn(
              "absolute rounded-full bg-indigo-600 text-white shadow-md cursor-pointer",
              "border-2 border-white hover:bg-indigo-700 active:scale-95 transition-all",
              "flex items-center justify-center",
              cfg.camBtn
            )}
          >
            <Camera className={cfg.camIcon} />
            <span className="sr-only">Change profile photo</span>
          </label>
        )}

        {/* Delete button — shown on hover when photo exists */}
        {preview && !isBusy && (
          <button
            type="button"
            title="Remove profile photo"
            aria-label="Remove profile photo"
            onClick={handleDelete}
            disabled={remove.isPending}
            className={cn(
              "absolute rounded-full bg-red-500 text-white shadow-md",
              "border-2 border-white hover:bg-red-600 active:scale-95 transition-all",
              "flex items-center justify-center",
              "opacity-0 group-hover:opacity-100",
              cfg.delBtn
            )}
          >
            {remove.isPending
              ? <Loader2 className={cn("animate-spin", cfg.delIcon)} />
              : <Trash2 className={cfg.delIcon} />
            }
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        title="Upload profile photo"
        aria-label="Upload profile photo"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Crop / confirm modal ─────────────────────────────────────── */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCropSrc(null)}
            role="presentation"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-900">Preview Photo</p>
              <button
                type="button"
                title="Close preview"
                aria-label="Close preview"
                onClick={() => setCropSrc(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Circular preview */}
            <div className="flex flex-col items-center gap-4 p-6">
              <div className={cn("rounded-full overflow-hidden border-4 border-indigo-100 shadow-lg ring-2 ring-indigo-200", cfg.cropPreview)}>
                <img src={cropSrc} alt="Photo preview" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-slate-500 text-center leading-snug">
                This is how your profile photo will appear across the platform.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 px-5 pb-5">
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={upload.isPending}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {upload.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Check className="w-4 h-4" /> Save Photo</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
