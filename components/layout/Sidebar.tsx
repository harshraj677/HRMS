"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
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
  MapPin,
  FileText,
  Rocket,
  Banknote,
  Receipt,
  Building2,
  Network,
  BookUser,
  Megaphone,
  UsersRound,
  BriefcaseBusiness,
  HeadphonesIcon,
  FolderOpen,
  LogOut as ExitIcon,
  GitMerge,
  TicketIcon,
  Activity,
  ShieldCheck,
  Bot,
  Calendar,
  GraduationCap,
  ServerIcon,
  Star,
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
        group: "Organisation",
        items: [
          { label: "Departments",   href: "/dashboard/departments",  icon: Building2 },
          { label: "Org Chart",     href: "/dashboard/org-chart",    icon: Network },
          { label: "Directory",     href: "/dashboard/directory",    icon: BookUser },
          { label: "My Team",       href: "/dashboard/my-team",      icon: UsersRound },
          { label: "Announcements", href: "/dashboard/announcements",icon: Megaphone },
        ],
      },
      {
        group: "Payroll",
        items: [
          { label: "Payroll",          href: "/dashboard/payroll",          icon: Banknote },
          { label: "Generate Payroll", href: "/dashboard/payroll/generate", icon: Receipt },
        ],
      },
      {
        group: "Recruitment",
        items: [
          { label: "Recruitment",   href: "/dashboard/recruitment",  icon: BriefcaseBusiness },
          { label: "HR Documents",  href: "/dashboard/hr-documents", icon: FolderOpen },
          { label: "Helpdesk",      href: "/dashboard/helpdesk",     icon: HeadphonesIcon },
          { label: "Exit Mgmt",     href: "/dashboard/exits",        icon: ExitIcon },
        ],
      },
      {
        group: "Incubation",
        items: [
          { label: "Startups",   href: "/dashboard/startups", icon: Rocket },
          { label: "Events",     href: "/dashboard/events",   icon: Calendar },
          { label: "Training",   href: "/dashboard/training", icon: GraduationCap },
        ],
      },
      {
        group: "Insights",
        items: [
          { label: "Analytics",      href: "/dashboard/analytics",      icon: BarChart3 },
          { label: "Reports",        href: "/dashboard/reports",        icon: FileText },
          { label: "Activity Logs",  href: "/dashboard/activity-logs",  icon: Activity },
          { label: "System Health",  href: "/dashboard/system-health",  icon: ServerIcon },
        ],
      },
      {
        group: "AI",
        items: [
          { label: "AI Assistant",  href: "/dashboard/ai-assistant", icon: Bot },
          { label: "AI Insights",   href: "/dashboard/ai-insights",  icon: Sparkles },
        ],
      },
      {
        group: "Mentoring",
        items: [
          { label: "Mentor Reviews", href: "/dashboard/mentor", icon: Star },
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
        { label: "My Attendance",    href: "/dashboard/attendance",     icon: CalendarCheck },
        { label: "My Leave Requests",href: "/dashboard/leave",          icon: ClipboardList },
        { label: "Apply Leave",      href: "/dashboard/leave?apply=1",  icon: FileText },
        { label: "My Payroll",       href: "/dashboard/my-payroll",     icon: Banknote },
      ],
    },
    {
      group: "Company",
      items: [
        { label: "Directory",      href: "/dashboard/directory",     icon: BookUser },
        { label: "Org Chart",      href: "/dashboard/org-chart",     icon: Network },
        { label: "Announcements",  href: "/dashboard/announcements", icon: Megaphone },
        { label: "HR Documents",   href: "/dashboard/hr-documents",  icon: FolderOpen },
        { label: "Events",         href: "/dashboard/events",        icon: Calendar },
        { label: "Training",       href: "/dashboard/training",      icon: GraduationCap },
        { label: "My Referrals",   href: "/dashboard/my-referrals",  icon: GitMerge },
        { label: "Tickets",        href: "/dashboard/tickets",       icon: TicketIcon },
        { label: "Resignation",    href: "/dashboard/resignation",   icon: ExitIcon },
      ],
    },
    {
      group: "AI",
      items: [
        { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
      ],
    },
    {
      group: "Account",
      items: [
        { label: "Profile",  href: "/dashboard/profile",  icon: UserCircle },
        { label: "Security", href: "/dashboard/security", icon: ShieldCheck },
      ],
    },
  ];
}

export function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useAuth();
  const navItems = getNavItems(user?.role ?? "employee");
  const initials = user?.fullName?.split(" ").map((n: string) => n[0]).join("").toUpperCase() ?? "?";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 h-full bg-slate-900 border-r border-white/5 z-30 overflow-hidden transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-white/10",
        collapsed ? "justify-center px-2" : ""
      )}>
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 bg-white">
          <img src="/logo.jpg" alt="Anvesync Logo" className="w-[120%] h-[120%] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-xl tracking-wide leading-tight whitespace-nowrap">Anvesync</p>
          </div>
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

                return (
                  <Fragment key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
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
                      <Link href={item.href}>
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
                    )}
                  </Fragment>
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
              type="button"
              aria-label="Sign out"
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors",
            collapsed ? "mt-1 mx-auto" : "ml-auto mt-1"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
