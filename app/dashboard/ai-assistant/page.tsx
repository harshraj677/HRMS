"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: { label: string; href: string }[];
  loading?: boolean;
}

interface AIResponse {
  message: string;
  actions?: { label: string; href: string }[];
  intent?: string;
}

const QUICK_PROMPTS = [
  "How many leave days do I have?",
  "What is my attendance this month?",
  "Show my latest payslip",
  "I want to raise a support ticket",
  "What is the leave policy?",
  "How do I submit my resignation?",
];

function BotMessage({ message }: { message: Message }) {
  // Convert **bold** markdown to JSX
  const parts = message.text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[80%]">
        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          {message.loading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((d) => (
                  <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, delay: d, repeat: Infinity }} />
                ))}
              </div>
              <span className="text-xs text-slate-400">Thinking…</span>
            </div>
          ) : (
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {parts.map((part, i) =>
                part.startsWith("**") && part.endsWith("**")
                  ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
                  : <span key={i}>{part}</span>
              )}
            </div>
          )}
        </div>
        {!message.loading && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.actions.map((a) => (
              <Link key={a.href} href={a.href}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-full transition-colors">
                {a.label} <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="max-w-[80%]">
        <div className="bg-indigo-600 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-sm text-white leading-relaxed">{message.text}</p>
        </div>
      </div>
      <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-slate-600" />
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const { data: user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Hello ${user?.fullName?.split(" ")[0] ?? "there"}! 👋 I'm your Anvesync HR assistant. I can help you with leave, attendance, payroll, tickets, org info, and more. What would you like to know?`,
      actions: [
        { label: "Leave balance", href: "/dashboard/leave" },
        { label: "My payslip", href: "/dashboard/my-payroll" },
        { label: "Raise ticket", href: "/dashboard/tickets" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (message: string): Promise<AIResponse> => {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update welcome message name once user loads
  useEffect(() => {
    if (user?.fullName) {
      setMessages((prev) => {
        if (prev[0]?.id === "welcome") {
          return [{
            ...prev[0],
            text: `Hello ${user.fullName.split(" ")[0]}! 👋 I'm your Anvesync HR assistant. I can help you with leave, attendance, payroll, tickets, org info, and more. What would you like to know?`,
          }, ...prev.slice(1)];
        }
        return prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.fullName]);

  async function sendMessage(text: string) {
    if (!text.trim() || chatMutation.isPending) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text };
    const loadingMsg: Message = { id: `l-${Date.now()}`, role: "assistant", text: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const response = await chatMutation.mutateAsync(text);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { id: `a-${Date.now()}`, role: "assistant", text: response.message, actions: response.actions },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { id: `e-${Date.now()}`, role: "assistant", text: "Sorry, I had trouble processing that. Please try again." },
      ]);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">AI HR Assistant</h2>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online · Powered by Anvesync
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {msg.role === "assistant" ? <BotMessage message={msg} /> : <UserMessage message={msg} />}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="shrink-0 mb-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button key={p} type="button"
              onClick={() => sendMessage(p)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all truncate max-w-[200px]">
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          placeholder="Ask me anything about HR, leave, payroll…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
        />
        <button
          type="button"
          disabled={!input.trim() || chatMutation.isPending}
          onClick={() => sendMessage(input)}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
            input.trim() && !chatMutation.isPending
              ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/25"
              : "bg-slate-100 text-slate-400"
          )}
        >
          {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
