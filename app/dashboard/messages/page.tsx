"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Send,
  Inbox,
  Search,
  Loader2,
  MailOpen,
  Mail,
  X,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMessages, useSendMessage, useMarkAsRead } from "@/hooks/useMessages";
import { cn, timeAgo, getInitials } from "@/lib/utils";
import type { Message } from "@/types";

const composeSchema = z.object({
  recipientId: z.string().min(1, "Select a recipient"),
  subject: z.string().min(3, "Subject too short"),
  body: z.string().min(10, "Message too short"),
});
type ComposeData = z.infer<typeof composeSchema>;

const mockRecipients = [
  { id: "2", name: "Priya Mehta" },
  { id: "3", name: "Rohan Gupta" },
  { id: "4", name: "Sneha Iyer" },
  { id: "5", name: "Kiran Reddy" },
];

function MessageItem({
  msg,
  isSelected,
  onSelect,
}: {
  msg: Message;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      layoutId={`msg-${msg.id}`}
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors",
        isSelected && "bg-indigo-50 border-l-2 border-l-indigo-500",
        msg.status === "unread" && !isSelected && "bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-9 h-9 shrink-0 mt-0.5">
          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
            {getInitials(msg.from)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p className={cn("text-sm truncate", msg.status === "unread" ? "font-semibold text-slate-900" : "text-slate-600")}>
              {msg.from}
            </p>
            <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(msg.timestamp)}</span>
          </div>
          <p className={cn("text-xs truncate", msg.status === "unread" ? "font-medium text-slate-700" : "text-slate-500")}>
            {msg.subject}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{msg.body}</p>
        </div>
        {msg.status === "unread" && (
          <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-2" />
        )}
      </div>
    </motion.button>
  );
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: inbox } = useMessages("inbox");
  const { data: sent } = useMessages("sent");
  const sendMessage = useSendMessage();
  const markRead = useMarkAsRead();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ComposeData>({
    resolver: zodResolver(composeSchema),
  });

  const messages = activeTab === "inbox" ? inbox : sent;
  const filtered = messages?.filter(m =>
    m.subject.toLowerCase().includes(search.toLowerCase()) ||
    m.from.toLowerCase().includes(search.toLowerCase()) ||
    m.body.toLowerCase().includes(search.toLowerCase())
  );
  const unreadCount = inbox?.filter(m => m.status === "unread").length ?? 0;

  const handleSelect = (msg: Message) => {
    setSelectedMsg(msg);
    if (msg.status === "unread" && activeTab === "inbox") markRead.mutate(msg.id);
  };

  const onSend = async (data: ComposeData) => {
    await sendMessage.mutateAsync({ to: data.recipientId, subject: data.subject, body: data.body });
    reset();
    setComposeOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Messages</h2>
          <p className="text-sm text-slate-500 mt-0.5">Internal team communication</p>
        </div>
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shrink-0">
              <Pencil className="w-4 h-4" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSend)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>To</Label>
                <select
                  className={cn(
                    "w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    errors.recipientId ? "border-red-400" : "border-slate-200"
                  )}
                  {...register("recipientId")}
                >
                  <option value="">Select recipient</option>
                  {mockRecipients.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {errors.recipientId && <p className="text-xs text-red-500">{errors.recipientId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input
                  placeholder="Message subject..."
                  className={errors.subject ? "border-red-400" : ""}
                  {...register("subject")}
                />
                {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea
                  placeholder="Write your message..."
                  className={cn("min-h-[120px] resize-none", errors.body ? "border-red-400" : "")}
                  {...register("body")}
                />
                {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl"
                  onClick={() => { reset(); setComposeOpen(false); }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  disabled={sendMessage.isPending}>
                  {sendMessage.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        style={{ minHeight: 500 }}
      >
        <div className="flex h-full" style={{ minHeight: 500 }}>
          {/* Left: Message List */}
          <div className="w-full sm:w-80 lg:w-96 border-r border-slate-100 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-100">
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSelectedMsg(null); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="inbox" className="flex-1 text-xs">
                    <Inbox className="w-3.5 h-3.5 mr-1" />
                    Inbox
                    {unreadCount > 0 && (
                      <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full font-medium">
                        {unreadCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="flex-1 text-xs">
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Sent
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search messages..."
                  className="pl-8 h-8 text-xs rounded-xl"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered?.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Mail className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  <p className="text-sm">No messages found</p>
                </div>
              )}
              {filtered?.map(msg => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  isSelected={selectedMsg?.id === msg.id}
                  onSelect={() => handleSelect(msg)}
                />
              ))}
            </div>
          </div>

          {/* Right: Message Detail */}
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {selectedMsg ? (
                <motion.div
                  key={selectedMsg.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col h-full"
                >
                  {/* Message Header */}
                  <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
                          {getInitials(selectedMsg.from)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-slate-800">{selectedMsg.subject}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          From <span className="text-slate-700">{selectedMsg.from}</span>
                          {" · "}{timeAgo(selectedMsg.timestamp)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMsg(null)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors shrink-0 sm:hidden"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  {/* Message Body */}
                  <div className="flex-1 p-5 overflow-y-auto">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedMsg.body}
                    </p>
                  </div>
                  {/* Quick Reply */}
                  {activeTab === "inbox" && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={`Reply to ${selectedMsg.from}...`}
                          className="rounded-xl text-sm"
                        />
                        <Button size="icon" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shrink-0">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-slate-300 hidden sm:flex"
                >
                  <MailOpen className="w-14 h-14 mb-3" />
                  <p className="text-sm text-slate-400">Select a message to read</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
