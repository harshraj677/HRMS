"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { getNavItems } from "@/components/layout/Sidebar";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useAuth();
  const navItems = getNavItems(user?.role ?? "employee");
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    onClose();
    router.push("/login");
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-white shadow-2xl flex flex-col"
          >
            {/* Logo */}
            <div className="flex items-center justify-between gap-3 h-16 border-b border-slate-100 px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden bg-indigo-600 shadow-sm">
                  <img
                    src="/logo.jpg"
                    alt="AnveCore"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-[15px] tracking-tight leading-none">AnveCore HRMS</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none tracking-wide uppercase">HR Management</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-none">
              {navItems.map((group) => (
                <div key={group.group} className="mb-1">
                  <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {group.group}
                  </p>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} onClick={onClose}>
                        <div
                          className={cn(
                            "flex items-center gap-2.5 h-10 px-2.5 rounded-lg mb-0.5 text-[13px] font-medium transition-all duration-150",
                            active
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0",
                              active ? "text-indigo-600" : "text-slate-400"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                          {active && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* User footer */}
            <div className="border-t border-slate-100 p-3 shrink-0">
              <div className="flex items-center gap-2.5 p-2 rounded-xl">
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-slate-100">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                    {user?.fullName ?? "Loading..."}
                  </p>
                  <p className="text-[11px] text-slate-400 capitalize leading-tight">{user?.role ?? ""}</p>
                </div>
                <button
                  type="button"
                  aria-label="Sign out"
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
