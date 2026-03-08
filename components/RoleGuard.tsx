"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleGuardProps {
  /** Roles allowed to view this page. E.g. ["admin"] */
  allow: string[];
  /** Where to redirect unauthorized users. Defaults to /dashboard */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Client-side role guard. Wrap any page that should only be
 * accessible to certain roles.
 *
 * Usage:
 *   <RoleGuard allow={["admin"]}>
 *     <AdminOnlyContent />
 *   </RoleGuard>
 */
export function RoleGuard({ allow, redirectTo = "/dashboard", children }: RoleGuardProps) {
  const { data: user, isLoading, isError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    // Not authenticated → middleware should handle this, but be defensive
    if (isError || !user) {
      router.replace("/login");
      return;
    }
    if (!allow.includes(user.role)) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, isError, allow, redirectTo, router]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user || !allow.includes(user.role)) {
    // Render nothing while redirect is in flight
    return null;
  }

  return <>{children}</>;
}
