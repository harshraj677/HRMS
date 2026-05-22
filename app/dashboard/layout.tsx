"use client";

import { useState, Children } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import dynamic from "next/dynamic";

// Skip SSR on TopNav — it reads auth/notification state that differs between server and client,
// which causes Radix UI to generate mismatched IDs and trigger a hydration error.
const TopNav = dynamic(() => import("@/components/layout/TopNav").then((m) => m.TopNav), {
  ssr: false,
});
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data: user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const { data: profile, isLoading } = useProfile(userId);
  const [dismissed, setDismissed] = useState(false);

  // Show wizard if: employee (not admin), profile loaded, onboarding not completed
  const showWizard =
    !dismissed &&
    !isLoading &&
    !!user &&
    user.role !== "admin" &&
    !!userId &&
    !(profile as any)?.onboardingCompleted;

  if (isLoading && user?.role !== "admin") {
    return <>{Children.toArray(children)}</>;
  }

  return (
    <>
      {Children.toArray(children)}
      {showWizard && (
        <OnboardingWizard
          employeeId={userId}
          employeeName={user?.fullName ?? ""}
          onComplete={() => setDismissed(true)}
        />
      )}
    </>
  );
}

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardShell>
        <OnboardingGate>
          {children}
        </OnboardingGate>
      </DashboardShell>
    </SidebarProvider>
  );
}
