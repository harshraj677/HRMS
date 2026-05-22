"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface TicketData {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  createdById: string;
  creatorName: string;
  creatorDept: string | null;
  assignedToId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: MessageData[];
}

export interface MessageData {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export function useTickets(filters?: { status?: string }) {
  const p = new URLSearchParams();
  if (filters?.status && filters.status !== "all") p.set("status", filters.status);

  return useQuery<TicketData[]>({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      const res = await fetch(`/api/tickets?${p.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).tickets;
    },
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });
}

export function useTicket(id: string) {
  return useQuery<TicketData>({
    queryKey: ["tickets", id],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${id}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).ticket;
    },
    enabled: !!id,
    refetchInterval: 15 * 1000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { subject: string; category: string; priority?: string; description: string }) => {
      const res = await fetch("/api/tickets", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.ticket as TicketData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); toast.success("Ticket created."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TicketData> & { id: string }) => {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.ticket as TicketData;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["tickets"] }); qc.invalidateQueries({ queryKey: ["tickets", vars.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReplyTicket(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { content: string; isInternal?: boolean }) => {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.message as MessageData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets", ticketId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}
