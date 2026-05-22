"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Search, Download, Eye, Trash2,
  Plus, X, Loader2, FolderOpen, FileCheck,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useHRDocuments, useUploadHRDocument, useDeleteHRDocument, useHRDocument } from "@/hooks/useHRDocuments";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "policy",   label: "HR Policy" },
  { value: "handbook", label: "Employee Handbook" },
  { value: "nda",      label: "NDA" },
  { value: "tax",      label: "Tax Documents" },
  { value: "offer",    label: "Offer Letters" },
  { value: "general",  label: "General" },
];

const CAT_COLORS: Record<string, string> = {
  policy:   "bg-indigo-50 text-indigo-700",
  handbook: "bg-violet-50 text-violet-700",
  nda:      "bg-amber-50  text-amber-700",
  tax:      "bg-sky-50    text-sky-700",
  offer:    "bg-emerald-50 text-emerald-700",
  general:  "bg-slate-100 text-slate-600",
};

function DocPreviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: doc, isLoading } = useHRDocument(id);

  function handleDownload() {
    if (!doc?.fileBase64) return;
    const a = document.createElement("a");
    a.href = doc.fileBase64;
    a.download = doc.fileName;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">{doc?.title ?? "Document"}</p>
          <div className="flex gap-2">
            {doc && (
              <button type="button" onClick={handleDownload}
                className="flex items-center gap-2 h-8 px-3 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : doc?.fileBase64 ? (
            doc.fileType.includes("pdf") ? (
              <iframe src={doc.fileBase64} className="w-full h-[60vh] rounded-xl border border-slate-200" title={doc.title} />
            ) : doc.fileType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.fileBase64} alt={doc.title} className="max-w-full rounded-xl border border-slate-200 mx-auto" />
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Preview not available for this file type.</p>
                <p className="text-xs text-slate-400 mt-1">Use the Download button above.</p>
              </div>
            )
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">File not available.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function HRDocumentsPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", category: "general", description: "", isPublic: true });
  const [file, setFile] = useState<File | null>(null);

  const { data: docs, isLoading } = useHRDocuments({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
  });
  const upload = useUploadHRDocument();
  const remove = useDeleteHRDocument();

  async function handleUpload() {
    if (!file || !uploadForm.title.trim()) return;
    await upload.mutateAsync({ file, ...uploadForm });
    setShowUpload(false);
    setFile(null);
    setUploadForm({ title: "", category: "general", description: "", isPublic: true });
  }

  const inp = "w-full h-9 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">HR Documents</h2><p className="text-sm text-slate-500 mt-0.5">Company policies, handbooks and forms</p></div>
        {isAdmin && (
          <button type="button" onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/25">
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        )}
      </div>

      {/* Upload form */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Upload HR Document</p>
              <button type="button" onClick={() => setShowUpload(false)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Title *</label><input className={inp} value={uploadForm.title} onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))} placeholder="Document title" /></div>
              <div><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
                <select aria-label="Document category" className={inp} value={uploadForm.category} onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select></div>
              <div className="flex items-end pb-0.5"><label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={uploadForm.isPublic} onChange={(e) => setUploadForm((f) => ({ ...f, isPublic: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-xs font-medium text-slate-600">Visible to all employees</span>
              </label></div>
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">Description</label><input className={inp} value={uploadForm.description} onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description…" /></div>
              <div className="col-span-2"><label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 block">File *</label>
                <label className="flex items-center gap-3 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-white transition-colors">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-500 truncate">{file ? file.name : "Choose file…"}</span>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowUpload(false)} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!file || !uploadForm.title.trim() || upload.isPending} onClick={handleUpload}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {upload.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><FileCheck className="w-4 h-4" />Upload</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-slate-50 border-slate-200 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Documents grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : (docs?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
          <FolderOpen className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No documents found</p>
          {isAdmin && <p className="text-xs text-slate-400 mt-1">Upload the first HR document</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(docs ?? []).map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all overflow-hidden group">
              <div className={cn("h-1.5", (CAT_COLORS[doc.category] ?? "bg-slate-100").split(" ")[0])} />
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{doc.title}</p>
                    {doc.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{doc.description}</p>}
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1.5 inline-block", CAT_COLORS[doc.category] ?? "bg-slate-100 text-slate-600")}>
                      {CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3">{doc.fileName} · Added {formatDate(doc.createdAt)}</p>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => setPreviewId(doc.id)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  {isAdmin && (
                    <button type="button" onClick={() => remove.mutate(doc.id)} disabled={remove.isPending}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {previewId && <DocPreviewModal id={previewId} onClose={() => setPreviewId(null)} />}
      </AnimatePresence>
    </div>
  );
}
