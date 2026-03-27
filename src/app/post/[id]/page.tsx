"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { POSTS, Message } from "@/lib/data";
import { useGameStore } from "@/lib/store";

const EMPTY_MESSAGES: Message[] = [];
const BATCH_SIZE = 3;

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
  const likeMessage = useGameStore((s) => s.likeMessage);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => scrollToBottom(), [messages.length, scrollToBottom]);

  if (!post) return <div className="p-8 text-center text-gray-400">帖子不存在</div>;

  const triggerHostReply = async (allMessages: Message[]) => {
    if (loading) return;
    setLoading(id!, true);
    try {
      const recentPlayer = allMessages
        .filter((m) => m.role !== "host" && m.role !== "system")
        .slice(-BATCH_SIZE)
        .map((m) => m.content)
        .join("；");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: id,
          systemPrompt: post.systemPrompt,
          stage,
          messages: allMessages.map((m) => ({
            role: m.role === "host" ? "assistant" : "user",
            content: `[${m.author}]: ${m.content}`,
          })),
          playerMessage: recentPlayer,
        }),
      });
      const data = await res.json();

      addMessage(id!, {
        id: `h-${Date.now()}`,
        role: "host",
        author: post.author,
        avatar: post.avatar,
        content: data.reply || "（楼主暂时没有回复）",
        timestamp: Date.now(),
        floor: 0,
        likes: Math.floor(Math.random() * 80) + 20,
      });
      pendingRef.current = 0;

      if (data.advanceStage) advanceStage(id!);
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
    };
    addMessage(id!, playerMsg);
    pendingRef.current += 1;

    if (pendingRef.current >= BATCH_SIZE) {
      await triggerHostReply([...messages, playerMsg]);
    }
  };

  const handleForceReply = () => {
    if (pendingRef.current > 0 && !loading) {
      triggerHostReply(messages);
    }
  };

  const stageLabel = post.stages[stage] || post.stages[0];

  return (
    <div className="flex flex-col h-dvh bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button onClick={() => router.back()} className="text-gray-400 text-lg">←</button>
          <span className="flex-1 text-sm font-medium text-gray-700 truncate">帖子详情</span>
          <span className="text-xs text-gray-400">{stageLabel}</span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
        {/* OP */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm">{post.avatar}</div>
            <span className="text-sm text-gray-500">{post.author}</span>
          </div>
          <h1 className="text-base font-bold text-gray-900 leading-snug">{post.title}</h1>
          <p className="text-sm text-gray-700 mt-1.5 leading-normal">{post.content}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.tags.map((t) => (
              <span key={t} className="text-xs text-gray-400">#{t}</span>
            ))}
          </div>
        </div>

        <div className="h-2 bg-gray-50" />

        <div className="px-4 py-2 text-sm font-bold text-gray-900 border-b border-gray-100">回帖区</div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="border-b border-gray-50"
            >
              <div className="px-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">{msg.floor}楼</span>
                  {msg.role === "host" && (
                    <span className="text-[10px] bg-[#ff4757] text-white px-1.5 py-[1px] rounded">楼主</span>
                  )}
                  {msg.role === "player" && (
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-[1px] rounded">我</span>
                  )}
                  <button
                    onClick={() => likeMessage(id!, msg.id)}
                    className="ml-auto flex items-center gap-1 text-xs text-gray-300 hover:text-[#ff4757] active:scale-110 transition-all"
                  >
                    <span>👍</span>
                    {msg.likes > 0 && <span>{msg.likes}</span>}
                  </button>
                </div>
                <p className="text-sm text-gray-800 leading-normal">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="px-4 py-2 border-b border-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <span>楼主正在回复...</span>
            </div>
          </div>
        )}
        <div className="h-2" />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-2 px-3 py-1.5 overflow-x-auto hide-scrollbar">
          {post.quickReplies.map((qr) => (
            <button
              key={qr}
              onClick={() => handleSend(qr)}
              disabled={loading}
              className="shrink-0 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full disabled:opacity-40"
            >
              {qr}
            </button>
          ))}
          <button
            onClick={handleForceReply}
            disabled={loading}
            className="shrink-0 text-xs text-[#ff4757] bg-red-50 px-2.5 py-1 rounded-full disabled:opacity-40 font-medium"
          >
            @楼主
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 pb-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="写下你的回复..."
            disabled={loading}
            className="flex-1 h-9 bg-gray-50 rounded-lg px-3 text-sm outline-none focus:ring-1 focus:ring-gray-200 disabled:opacity-40"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="h-9 px-4 bg-[#ff4757] text-white text-sm rounded-lg disabled:opacity-40"
          >
            发布
          </button>
        </div>
      </div>
    </div>
  );
}
