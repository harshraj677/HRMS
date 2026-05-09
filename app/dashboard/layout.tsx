"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { BottomNav } from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-60 min-w-0">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          {/* pb-20 on mobile reserves space above the fixed bottom nav */}
          <div className="p-4 pb-20 sm:p-6 lg:p-8 lg:pb-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
