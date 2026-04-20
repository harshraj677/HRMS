"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  ClipboardList,
  Sparkles,
  X,
  MapPin,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

function getNavItems(role: string) {
  if (role === "admin") {
    return [
      {
        group: "Main",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Employees", href: "/dashboard/employees", icon: Users },
        ],
      },
      {
        group: "Time & Attendance",
        items: [
          { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck },
          { label: "Leave Requests", href: "/dashboard/leave", icon: ClipboardList },
          { label: "Attendance Map", href: "/dashboard/attendance-map", icon: MapPin },
        ],
      },
      {
        group: "Insights",
        items: [
          { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
        ],
      },
      {
        group: "Account",
        items: [
          { label: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
      },
    ];
  }

  return [
    {
      group: "Main",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      group: "My Work",
      items: [
        { label: "My Attendance", href: "/dashboard/attendance", icon: CalendarCheck },
        { label: "My Leave Requests", href: "/dashboard/leave", icon: ClipboardList },
        { label: "Apply Leave", href: "/dashboard/leave?apply=1", icon: FileText },
      ],
    },
    {
      group: "Account",
      items: [
        { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
      ],
    },
  ];
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useAuth();
  const navItems = getNavItems(user?.role ?? "employee");
  const initials = user?.fullName?.split(" ").map((n: string) => n[0]).join("").toUpperCase() ?? "?";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-white/10",
        collapsed ? "justify-center px-2" : ""
      )}>
        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-tight whitespace-nowrap">Anvesana</p>
            <p className="text-[10px] text-slate-400 whitespace-nowrap">Innovation & Entrepreneurial</p>
          </div>
        )}
        {onMobileClose && (
          <button onClick={onMobileClose} className="ml-auto text-slate-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-none">
        <TooltipProvider delayDuration={0}>
          {navItems.map((group) => (
            <div key={group.group} className="mb-3">
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.group}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return collapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link href={item.href} onClick={onMobileClose}>
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 mx-auto rounded-xl mb-1 transition-colors duration-150",
                          isActive
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                            : "text-slate-400 hover:bg-white/10 hover:text-white"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Link key={item.href} href={item.href} onClick={onMobileClose}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-colors duration-150 cursor-pointer",
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "text-slate-400 hover:bg-white/10 hover:text-white"
                    )}>
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* User Profile */}
      <div className={cn("border-t border-white/10 p-3", collapsed ? "flex flex-col items-center gap-2" : "")}>
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group",
          collapsed ? "justify-center" : ""
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullName ?? "User"}`} />
            <AvatarFallback className="bg-indigo-600 text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.fullName ?? "Loading..."}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role ?? ""}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors",
            collapsed ? "mt-1 mx-auto" : "ml-auto mt-1"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar — CSS transition for collapse */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 h-full bg-slate-900 border-r border-white/5 z-30 overflow-hidden transition-[width] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar — CSS transition */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-150"
            onClick={onMobileClose}
          />
          <aside className="fixed left-0 top-0 h-full w-[260px] bg-slate-900 border-r border-white/5 z-50 flex flex-col lg:hidden animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
