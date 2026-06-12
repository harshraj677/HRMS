"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell, ChevronDown, User, Settings, LogOut, HelpCircle, CheckCheck, Sun, Moon, Menu,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/search/CommandPalette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/hooks/useNotifications";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard":                  { title: "Dashboard",           description: "Overview & insights" },
  "/dashboard/employees":        { title: "Employees",           description: "Manage your team members" },
  "/dashboard/onboarding":       { title: "Onboarding",          description: "Review and approve employee profiles" },
  "/dashboard/profile":          { title: "My Profile",          description: "Your personal details" },
  "/dashboard/attendance":       { title: "Attendance",          description: "Track and manage attendance" },
  "/dashboard/attendance-map":   { title: "Attendance Map",      description: "Live employee check-in locations" },
  "/dashboard/attendance-review":{ title: "Review Queue",        description: "Review flagged attendance records" },
  "/dashboard/leave":            { title: "Leave Requests",      description: "Review and manage leave applications" },
  "/dashboard/policies":         { title: "Attendance Policies", description: "Configure attendance rules" },
  "/dashboard/performance":      { title: "Performance",         description: "Performance scores, rankings, and insights" },
  "/dashboard/analytics":        { title: "Analytics",           description: "Attendance & performance insights" },
  "/dashboard/settings":         { title: "Settings",            description: "Configure your preferences" },
  "/dashboard/payroll":          { title: "Payroll",             description: "Manage salaries and payroll" },
  "/dashboard/payroll/generate": { title: "Generate Payroll",    description: "Calculate and generate monthly payroll" },
  "/dashboard/my-payroll":       { title: "My Payroll",          description: "Your salary history and payslips" },
  "/dashboard/departments":      { title: "Departments",         description: "Manage company departments" },
  "/dashboard/directory":        { title: "Directory",           description: "Find and connect with colleagues" },
  "/dashboard/org-structure":    { title: "Organization Structure", description: "Visualize reporting lines and team hierarchy" },
  "/dashboard/my-team":          { title: "My Team",             description: "Manage your direct reports" },
  "/dashboard/announcements":    { title: "Announcements",       description: "Company news and updates" },
  "/dashboard/recruitment":      { title: "Recruitment",         description: "Manage jobs and candidates" },
  "/dashboard/helpdesk":         { title: "Helpdesk",            description: "Manage support tickets" },
  "/dashboard/exits":            { title: "Exit Management",     description: "Manage employee exit processes" },
  "/dashboard/tickets":          { title: "My Tickets",          description: "Raise and track support requests" },
  "/dashboard/resignation":      { title: "My Resignation",      description: "Submit and track your exit process" },
  "/dashboard/reports":          { title: "Reports",             description: "Export data as CSV for analysis" },
  "/dashboard/activity-logs":    { title: "Activity Logs",       description: "Track user actions across the platform" },
  "/dashboard/security":         { title: "Security",            description: "Login history and session activity" },
  "/dashboard/events":           { title: "Events",              description: "Workshops, hackathons and demo days" },
  "/dashboard/system-health":    { title: "System Health",       description: "Platform status and key metrics" },
  "/dashboard/mentor":           { title: "Mentor Reviews",      description: "Score and review startup progress" },
  "/dashboard/startups":         { title: "Startups",            description: "Incubation program management" },
};

const TYPE_DOT: Record<string, string> = {
  leave:               "bg-indigo-500",
  leave_approved:      "bg-emerald-500",
  leave_rejected:      "bg-red-500",
  welcome:             "bg-violet-500",
  warning:             "bg-amber-500",
  info:                "bg-slate-400",
  onboarding_invite:   "bg-violet-500",
  profile_submitted:   "bg-indigo-500",
  profile_resubmitted: "bg-indigo-500",
  onboarding_approved: "bg-emerald-500",
  onboarding_rejected: "bg-red-500",
};

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";
  const { theme, setTheme } = useTheme();

  const { data: notifications = [] } = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const badgeCount  = unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  const currentPage = Object.keys(pageTitles)
    .reverse()
    .find((key) => pathname === key || (key !== "/dashboard" && pathname.startsWith(key)));
  const pageInfo = currentPage ? pageTitles[currentPage] : { title: "Dashboard", description: "" };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200/80 flex items-center px-4 lg:px-6 gap-4 shrink-0">
      {/* Hamburger menu (mobile/tablet) */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation menu"
        onClick={() => setNavOpen(true)}
        className="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 shrink-0 lg:hidden"
      >
        <Menu className="w-4 h-4" />
      </Button>
      <MobileNavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Mobile brand */}
      <div className="flex items-center gap-2 lg:hidden no-select">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center overflow-hidden">
          <img
            src="/logo.jpg"
            alt="AnveCore"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
        <span className="font-bold text-slate-900 text-sm">AnveCore</span>
      </div>

      {/* Desktop page title */}
      <div className="hidden lg:block">
        <h1 className="text-[15px] font-semibold text-slate-900 leading-tight">{pageInfo.title}</h1>
        <p className="text-xs text-slate-400 leading-tight">{pageInfo.description}</p>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <CommandPalette isAdmin={user?.role === "admin"} />

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 shrink-0"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 shrink-0"
          >
            <Bell className="w-4 h-4" />
            {badgeCount && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-0.5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {badgeCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80" align="end">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>
          <DropdownMenuSeparator className="my-0" />

          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-600">All caught up</p>
                <p className="text-xs text-slate-400 mt-0.5">No new notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!n.isRead) markRead.mutate(n.id);
                    if (n.link) router.push(n.link);
                  }}
                  className={cn(
                    "flex items-start gap-3 px-3 py-3 cursor-pointer rounded-none focus:rounded-none",
                    !n.isRead && "bg-indigo-50/60 hover:bg-indigo-50"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      TYPE_DOT[n.type] ?? TYPE_DOT.info,
                      n.isRead && "opacity-40"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[13px] text-slate-800 leading-snug", !n.isRead && "font-semibold")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-9 px-2 rounded-xl hover:bg-slate-100 min-w-0 shrink-0"
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.fullName ?? "Loading..."}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role ?? ""}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52" align="end">
          <DropdownMenuLabel>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{user?.fullName ?? ""}</p>
              <p className="text-xs text-slate-400 font-normal">{user?.email ?? ""}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href={user?.role === "admin" ? "/dashboard/employees" : "/dashboard/profile"}
              className="cursor-pointer"
            >
              <User className="w-4 h-4" />
              My Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="cursor-pointer">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HelpCircle className="w-4 h-4" />
            Help & Support
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
