"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface EventData {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  isOnline: boolean;
  maxCapacity: number | null;
  status: string;
  createdAt: string;
  registrationCount: number;
  isRegistered: boolean;
}

export function useEvents(status?: string) {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  return useQuery<EventData[]>({
    queryKey: ["events", status],
    queryFn: async () => {
      const res = await fetch(`/api/events?${p.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).events;
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<EventData>) => {
      const res = await fetch("/api/events", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.event as EventData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Event created."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRegisterEvent(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (register: boolean) => {
      const res = await fetch(`/api/events/${eventId}/register`, { method: register ? "POST" : "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: (_, register) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(register ? "Registered for event." : "Unregistered.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
