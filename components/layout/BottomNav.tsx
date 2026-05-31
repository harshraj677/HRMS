"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  UserCircle,
  Users,
  Banknote,
  BriefcaseBusiness,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const adminItems = [
  { label: "Home",       href: "/dashboard",           icon: LayoutDashboard },
  { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck   },
  { label: "Leave",      href: "/dashboard/leave",      icon: ClipboardList   },
  { label: "Team",       href: "/dashboard/employees",  icon: Users           },
  { label: "Analytics",  href: "/dashboard/analytics",  icon: BarChart3       },
];

const employeeItems = [
  { label: "Home",       href: "/dashboard",            icon: LayoutDashboard },
  { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck   },
  { label: "Leave",      href: "/dashboard/leave",      icon: ClipboardList   },
  { label: "Payroll",    href: "/dashboard/my-payroll", icon: Banknote        },
  { label: "Profile",    href: "/dashboard/profile",    icon: UserCircle      },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: user } = useAuth();
  const items = user?.role === "admin" ? adminItems : employeeItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-slate-200 pb-safe no-select">
      <div className="flex items-stretch h-[60px]">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 relative",
                "active:opacity-70 transition-opacity duration-75"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-600" />
              )}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-7 rounded-xl transition-all duration-150",
                  isActive ? "bg-indigo-50" : ""
                )}
              >
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] transition-colors duration-150",
                    isActive ? "text-indigo-600" : "text-slate-400"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] leading-none font-medium transition-colors duration-150",
                  isActive ? "text-indigo-600 font-semibold" : "text-slate-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
