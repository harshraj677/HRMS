"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const adminItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck },
  { label: "Leave", href: "/dashboard/leave", icon: ClipboardList },
  { label: "Team", href: "/dashboard/employees", icon: Users },
];

const employeeItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck },
  { label: "Leave", href: "/dashboard/leave", icon: ClipboardList },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: user } = useAuth();
  const items = user?.role === "admin" ? adminItems : employeeItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe no-select">
      <div className="flex items-stretch justify-around h-16">
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
                "flex flex-col items-center justify-center gap-1 flex-1 min-w-[60px]",
                "active:scale-95 transition-transform duration-100",
                isActive ? "text-indigo-600" : "text-slate-400"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-7 rounded-full transition-colors duration-150",
                  isActive ? "bg-indigo-50" : ""
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-[10px] leading-none",
                  isActive ? "font-semibold" : "font-medium"
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
