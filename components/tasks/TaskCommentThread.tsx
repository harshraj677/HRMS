"use client";

import { useMemo, useRef, useState } from "react";
import { Send, Loader2, CornerDownRight, X } from "lucide-react";
import { cn, getInitials, timeAgo } from "@/lib/utils";
import { useAddTaskComment, type AssignableEmployee, type TaskCommentData } from "@/hooks/useTasks";

function renderContent(content: string) {
  const parts = content.split(/(@[A-Za-z][\w.]*(?:\s[A-Z][\w.]*)?)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-indigo-600 font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function CommentItem({
  comment,
  replies,
  onReply,
}: {
  comment: TaskCommentData;
  replies: TaskCommentData[];
  onReply: (comment: TaskCommentData) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
          {getInitials(comment.authorName || "?")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">{comment.authorName}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 capitalize">{comment.authorRole}</span>
            </div>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{renderContent(comment.content)}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
            <button type="button" onClick={() => onReply(comment)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Reply
            </button>
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-6 pl-4 border-l-2 border-slate-100 space-y-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                {getInitials(reply.authorName || "?")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{reply.authorName}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 capitalize">{reply.authorRole}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{renderContent(reply.content)}</p>
                </div>
                <span className="text-xs text-slate-400 px-1">{timeAgo(reply.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskCommentThread({
  taskId,
  comments,
  employees,
}: {
  taskId: string;
  comments: TaskCommentData[];
  employees: AssignableEmployee[];
}) {
  const addComment = useAddTaskComment(taskId);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<TaskCommentData | null>(null);
  const [mentionIds, setMentionIds] = useState<Map<string, string>>(new Map());
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const topLevel = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
  const repliesFor = useMemo(() => {
    const map = new Map<string, TaskCommentData[]>();
    for (const c of comments) {
      if (c.parentId) {
        if (!map.has(c.parentId)) map.set(c.parentId, []);
        map.get(c.parentId)!.push(c);
      }
    }
    return map;
  }, [comments]);

  const mentionMatches = useMemo(() => {
    if (!showMentions) return [];
    const q = mentionQuery.toLowerCase();
    return employees.filter((e) => e.fullName.toLowerCase().includes(q)).slice(0, 5);
  }, [showMentions, mentionQuery, employees]);

  function handleChange(value: string) {
    setContent(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/@([\w]*)$/);
    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  }

  function selectMention(emp: AssignableEmployee) {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const upToCursor = content.slice(0, cursor);
    const replaced = upToCursor.replace(/@([\w]*)$/, `@${emp.fullName.replace(/\s/g, "")} `);
    const newContent = replaced + content.slice(cursor);
    setContent(newContent);
    setMentionIds((prev) => new Map(prev).set(emp.fullName.replace(/\s/g, ""), emp.id));
    setShowMentions(false);
    setMentionQuery("");
    textareaRef.current?.focus();
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    const mentions = Array.from(mentionIds.entries())
      .filter(([name]) => content.includes(`@${name}`))
      .map(([, id]) => id);
    await addComment.mutateAsync({ content: content.trim(), parentId: replyTo?.id, mentions });
    setContent("");
    setReplyTo(null);
    setMentionIds(new Map());
  }

  return (
    <div className="space-y-5">
      {topLevel.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No comments yet. Start the conversation.</p>
      ) : (
        <div className="space-y-5">
          {topLevel.map((c) => (
            <CommentItem key={c.id} comment={c} replies={repliesFor.get(c.id) ?? []} onReply={setReplyTo} />
          ))}
        </div>
      )}

      <div className="space-y-2 relative">
        {replyTo && (
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-indigo-700 font-medium">
              <CornerDownRight className="w-3.5 h-3.5" /> Replying to {replyTo.authorName}
            </span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="text-indigo-400 hover:text-indigo-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showMentions && mentionMatches.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
            {mentionMatches.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => selectMention(emp)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {getInitials(emp.fullName)}
                </div>
                <span className="truncate">{emp.fullName}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Write a comment… use @ to mention someone"
            rows={2}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={addComment.isPending || !content.trim()}
            className={cn(
              "h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            )}
            aria-label="Send comment"
          >
            {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
