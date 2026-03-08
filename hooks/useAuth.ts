"use client";

import { useQuery } from "@tanstack/react-query";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export function useAuth() {
  return useQuery<AuthUser>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Not authenticated");
      const json = await res.json();
      return json.user;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
