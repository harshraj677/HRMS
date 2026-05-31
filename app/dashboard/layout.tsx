"use client";

import { useState, Children } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import dynamic from "next/dynamic";

// Skip SSR on TopNav — it reads auth/notification state that differs between server and client,
// which causes Radix UI to generate mismatched IDs and trigger a hydration error.
const TopNav = dynamic(() => import("@/components/layout/TopNav").then((m) => m.TopNav), {
  ssr: false,
});
const OnboardingWizard = dynamic(
  () => import("@/components/onboarding/OnboardingWizard").then((m) => m.OnboardingWizard),
  { ssr: false }
);
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data: user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const profileEmployeeId = user?.role === "admin" ? "" : userId;
  const { data: profile, isLoading } = useProfile(profileEmployeeId);
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();

  // Show wizard if: employee (not admin), profile loaded, onboardingCompleted is false
  const showWizard =
    !dismissed &&
    !isLoading &&
    !!user &&
    user.role !== "admin" &&
    !!userId &&
    !(profile as any)?.onboardingCompleted;

  const handleComplete = () => {
    // Dismiss immediately so the UI responds
    setDismissed(true);
    // Force-invalidate the profile so the next mount reads fresh data from DB
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  };

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
          onComplete={handleComplete}
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
          collapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
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
