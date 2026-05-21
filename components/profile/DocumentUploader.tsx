"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useUploadDocument, useDeleteDocument, useVerifyDocument, useProfileDocuments } from "@/hooks/useProfile";

interface DocumentUploaderProps {
  employeeId: string;
  isAdmin?: boolean;
}

const DOCUMENT_TYPES = [
  { value: "certificate", label: "Certificate" },
  { value: "degree", label: "Degree" },
  { value: "resume", label: "Resume" },
  { value: "other", label: "Other Document" },
];

export const DocumentUploader = ({
  employeeId,
  isAdmin = false,
}: DocumentUploaderProps) => {
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("certificate");
  const [isDragging, setIsDragging] = useState(false);

  const { data: documents = [] } = useProfileDocuments(employeeId);
  const uploadMutation = useUploadDocument(employeeId);
  const deleteMutation = useDeleteDocument(employeeId);
  const verifyMutation = useVerifyDocument(employeeId);

  const handleFileSelect = async (file: File) => {
    if (!documentName) {
      alert("Please enter document name");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      await uploadMutation.mutateAsync({
        file,
        documentName,
        documentType,
      });
      setDocumentName("");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
          isDragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-200 hover:border-slate-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("doc-input")?.click()}
      >
        <input
          id="doc-input"
          type="file"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">
          Drag documents here or click to browse
        </p>
        <p className="text-xs text-slate-500 mt-1">
          PDF, DOC, DOCX, Image (Max 10MB)
        </p>
      </div>

      {/* Upload Form */}
      <div className="flex gap-2">
        <Input
          placeholder="Document name (e.g., AWS Certificate)"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          className="h-9"
        />
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700">
            Uploaded Documents ({documents.length})
          </h4>
          {documents.map((doc: any) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {doc.documentName}
                </p>
                <p className="text-xs text-slate-500">
                  {doc.documentType} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Verification Status */}
                {doc.verificationStatus === "verified" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded text-xs text-emerald-700">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </div>
                )}
                {doc.verificationStatus === "pending" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded text-xs text-amber-700">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </div>
                )}

                {/* Admin Verify Button */}
                {isAdmin && doc.verificationStatus === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyMutation.mutate(doc.id)}
                    disabled={verifyMutation.isPending}
                    className="h-7 text-xs"
                  >
                    Verify
                  </Button>
                )}

                {/* Delete Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    confirm("Delete this document?") &&
                    deleteMutation.mutate(doc.id)
                  }
                  disabled={deleteMutation.isPending}
                  className="h-7 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
