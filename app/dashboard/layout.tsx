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
const PendingApprovalScreen = dynamic(
  () => import("@/components/onboarding/PendingApprovalScreen").then((m) => m.PendingApprovalScreen),
  { ssr: false }
);
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getApprovalStatus } from "@/lib/onboarding";

const WIZARD_STATUSES = ["INVITED", "PENDING_INVITATION", "PROFILE_IN_PROGRESS", "REJECTED"];

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data: user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const profileEmployeeId = user?.role === "admin" ? "" : userId;
  const { data: profile, isLoading } = useProfile(profileEmployeeId);
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();

  const approvalStatus = getApprovalStatus(user?.approvalStatus);
  const onboardingCompleted = !!(profile as any)?.onboardingCompleted;

  // Show wizard if: employee (not admin), profile incomplete, and not yet submitted/approved
  const showWizard =
    !dismissed &&
    !isLoading &&
    !!user &&
    user.role !== "admin" &&
    !!userId &&
    !onboardingCompleted &&
    WIZARD_STATUSES.includes(approvalStatus);

  // Show pending screen once submitted, until an admin approves or rejects
  const showPending =
    !dismissed &&
    !isLoading &&
    !!user &&
    user.role !== "admin" &&
    !!userId &&
    approvalStatus === "PROFILE_SUBMITTED";

  const handleComplete = () => {
    // Dismiss immediately so the UI responds
    setDismissed(true);
    // Force-invalidate the profile/auth so the next mount reads fresh data from DB
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
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
          phone={user?.phone}
          profile={profile}
          rejectionReason={approvalStatus === "REJECTED" ? user?.rejectionReason : null}
          onComplete={handleComplete}
        />
      )}
      {!showWizard && showPending && <PendingApprovalScreen employeeName={user?.fullName ?? ""} />}
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
