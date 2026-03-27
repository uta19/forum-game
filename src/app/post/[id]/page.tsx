"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { POSTS, Message } from "@/lib/data";
import { useGameStore } from "@/lib/store";

const EMPTY_MESSAGES: Message[] = [];

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

function FloorComment({
  msg,
  isOP,
  onLike,
}: {
  msg: Message;
  isOP: boolean;
  onLike: () => void;
}) {
  const roleColor =
    msg.role === "host"
      ? "border-l-amber-400 bg-amber-50/50"
      : msg.role === "player"
      ? "border-l-emerald-400 bg-emerald-50/30"
      : msg.role === "system"
      ? "border-l-gray-300 bg-gray-50"
      : "border-l-transparent bg-white";

  return (
    <div className={`border-l-[3px] ${roleColor} rounded-lg px-3 py-3`}>
      {/* Top: user info + floor */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm">
            {msg.avatar}
          </div>
          <span className="text-sm font-medium text-gray-700">{msg.author}</span>
          {msg.role === "host" && (
            <span className="text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded font-bold">
              楼主
            </span>
          )}
          {msg.role === "player" && (
            <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">
              我
            </span>
          )}
          {msg.ip && <span className="text-[10px] text-gray-300">IP: {msg.ip}</span>}
        </div>
        <span className="text-xs text-gray-300 shrink-0">#{msg.floor}</span>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-800 leading-relaxed pl-9">{msg.content}</p>

      {/* Bottom: time + interactions */}
      <div className="flex items-center justify-between mt-2 pl-9">
        <span className="text-[11px] text-gray-300">{timeAgo(msg.timestamp)}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onLike}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-400 active:scale-110 transition-all"
          >
            <span>♡</span>
            {msg.likes > 0 && <span>{msg.likes}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const post = POSTS.find((p) => p.id === id);

  const messages = useGameStore((s) => s.messages[id!]) ?? EMPTY_MESSAGES;
  const stage = useGameStore((s) => s.stages[id!] ?? 0);
  const loading = useGameStore((s) => s.loading[id!] ?? false);
  const addMessage = useGameStore((s) => s.addMessage);
  const setLoading = useGameStore((s) => s.setLoading);
  const advanceStage = useGameStore((s) => s.advanceStage);
  const addNpcComment = useGameStore((s) => s.addNpcComment);
  const likeMessage = useGameStore((s) => s.likeMessage);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const npcTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    if (!id) return;
    npcTimerRef.current = setInterval(() => {
      if (!useGameStore.getState().loading[id]) {
        addNpcComment(id);
        scrollToBottom();
      }
    }, 12000 + Math.random() * 8000);
    return () => clearInterval(npcTimerRef.current);
  }, [id, addNpcComment, scrollToBottom]);

  useEffect(() => scrollToBottom(), [messages.length, scrollToBottom]);

  if (!post) return <div className="p-8 text-center text-gray-400">帖子不存在</div>;

  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const playerMsg: Message = {
      id: `p-${Date.now()}`,
      role: "player",
      author: "我",
      avatar: "😎",
      content,
      timestamp: Date.now(),
      floor: 0,
      likes: 0,
      ip: "本机",
    };
    addMessage(id!, playerMsg);
    setLoading(id!, true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: id,
          systemPrompt: post.systemPrompt,
          stage,
          messages: [...messages, playerMsg].map((m) => ({
            role: m.role === "host" ? "assistant" : "user",
            content: `[${m.author}]: ${m.content}`,
          })),
          playerMessage: content,
        }),
      });
      const data = await res.json();

      const hostMsg: Message = {
        id: `h-${Date.now()}`,
        role: "host",
        author: post.author,
        avatar: post.avatar,
        content: data.reply || "（楼主暂时没有回复）",
        timestamp: Date.now(),
        floor: 0,
        likes: Math.floor(Math.random() * 50) + 10,
        ip: "未知",
      };
      addMessage(id!, hostMsg);

      if (data.advanceStage) {
        advanceStage(id!);
      }
    } catch {
      addMessage(id!, {
        id: `err-${Date.now()}`,
        role: "system",
        author: "系统",
        avatar: "⚠️",
        content: "网络开小差了，请重试",
        timestamp: Date.now(),
        floor: 0,
        likes: 0,
      });
    } finally {
      setLoading(id!, false);
    }
  };

  const stageLabel = post.stages[stage] || post.stages[0];
  const progress = ((stage + 1) / post.stages.length) * 100;

  return (
    <div className="flex flex-col h-dvh bg-[#fafafa]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-lg">
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[15px] truncate">{post.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-400">
                💬 {messages.length} 条回复
              </span>
              <span className="text-[11px] text-gray-300">·</span>
              <span className="text-[11px] text-[#ff4757] font-medium">{stageLabel}</span>
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-gray-100">
          <motion.div
            className="h-full bg-gradient-to-r from-[#ff4757] to-[#ff6b81] rounded-r-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </header>

      {/* Scrollable Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
        {/* Original Post (0楼) */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-lg">
              {post.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{post.author}</span>
                <span className="text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded font-bold">
                  楼主
                </span>
              </div>
              <span className="text-[11px] text-gray-300">刚刚发布</span>
            </div>
            <span className="text-xs text-gray-300">#0</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{post.content}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((t) => (
              <span key={t} className="text-[11px] text-[#ff4757] bg-red-50 px-2 py-0.5 rounded-full">
                #{t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-[11px] text-gray-300">
            <span>♡ {post.likeCount}</span>
            <span>💬 {post.commentCount + messages.length}</span>
          </div>
        </div>

        {/* Replies */}
        <div className="mx-3 mt-3 mb-3 space-y-1.5">
          <div className="text-xs text-gray-400 font-medium px-1 py-1">
            全部回复 ({messages.length})
          </div>

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FloorComment
                  msg={msg}
                  isOP={msg.role === "host"}
                  onLike={() => likeMessage(id!, msg.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-l-[3px] border-l-amber-400 bg-amber-50/50 rounded-lg px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                  {post.avatar}
                </div>
                <span className="text-sm font-medium text-gray-700">{post.author}</span>
                <span className="text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded font-bold">
                  楼主
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 pl-9">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs text-gray-400 ml-1">楼主正在回复...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Input */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-1px_3px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
        {/* Quick Replies */}
        <div className="flex gap-2 px-3 py-2 overflow-x-auto hide-scrollbar">
          {post.quickReplies.map((qr) => (
            <button
              key={qr}
              onClick={() => handleSend(qr)}
              disabled={loading}
              className="shrink-0 text-xs bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 border border-gray-100"
            >
              {qr}
            </button>
          ))}
        </div>
        {/* Input */}
        <div className="flex items-center gap-2 px-3 pb-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="写下你的回复..."
            disabled={loading}
            className="flex-1 h-10 bg-gray-50 border border-gray-100 rounded-lg px-4 text-sm outline-none focus:ring-2 focus:ring-[#ff4757]/20 focus:border-[#ff4757]/30 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="h-10 px-5 bg-[#ff4757] text-white text-sm font-medium rounded-lg active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            发布
          </button>
        </div>
      </div>
    </div>
  );
}
