"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ease-in-out",
          collapsed ? "lg:ml-16" : "lg:ml-60"
        )}
      >
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 pb-20 sm:p-6 lg:p-8 lg:pb-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}
