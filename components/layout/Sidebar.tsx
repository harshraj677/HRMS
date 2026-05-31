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
  UserCircle,
  ClipboardList,
  MapPin,
  FileText,
  Rocket,
  Banknote,
  Receipt,
  Building2,
  BookUser,
  Megaphone,
  UsersRound,
  BriefcaseBusiness,
  HeadphonesIcon,
  LogOut as ExitIcon,
  Activity,
  ShieldCheck,
  Calendar,
  Star,
  ServerIcon,
  TicketIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

type NavItem = { label: string; href: string; icon: React.ElementType };
type NavGroup = { group: string; items: NavItem[] };

function getNavItems(role: string): NavGroup[] {
  if (role === "admin") {
    return [
      {
        group: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
      },
      {
        group: "People",
        items: [
          { label: "Employees", href: "/dashboard/employees", icon: Users },
          { label: "Directory", href: "/dashboard/directory", icon: BookUser },
          { label: "My Team", href: "/dashboard/my-team", icon: UsersRound },
          { label: "Departments", href: "/dashboard/departments", icon: Building2 },
        ],
      },
      {
        group: "Time & Leave",
        items: [
          { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck },
          { label: "Leave Requests", href: "/dashboard/leave", icon: ClipboardList },
          { label: "Attendance Map", href: "/dashboard/attendance-map", icon: MapPin },
          { label: "Review Queue", href: "/dashboard/attendance-review", icon: Activity },
          { label: "Geofences", href: "/dashboard/geofences", icon: MapPin },
          { label: "Policies", href: "/dashboard/policies", icon: ShieldCheck },
        ],
      },
      {
        group: "Payroll",
        items: [
          { label: "Payroll", href: "/dashboard/payroll", icon: Banknote },
          { label: "Generate", href: "/dashboard/payroll/generate", icon: Receipt },
        ],
      },
      {
        group: "Engagement",
        items: [
          { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
          { label: "Recruitment", href: "/dashboard/recruitment", icon: BriefcaseBusiness },
          { label: "Helpdesk", href: "/dashboard/helpdesk", icon: HeadphonesIcon },
          { label: "Exit Management", href: "/dashboard/exits", icon: ExitIcon },
        ],
      },
      {
        group: "Incubation",
        items: [
          { label: "Startups", href: "/dashboard/startups", icon: Rocket },
          { label: "Events", href: "/dashboard/events", icon: Calendar },
          { label: "Mentor Reviews", href: "/dashboard/mentor", icon: Star },
        ],
      },
      {
        group: "Insights",
        items: [
          { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
          { label: "Reports", href: "/dashboard/reports", icon: FileText },
          { label: "Activity Logs", href: "/dashboard/activity-logs", icon: Activity },
          { label: "System Health", href: "/dashboard/system-health", icon: ServerIcon },
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
      group: "Overview",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      group: "My Work",
      items: [
        { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck },
        { label: "Leave Requests", href: "/dashboard/leave", icon: ClipboardList },
        { label: "My Payroll", href: "/dashboard/my-payroll", icon: Banknote },
        { label: "My Profile", href: "/dashboard/profile", icon: UserCircle },
      ],
    },
    {
      group: "Company",
      items: [
        { label: "Directory", href: "/dashboard/directory", icon: BookUser },
        { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
        { label: "Events", href: "/dashboard/events", icon: Calendar },
        { label: "Helpdesk", href: "/dashboard/tickets", icon: TicketIcon },
        { label: "Resignation", href: "/dashboard/resignation", icon: ExitIcon },
      ],
    },
    {
      group: "Account",
      items: [
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
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
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed left-0 top-0 h-full z-30 overflow-hidden transition-[width] duration-200 ease-in-out",
        "bg-white border-r border-slate-200/80",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 h-16 border-b border-slate-100 px-4 shrink-0",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden bg-indigo-600 shadow-sm">
          <img
            src="/logo.jpg"
            alt="Anvesync"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-slate-900 text-[15px] tracking-tight leading-none">
              Anvesync
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none tracking-wide uppercase">
              HRMS Platform
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-none">
        <TooltipProvider delayDuration={0}>
          <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
            {navItems.map((group) => (
              <div key={group.group} className="mb-1">
                {!collapsed && (
                  <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {group.group}
                  </p>
                )}
                {collapsed && <div className="h-2" />}
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Fragment key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={item.href}>
                              <div
                                className={cn(
                                  "flex items-center justify-center w-10 h-10 mx-auto rounded-xl mb-0.5 transition-all duration-150",
                                  active
                                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                )}
                              >
                                <Icon className="w-[18px] h-[18px]" />
                              </div>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Link href={item.href}>
                          <div
                            className={cn(
                              "flex items-center gap-2.5 h-9 px-2.5 rounded-lg mb-0.5 text-[13px] font-medium transition-all duration-150 cursor-pointer group",
                              active
                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-4 h-4 shrink-0 transition-colors",
                                active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                            {active && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            )}
                          </div>
                        </Link>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </nav>

      {/* User footer */}
      <div className={cn("border-t border-slate-100 p-3 shrink-0", collapsed && "px-2")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-slate-100 hover:ring-indigo-200 transition-all">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-semibold">{user?.fullName}</p>
                <p className="text-xs capitalize text-slate-400">{user?.role}</p>
              </TooltipContent>
            </Tooltip>
            <button
              type="button"
              aria-label="Sign out"
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-slate-100">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                {user?.fullName ?? "Loading..."}
              </p>
              <p className="text-[11px] text-slate-400 capitalize leading-tight">
                {user?.role ?? ""}
              </p>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </aside>
  );
}
