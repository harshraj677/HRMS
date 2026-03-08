"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockMessages } from "@/lib/mock-data";
import { Message } from "@/types";
import { toast } from "sonner";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useMessages(type: "inbox" | "sent" = "inbox") {
  return useQuery<Message[]>({
    queryKey: ["messages", type],
    queryFn: async () => {
      await delay(500);
      if (type === "sent") {
        return mockMessages.filter((m) => m.fromId === "1");
      }
      return mockMessages.filter((m) => m.toId === "1");
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      await delay(800);
      const newMessage: Message = {
        id: `m${Date.now()}`,
        from: "Arjun Sharma",
        fromId: "1",
        to: data.to,
        toId: "8",
        subject: data.subject,
        body: data.body,
        timestamp: new Date().toISOString(),
        status: "sent",
      };
      mockMessages.push(newMessage);
      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Message sent successfully!");
    },
    onError: () => {
      toast.error("Failed to send message. Please try again.");
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await delay(300);
      const message = mockMessages.find((m) => m.id === id);
      if (message) message.status = "read";
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}
