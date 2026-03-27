"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PostData {
  id: string;
  zone: string;
  is_official: boolean;
  title: string;
  content: string;
  system_prompt: string;
}

interface CommentData {
  id: string;
  role: string;
  content: string;
  likes: number;
  created_at: string;
}

const BATCH_SIZE = 3;
let _cid = 0;
const cid = () => `c-${Date.now()}-${++_cid}`;

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(0);

  const loadPost = useCallback(async () => {
    const res = await fetch(`/api/posts/${id}`);
    if (res.ok) setPost(await res.json());
  }, [id]);

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/posts/${id}/comments`);
    if (res.ok) setComments(await res.json());
  }, [id]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => { loadPost(); loadComments(); }, [loadPost, loadComments]);
  useEffect(() => scrollToBottom(), [comments.length, scrollToBottom]);

  if (!post) return <div className="p-8 text-center text-gray-400">加载中...</div>;

  const triggerHostReply = async (allComments: CommentData[]) => {
    if (loading) return;
    setLoading(true);
    try {
      const recentUser = allComments
        .filter((c) => c.role === "user")
        .slice(-BATCH_SIZE)
        .map((c) => c.content)
        .join("；");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: id,
          systemPrompt: post.system_prompt,
          messages: allComments.map((c) => ({
            role: c.role === "assistant" ? "assistant" : "user",
            content: c.content,
          })),
          playerMessage: recentUser,
        }),
      });
      const data = await res.json();
      const reply = data.reply || "（楼主暂时没有回复）";

      // 写入数据库
      const commentId = cid();
      await fetch(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId, role: "assistant", content: reply, likes: Math.floor(Math.random() * 80) + 20 }),
      });

      pendingRef.current = 0;
      await loadComments();
    } catch {
      // 错误不写库
      setComments((prev) => [...prev, { id: cid(), role: "assistant", content: "网络开小差了，请重试", likes: 0, created_at: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const commentId = cid();
    // 写入数据库
    await fetch(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId, role: "user", content, likes: 0 }),
    });

    const newComment: CommentData = { id: commentId, role: "user", content, likes: 0, created_at: new Date().toISOString() };
    const updated = [...comments, newComment];
    setComments(updated);
    pendingRef.current += 1;

    if (pendingRef.current >= BATCH_SIZE) {
      await triggerHostReply(updated);
    }
  };

  const handleForceReply = () => {
    if (pendingRef.current > 0 && !loading) {
      triggerHostReply(comments);
    }
  };

  const handleLike = async (commentId: string) => {
    await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes: c.likes + 1 } : c));
  };

  return (
    <div className="flex flex-col h-dvh bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button onClick={() => router.back()} className="text-gray-400 text-lg">←</button>
          <span className="flex-1 text-sm font-medium text-gray-700 truncate">帖子详情</span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{post.zone}</span>
            {post.is_official && (
              <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded font-medium">🔥 精华</span>
            )}
          </div>
          <h1 className="text-base font-bold text-gray-900 leading-snug">{post.title}</h1>
          <p className="text-sm text-gray-700 mt-1.5 leading-normal">{post.content}</p>
        </div>

        <div className="h-2 bg-gray-50" />
        <div className="px-4 py-2 text-sm font-bold text-gray-900 border-b border-gray-100">回帖区</div>

        <AnimatePresence initial={false}>
          {comments.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="border-b border-gray-50"
            >
              <div className="px-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">{i + 1}楼</span>
                  {c.role === "assistant" && (
                    <span className="text-[10px] bg-[#ff4757] text-white px-1.5 py-[1px] rounded">楼主</span>
                  )}
                  {c.role === "user" && (
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-[1px] rounded">网友</span>
                  )}
                  <button
                    onClick={() => handleLike(c.id)}
                    className="ml-auto flex items-center gap-1 text-xs text-gray-300 hover:text-[#ff4757] active:scale-110 transition-all"
                  >
                    <span>👍</span>
                    {c.likes > 0 && <span>{c.likes}</span>}
                  </button>
                </div>
                <p className="text-sm text-gray-800 leading-normal">{c.content}</p>
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
