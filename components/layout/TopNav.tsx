"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview & insights" },
  "/dashboard/employees": { title: "Employees", description: "Manage your team members" },
  "/dashboard/profile": { title: "My Profile", description: "Your personal details" },
  "/dashboard/attendance": { title: "Attendance", description: "Track and manage attendance" },
  "/dashboard/attendance-map": { title: "Attendance Map", description: "Live employee check-in locations" },
  "/dashboard/leave": { title: "Leave Requests", description: "Review and manage leave applications" },
  "/dashboard/analytics": { title: "Analytics", description: "Attendance & performance insights" },
  "/dashboard/settings": { title: "Settings", description: "Configure your preferences" },
};

interface TopNavProps {
  onMobileMenuOpen: () => void;
}

export function TopNav({ onMobileMenuOpen }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);
  const initials = user?.fullName?.split(" ").map((n: string) => n[0]).join("").toUpperCase() ?? "?";

  const currentPage = Object.keys(pageTitles)
    .reverse()
    .find((key) => pathname === key || (key !== "/dashboard" && pathname.startsWith(key)));
  const pageInfo = currentPage ? pageTitles[currentPage] : { title: "Dashboard", description: "" };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden shrink-0"
        onClick={onMobileMenuOpen}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Page Title - Hidden on mobile */}
      <div className="hidden sm:block">
        <h1 className="text-base font-semibold text-slate-900">{pageInfo.title}</h1>
        <p className="text-xs text-slate-500">{pageInfo.description}</p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:block">
        <motion.div
          animate={{ width: searchFocused ? 280 : 200 }}
          transition={{ duration: 0.2 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search..."
            className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white text-sm"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </motion.div>
      </div>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="relative shrink-0">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">
              3
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end">
          <DropdownMenuLabel className="font-semibold text-sm">Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {[
            { title: "Leave request approved", desc: "Your leave for March 10-11 is approved", time: "2m ago", color: "bg-emerald-500" },
            { title: "New message from HR", desc: "Leave policy update for FY 2026-27", time: "1h ago", color: "bg-indigo-500" },
            { title: "Attendance reminder", desc: "Please mark your attendance for today", time: "3h ago", color: "bg-amber-500" },
          ].map((notif, i) => (
            <DropdownMenuItem key={i} className="flex items-start gap-3 py-3 cursor-pointer">
              <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", notif.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{notif.desc}</p>
                <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-center text-xs text-indigo-600 font-medium justify-center">
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-slate-100 rounded-xl">
            <Avatar className="h-7 w-7">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullName ?? "User"}`} />
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.fullName ?? "Loading..."}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user?.role ?? ""}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52" align="end">
          <DropdownMenuLabel>
            <div>
              <p className="font-semibold text-slate-900">{user?.fullName ?? ""}</p>
              <p className="text-xs text-slate-500 font-normal">{user?.email ?? ""}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={user?.role === "admin" ? "/dashboard/employees" : "/dashboard/profile"} className="cursor-pointer">
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
