"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Filter, Download,
  UserCheck, UserX, ShieldCheck, ShieldX, Eye, MapPin, Smartphone,
  CalendarDays, AlertTriangle, Loader2, RefreshCw, Clock, Wifi,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import {
  useReviewQueue, useReviewRecord, useBulkReview, useAttendanceAuditTrail,
  type ReviewQueueItem,
} from "@/hooks/useAttendance";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────────

function ReviewStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    flagged:  { cls: "bg-amber-50  border-amber-200  text-amber-700",  label: "Flagged"  },
    approved: { cls: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Approved" },
    rejected: { cls: "bg-red-50    border-red-200    text-red-700",    label: "Rejected" },
    auto:     { cls: "bg-slate-50  border-slate-200  text-slate-500",  label: "Auto"     },
  };
  const c = cfg[status] ?? cfg.auto;
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border", c.cls)}>
      {c.label}
    </span>
  );
}

function ScoreChip({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-xs text-slate-300">–</span>;
  const color = value >= 70 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : value >= 40 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-lg border", color)}>
      {Math.round(value)}<span className="font-normal opacity-70">%</span>
    </span>
  );
}

// ── Review dialog ──────────────────────────────────────────────────────────

function ReviewDialog({
  record,
  onClose,
}: { record: ReviewQueueItem; onClose: () => void }) {
  const [action, setAction] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const reviewMut = useReviewRecord();
  const { data: trail, isLoading: trailLoading } = useAttendanceAuditTrail(record.id);

  const handleSubmit = async () => {
    if (!action || !reason.trim()) { toast.error("Select an action and provide a reason."); return; }
    await reviewMut.mutateAsync({ id: record.id, action, reason: reason.trim() });
    onClose();
  };

  const fmtTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "–";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Review Attendance Record</h2>
            <p className="text-xs text-slate-500 mt-0.5">{record.fullName} · {formatDate(record.date)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close review dialog" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-100 text-slate-400">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Evidence summary */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Check In", value: fmtTime(record.checkIn) },
              { label: "Check Out", value: fmtTime(record.checkOut) },
              { label: "Hours", value: record.hours != null ? `${record.hours}h` : "–" },
              { label: "Distance", value: record.distanceFromOffice != null ? `${Math.round(record.distanceFromOffice)}m` : "–" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Verification scores */}
          <div className="flex flex-wrap gap-2">
            {record.faceScore != null && (
              <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-1.5 text-xs">
                {record.faceVerified ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> : <UserX className="w-3.5 h-3.5 text-amber-600" />}
                <span className="text-slate-600">Face</span>
                <ScoreChip value={record.faceScore} label="face" />
              </div>
            )}
            {record.livenessScore != null && (
              <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-1.5 text-xs">
                {record.livenessResult === "passed" ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldX className="w-3.5 h-3.5 text-amber-600" />}
                <span className="text-slate-600">Liveness</span>
                <ScoreChip value={record.livenessScore} label="liveness" />
              </div>
            )}
            {record.isRemote && (
              <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-3 py-1.5 text-xs text-amber-700">
                <Wifi className="w-3.5 h-3.5" /> Remote
              </div>
            )}
            {record.policyResult && (
              <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5" />
                <span>{(record.policyResult as any).status ?? "–"}</span>
              </div>
            )}
          </div>

          {/* Photo */}
          {record.checkInPhoto && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Check-in Selfie</p>
              <img src={record.checkInPhoto} alt="Check-in selfie" className="w-32 h-24 object-cover rounded-xl border border-slate-200" />
            </div>
          )}

          {/* Override note */}
          {record.overrideNote && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <span className="font-semibold">Employee note: </span>{record.overrideNote}
            </div>
          )}

          {/* Audit trail */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Audit Trail</p>
            {trailLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : (
              <div className="space-y-2">
                {(!trail || trail.length === 0) && (
                  <p className="text-xs text-slate-400">No audit entries yet.</p>
                )}
                {trail?.map((entry: any) => (
                  <div key={entry.id} className="flex gap-2 text-xs">
                    <span className="w-20 shrink-0 text-slate-400">{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className={cn("font-semibold capitalize w-20 shrink-0",
                      entry.action === "approved" && "text-emerald-700",
                      entry.action === "rejected" && "text-red-700",
                      entry.action === "flagged" && "text-amber-700",
                    )}>{entry.action}</span>
                    <span className="text-slate-600 truncate">{entry.actor?.fullName ?? "System"}</span>
                    {entry.reason && <span className="text-slate-400 truncate">— {entry.reason}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Your decision</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAction("approved")}
                className={cn("flex-1 h-9 rounded-xl text-xs font-semibold border transition-all",
                  action === "approved" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600 hover:border-emerald-400")}>
                ✓ Approve
              </button>
              <button type="button" onClick={() => setAction("rejected")}
                className={cn("flex-1 h-9 rounded-xl text-xs font-semibold border transition-all",
                  action === "rejected" ? "bg-red-600 text-white border-red-600" : "border-slate-200 text-slate-600 hover:border-red-400")}>
                ✕ Reject
              </button>
            </div>
            <textarea rows={2} placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            <button type="button" onClick={handleSubmit} disabled={!action || !reason.trim() || reviewMut.isPending}
              className="w-full h-10 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {reviewMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AttendanceReviewPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <ReviewQueueContent />
    </RoleGuard>
  );
}

function ReviewQueueContent() {
  const [page, setPage] = useState(1);
  const [reviewStatus, setReviewStatus] = useState("flagged");
  const [department, setDepartment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minFaceScore, setMinFaceScore] = useState<number | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingRecord, setReviewingRecord] = useState<ReviewQueueItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState<"approved" | "rejected" | null>(null);

  const { data, isLoading, refetch } = useReviewQueue({
    page, limit: 20, reviewStatus, department: department || undefined,
    dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
    minFaceScore,
  });
  const bulkReview = useBulkReview();

  const allIds = data?.queue.map((r) => r.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const handleBulkSubmit = async () => {
    if (!showBulkDialog || !bulkReason.trim()) return;
    await bulkReview.mutateAsync({
      ids: [...selectedIds],
      action: showBulkDialog,
      reason: bulkReason.trim(),
    });
    setSelectedIds(new Set());
    setShowBulkDialog(null);
    setBulkReason("");
  };

  const handleExport = () => {
    const params = new URLSearchParams({ format: "csv", includeEvidence: "true" });
    if (reviewStatus) params.set("reviewStatus", reviewStatus);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/attendance/export?${params.toString()}`, "_blank");
  };

  const inp = "h-8 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Review Queue</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Review flagged records, approve overrides, and export evidence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => refetch()}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button type="button" onClick={handleExport}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={cn("flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium transition-colors",
              showFilters ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { val: "flagged",  label: "Flagged" },
          { val: "approved", label: "Approved" },
          { val: "rejected", label: "Rejected" },
          { val: "auto",     label: "Auto-approved" },
        ].map(({ val, label }) => (
          <button key={val} type="button" onClick={() => { setReviewStatus(val); setPage(1); setSelectedIds(new Set()); }}
            className={cn("h-8 px-4 rounded-xl text-xs font-semibold border transition-all",
              reviewStatus === val
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300")}>
            {label}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-slate-100 rounded-2xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label htmlFor="rq-from" className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">From</label>
                <input id="rq-from" type="date" title="Filter from date" className={inp + " w-full"} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
              </div>
              <div>
                <label htmlFor="rq-to" className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">To</label>
                <input id="rq-to" type="date" title="Filter to date" className={inp + " w-full"} value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
              </div>
              <div>
                <label htmlFor="rq-dept" className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Department</label>
                <input id="rq-dept" type="text" placeholder="e.g. Engineering" className={inp + " w-full"} value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }} />
              </div>
              <div>
                <label htmlFor="rq-face" className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Max Face Score</label>
                <input id="rq-face" type="number" min={0} max={100} placeholder="e.g. 50" className={inp + " w-full"}
                  value={minFaceScore ?? ""} onChange={e => { setMinFaceScore(e.target.value ? Number(e.target.value) : undefined); setPage(1); }} />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setDepartment(""); setMinFaceScore(undefined); setPage(1); }}
                  className="h-8 px-3 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 w-full transition-colors">
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
          <span className="text-xs font-semibold text-indigo-700">{selectedIds.size} selected</span>
          <button type="button" onClick={() => setShowBulkDialog("approved")}
            className="flex items-center gap-1 h-7 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
            <CheckCircle2 className="w-3 h-3" /> Approve All
          </button>
          <button type="button" onClick={() => setShowBulkDialog("rejected")}
            className="flex items-center gap-1 h-7 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
            <XCircle className="w-3 h-3" /> Reject All
          </button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-indigo-600 hover:underline">
            Clear selection
          </button>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : !data?.queue.length ? (
          <div className="flex flex-col items-center py-16">
            <CalendarDays className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">No records in this queue</p>
            <p className="text-xs text-slate-400 mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-10 px-4 py-3 text-left" scope="col">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      title="Select all" aria-label="Select all records"
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  </th>
                  {["Employee", "Date", "Check-in", "Face", "Liveness", "Policy", "Status", "Actions"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.queue.map((record) => (
                  <>
                    <tr key={record.id}
                      className={cn("hover:bg-slate-50/70 transition-colors", selectedIds.has(record.id) && "bg-indigo-50/40")}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(record.id)} onChange={() => toggleOne(record.id)}
                          title={`Select ${record.fullName}`} aria-label={`Select ${record.fullName}`}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-semibold text-slate-800">{record.fullName}</p>
                        <p className="text-xs text-slate-400">{record.department ?? ""}</p>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(record.date)}</td>
                      <td className="px-3 py-3 text-sm text-slate-500 font-mono whitespace-nowrap">
                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "–"}
                      </td>
                      <td className="px-3 py-3"><ScoreChip value={record.faceScore} label="face" /></td>
                      <td className="px-3 py-3"><ScoreChip value={record.livenessScore} label="liveness" /></td>
                      <td className="px-3 py-3">
                        {record.policyResult ? (
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            (record.policyResult as any).status === "ok" ? "bg-emerald-50 text-emerald-700"
                              : (record.policyResult as any).status === "remote_ok" ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700")}>
                            {(record.policyResult as any).status ?? "–"}
                          </span>
                        ) : <span className="text-xs text-slate-300">–</span>}
                      </td>
                      <td className="px-3 py-3"><ReviewStatusBadge status={record.reviewStatus} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setReviewingRecord(record)}
                            className="h-7 px-2.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-colors">
                            Review
                          </button>
                          <button type="button" onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">
                            {expandedId === record.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded evidence row */}
                    {expandedId === record.id && (
                      <tr key={record.id + "_detail"} className="bg-slate-50/60">
                        <td colSpan={9} className="px-8 py-4">
                          <div className="flex flex-wrap gap-4 text-xs">
                            {record.checkInPhoto && (
                              <img src={record.checkInPhoto} alt="Selfie" className="w-20 h-15 object-cover rounded-lg border border-slate-200" />
                            )}
                            <div className="space-y-1">
                              {record.device && <p className="flex items-center gap-1 text-slate-500"><Smartphone className="w-3 h-3" /> {record.device.slice(0, 50)}</p>}
                              {record.distanceFromOffice != null && <p className="flex items-center gap-1 text-slate-500"><MapPin className="w-3 h-3" /> {Math.round(record.distanceFromOffice)}m from office</p>}
                              {record.overrideNote && <p className="flex items-start gap-1 text-amber-700"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {record.overrideNote}</p>}
                              {record.reviewNotes && <p className="text-slate-600 italic">&quot;{record.reviewNotes}&quot;</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {!isLoading && !!data?.queue.length && (
          <div className="md:hidden divide-y divide-slate-50">
            {data.queue.map((record) => {
              const expanded = expandedId === record.id;
              return (
                <div key={record.id} className={cn("p-4", selectedIds.has(record.id) && "bg-indigo-50/40")}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selectedIds.has(record.id)} onChange={() => toggleOne(record.id)}
                      title={`Select ${record.fullName}`} aria-label={`Select ${record.fullName}`}
                      className="w-3.5 h-3.5 mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{record.fullName}</p>
                        <ReviewStatusBadge status={record.reviewStatus} />
                      </div>
                      <p className="text-xs text-slate-400">{record.department ?? ""}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="whitespace-nowrap">{formatDate(record.date)}</span>
                        <span className="font-mono whitespace-nowrap">
                          {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "–"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">Face <ScoreChip value={record.faceScore} label="face" /></div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">Liveness <ScoreChip value={record.livenessScore} label="liveness" /></div>
                        {record.policyResult && (
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            (record.policyResult as any).status === "ok" ? "bg-emerald-50 text-emerald-700"
                              : (record.policyResult as any).status === "remote_ok" ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700")}>
                            {(record.policyResult as any).status ?? "–"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button type="button" onClick={() => setReviewingRecord(record)}
                      className="flex-1 h-8 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors">
                      Review
                    </button>
                    <button type="button" onClick={() => setExpandedId(expanded ? null : record.id)}
                      className="h-8 px-3 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors">
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
                      {record.checkInPhoto && (
                        <img src={record.checkInPhoto} alt="Selfie" className="w-20 h-15 object-cover rounded-lg border border-slate-200" />
                      )}
                      <div className="space-y-1">
                        {record.device && <p className="flex items-center gap-1 text-slate-500"><Smartphone className="w-3 h-3" /> {record.device.slice(0, 50)}</p>}
                        {record.distanceFromOffice != null && <p className="flex items-center gap-1 text-slate-500"><MapPin className="w-3 h-3" /> {Math.round(record.distanceFromOffice)}m from office</p>}
                        {record.overrideNote && <p className="flex items-start gap-1 text-amber-700"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {record.overrideNote}</p>}
                        {record.reviewNotes && <p className="text-slate-600 italic">&quot;{record.reviewNotes}&quot;</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">{data.total} total · Page {data.page}/{data.totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="h-7 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                ← Prev
              </button>
              <button type="button" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
                className="h-7 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review dialog */}
      {reviewingRecord && <ReviewDialog record={reviewingRecord} onClose={() => setReviewingRecord(null)} />}

      {/* Bulk reason dialog */}
      {showBulkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowBulkDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 capitalize">{showBulkDialog} {selectedIds.size} record(s)</h3>
            <textarea rows={3} placeholder="Reason (required)" value={bulkReason} onChange={e => setBulkReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={handleBulkSubmit} disabled={!bulkReason.trim() || bulkReview.isPending}
                className={cn("flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50",
                  showBulkDialog === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>
                {bulkReview.isPending ? "Saving…" : `Confirm ${showBulkDialog}`}
              </button>
              <button type="button" onClick={() => setShowBulkDialog(null)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
