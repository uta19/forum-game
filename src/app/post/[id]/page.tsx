"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { POSTS, Message } from "@/lib/data";
import { useGameStore } from "@/lib/store";

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const post = POSTS.find((p) => p.id === id);

  const messages = useGameStore((s) => s.messages[id!] || []);
  const stage = useGameStore((s) => s.stages[id!] || 0);
  const loading = useGameStore((s) => s.loading[id!] || false);
  const addMessage = useGameStore((s) => s.addMessage);
  const setLoading = useGameStore((s) => s.setLoading);
  const advanceStage = useGameStore((s) => s.advanceStage);
  const addNpcComment = useGameStore((s) => s.addNpcComment);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const npcTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  // NPC auto-comments
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
      });
    } finally {
      setLoading(id!, false);
    }
  };

  const stageLabel = post.stages[stage] || post.stages[0];
  const progress = ((stage + 1) / post.stages.length) * 100;

  return (
    <div className="flex flex-col h-dvh bg-[#f5f5f5]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
          <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-lg">{post.avatar}</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{post.author}</p>
            <p className="text-xs text-gray-400">楼主 · 实时更新中</p>
          </div>
          <span className="text-xs text-[#ff4757] bg-red-50 px-2 py-1 rounded-full font-medium">
            {stageLabel}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-gradient-to-r from-[#ff4757] to-[#ff6b81] rounded-r-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </header>

      {/* Post Content */}
      <div className="bg-white mx-3 mt-3 rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-base">{post.title}</h2>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{post.content}</p>
        <div className="flex gap-2 mt-3">
          {post.tags.map((t) => (
            <span key={t} className="text-xs text-[#ff4757] bg-red-50 px-2 py-0.5 rounded-full">#{t}</span>
          ))}
        </div>
      </div>

      {/* Comment List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 hide-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2 ${msg.role === "player" ? "flex-row-reverse" : ""}`}
            >
              {msg.role !== "player" && (
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm shrink-0">
                  {msg.avatar}
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === "player" ? "items-end" : ""}`}>
                <div className={`flex items-center gap-1 mb-0.5 ${msg.role === "player" ? "justify-end" : ""}`}>
                  <span className={`text-xs ${msg.role === "npc" ? "text-gray-400" : "text-gray-500"} font-medium`}>
                    {msg.author}
                  </span>
                  {msg.role === "host" && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">楼主</span>
                  )}
                </div>
                <div
                  className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "player"
                      ? "bg-[#dcf8c6] text-gray-800 rounded-tr-sm"
                      : msg.role === "host"
                      ? "bg-[#fff8e1] text-gray-800 rounded-tl-sm border border-amber-100"
                      : msg.role === "system"
                      ? "bg-gray-100 text-gray-500 text-xs text-center"
                      : "bg-white text-gray-400 rounded-tl-sm shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
              {msg.role === "player" && (
                <div className="w-8 h-8 rounded-full bg-[#dcf8c6] flex items-center justify-center text-sm shrink-0">
                  😎
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2 items-center"
          >
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm">{post.avatar}</div>
            <div className="bg-[#fff8e1] rounded-xl px-4 py-2 border border-amber-100">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
            <span className="text-xs text-gray-400">楼主正在输入...</span>
          </motion.div>
        )}
      </div>

      {/* Bottom Input */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
        {/* Quick Replies */}
        <div className="flex gap-2 px-3 py-2 overflow-x-auto hide-scrollbar">
          {post.quickReplies.map((qr) => (
            <button
              key={qr}
              onClick={() => handleSend(qr)}
              disabled={loading}
              className="shrink-0 text-xs bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
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
            placeholder="说点什么..."
            disabled={loading}
            className="flex-1 h-10 bg-gray-50 rounded-full px-4 text-sm outline-none focus:ring-2 focus:ring-[#ff4757]/30 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="h-10 px-5 bg-[#ff4757] text-white text-sm font-medium rounded-full active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
