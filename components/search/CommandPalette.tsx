"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Users, Building2, Ticket, Briefcase, FileText,
  Megaphone, LayoutDashboard, X, ArrowRight,
  CalendarCheck, Banknote, LogOut, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  label: string;
  sub?: string;
  href: string;
  icon: typeof Search;
  color: string;
}

// Static page navigation results
const PAGES: Result[] = [
  { id: "dashboard",     label: "Dashboard",        href: "/dashboard",                    icon: LayoutDashboard, color: "text-indigo-500" },
  { id: "employees",     label: "Employees",         href: "/dashboard/employees",          icon: Users,           color: "text-indigo-500" },
  { id: "attendance",    label: "Attendance",        href: "/dashboard/attendance",         icon: CalendarCheck,   color: "text-emerald-500" },
  { id: "leave",         label: "Leave Requests",    href: "/dashboard/leave",              icon: FileText,        color: "text-amber-500" },
  { id: "payroll",       label: "Payroll",           href: "/dashboard/payroll",            icon: Banknote,        color: "text-violet-500" },
  { id: "recruitment",   label: "Recruitment",       href: "/dashboard/recruitment",        icon: Briefcase,       color: "text-sky-500" },
  { id: "helpdesk",      label: "Helpdesk",          href: "/dashboard/helpdesk",           icon: Ticket,          color: "text-rose-500" },
  { id: "departments",   label: "Departments",       href: "/dashboard/departments",        icon: Building2,       color: "text-teal-500" },
  { id: "directory",     label: "Directory",         href: "/dashboard/directory",          icon: Users,           color: "text-indigo-500" },
  { id: "org-chart",     label: "Org Chart",         href: "/dashboard/org-chart",         icon: Building2,       color: "text-violet-500" },
  { id: "announcements", label: "Announcements",     href: "/dashboard/announcements",     icon: Megaphone,       color: "text-amber-500" },
  { id: "hr-documents",  label: "HR Documents",      href: "/dashboard/hr-documents",      icon: FileText,        color: "text-sky-500" },
  { id: "analytics",     label: "Analytics",         href: "/dashboard/analytics",         icon: LayoutDashboard, color: "text-indigo-500" },
  { id: "reports",       label: "Reports",           href: "/dashboard/reports",           icon: FileText,        color: "text-emerald-500" },
  { id: "profile",       label: "My Profile",        href: "/dashboard/profile",           icon: UserCircle,      color: "text-indigo-500" },
  { id: "tickets",       label: "My Tickets",        href: "/dashboard/tickets",           icon: Ticket,          color: "text-rose-500" },
  { id: "my-payroll",    label: "My Payroll",        href: "/dashboard/my-payroll",        icon: Banknote,        color: "text-violet-500" },
  { id: "resignation",   label: "Resignation",       href: "/dashboard/resignation",       icon: LogOut,          color: "text-red-500" },
];

interface Props { isAdmin?: boolean }

export function CommandPalette({ isAdmin }: Props) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [focused, setFocused] = useState(0);
  const [dynResults, setDynResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
      setDynResults([]);
      setFocused(0);
    }
  }, [open]);

  // Fetch dynamic results (employees, etc.)
  const fetchDynamic = useCallback(async (q: string) => {
    if (q.length < 2) { setDynResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/org/directory?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        const emps: Result[] = (json.employees ?? []).slice(0, 5).map((e: any) => ({
          id:    `emp-${e.id}`,
          label: e.fullName,
          sub:   `${e.position ?? ""} · ${e.department ?? ""}`.replace(/^·\s|·\s$/, ""),
          href:  isAdmin ? `/dashboard/employees/${e.id}` : `/dashboard/directory`,
          icon:  Users,
          color: "text-indigo-500",
        }));
        setDynResults(emps);
      }
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, [isAdmin]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchDynamic(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchDynamic]);

  // Filtered page results
  const filteredPages = query
    ? PAGES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : PAGES.slice(0, 8);

  const allResults: Result[] = [
    ...dynResults,
    ...filteredPages.slice(0, Math.max(0, 8 - dynResults.length)),
  ];

  // Keyboard navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, 0));
    } else if (e.key === "Enter") {
      const r = allResults[focused];
      if (r) { router.push(r.href); setOpen(false); }
    }
  }

  return (
    <>
      {/* Trigger button for TopNav */}
      <button
        type="button"
        aria-label="Open global search"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm text-slate-500 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search…</span>
        <span className="ml-2 text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">⌘K</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[12%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mx-4">
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
                  {searching ? (
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <input
                    ref={inputRef}
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Search pages, employees, modules…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setFocused(0); }}
                    onKeyDown={onKeyDown}
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
                      className="w-5 h-5 rounded text-slate-400 hover:text-slate-600 flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <kbd className="text-[10px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">Esc</kbd>
                </div>

                {/* Results */}
                <div className="max-h-72 overflow-y-auto">
                  {allResults.length === 0 && query.length >= 2 && !searching ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <Search className="w-8 h-8 text-slate-200 mb-2" />
                      <p className="text-sm text-slate-400">No results for &quot;{query}&quot;</p>
                    </div>
                  ) : (
                    <>
                      {dynResults.length > 0 && query && (
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Employees</p>
                      )}
                      {dynResults.map((r, i) => <ResultRow key={r.id} r={r} focused={focused === i} onSelect={() => { router.push(r.href); setOpen(false); }} />)}

                      {filteredPages.length > 0 && (
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                          {query ? "Pages" : "Quick Navigation"}
                        </p>
                      )}
                      {filteredPages.slice(0, Math.max(0, 8 - dynResults.length)).map((r, i) => {
                        const globalIdx = dynResults.length + i;
                        return <ResultRow key={r.id} r={r} focused={focused === globalIdx} onSelect={() => { router.push(r.href); setOpen(false); }} />;
                      })}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">↑↓</kbd> navigate</span>
                  <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">↵</kbd> open</span>
                  <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Esc</kbd> close</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ResultRow({ r, focused, onSelect }: { r: Result; focused: boolean; onSelect: () => void }) {
  const Icon = r.icon;
  return (
    <button type="button" key={r.id} onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
        focused ? "bg-indigo-50" : "hover:bg-slate-50"
      )}>
      <div className={cn("w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0", r.color)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
        {r.sub && <p className="text-xs text-slate-400 truncate">{r.sub}</p>}
      </div>
      {focused && <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
    </button>
  );
}
