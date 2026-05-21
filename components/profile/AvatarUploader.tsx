"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X } from "lucide-react";
import { useUploadAvatar, useDeleteAvatar } from "@/hooks/useProfile";

interface AvatarUploaderProps {
  employeeId: string;
  currentAvatar?: string;
  employeeName?: string;
}

export const AvatarUploader = ({
  employeeId,
  currentAvatar,
  employeeName = "User",
}: AvatarUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<string | undefined>(currentAvatar);
  const [isCompressing, setIsCompressing] = useState(false);

  const uploadMutation = useUploadAvatar(employeeId);
  const deleteMutation = useDeleteAvatar(employeeId);

  const compressImage = (
    file: File,
    callback: (base64: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const maxSize = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL("image/jpeg", 0.7);
          callback(base64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    compressImage(file, async (base64) => {
      setPreview(base64);
      await uploadMutation.mutateAsync(file);
      setIsCompressing(false);
    });
  };

  const handleDelete = () => {
    if (confirm("Delete avatar?")) {
      deleteMutation.mutate();
      setPreview(undefined);
    }
  };

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-col items-center gap-4">
        <Avatar className="h-24 w-24 ring-4 ring-slate-200">
          <AvatarImage src={preview} />
          <AvatarFallback className="text-lg bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 font-bold">
            {employeeName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing || uploadMutation.isPending}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isCompressing ? "Compressing..." : "Upload"}
          </Button>
          {preview && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center">
          Recommended: 300x300px, max 2MB
        </p>
      </div>
    </div>
  );
};
