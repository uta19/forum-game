"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

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
  const [input, setInput] = useState("");
  const [atHost, setAtHost] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingSinceRef = useRef(0);
  const replyingRef = useRef(false);

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
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => { loadPost(); loadComments(); }, [loadPost, loadComments]);
  useEffect(() => scrollToBottom(), [comments.length, scrollToBottom]);

  if (!post) return <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>加载中...</div>;

  const triggerHostReply = (snapshotComments: CommentData[]) => {
    if (replyingRef.current) return;
    replyingRef.current = true;

    const recentUser = snapshotComments
      .filter((c) => c.role === "user")
      .slice(-BATCH_SIZE)
      .map((c) => c.content)
      .join("；");

    (async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: id,
            systemPrompt: post.system_prompt,
            messages: snapshotComments.map((c) => ({
              role: c.role === "assistant" ? "assistant" : "user",
              content: c.content,
            })),
            playerMessage: recentUser,
          }),
        });
        const data = await res.json();
        const reply = data.reply || "（楼主暂时没有回复）";
        const likes = Math.floor(Math.random() * 80) + 20;
        const commentId = cid();

        await fetch(`/api/posts/${id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: commentId, role: "assistant", content: reply, likes }),
        });

        setComments((prev) => [...prev, {
          id: commentId, role: "assistant", content: reply, likes, created_at: new Date().toISOString(),
        }]);
      } catch {
        // silently fail
      } finally {
        pendingSinceRef.current = 0;
        replyingRef.current = false;
      }
    })();
  };

  const handleSend = (text?: string) => {
    const rawText = (text || input).trim();
    if (!rawText && !atHost) return;

    const content = atHost ? `@楼主 ${rawText}` : rawText;
    if (!content.trim()) return;

    setInput("");
    setAtHost(false);

    const commentId = cid();
    fetch(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId, role: "user", content, likes: 0 }),
    });

    const newComment: CommentData = { id: commentId, role: "user", content, likes: 0, created_at: new Date().toISOString() };
    setComments((prev) => {
      const updated = [...prev, newComment];
      pendingSinceRef.current += 1;

      // If @楼主, force reply immediately
      if (atHost || pendingSinceRef.current >= BATCH_SIZE) {
        if (!replyingRef.current) {
          setTimeout(() => triggerHostReply(updated), 0);
        }
      }
      return updated;
    });
  };

  const handleAtHost = () => {
    setAtHost(true);
  };

  const handleLike = (commentId: string) => {
    fetch(`/api/comments/${commentId}/like`, { method: "POST" });
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes: c.likes + 1 } : c));
  };

  // Render @楼主 chips in comment text
  const renderContent = (text: string) => {
    if (!text.includes("@楼主")) return text;
    const parts = text.split("@楼主");
    return parts.map((part, i) => (
      <span key={i}>
        {i > 0 && (
          <span
            className="inline-flex items-center text-[11px] font-medium px-1.5 rounded mx-0.5 align-baseline"
            style={{ background: "var(--accent)", color: "#fff", lineHeight: "1.4" }}
          >@楼主</span>
        )}
        {part}
      </span>
    ));
  };

  return (
    <div className="flex flex-col min-h-dvh pb-28" style={{ background: "var(--bg)" }}>
      <header className="sticky top-0 z-50 border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button onClick={() => router.back()} style={{ color: "var(--text-muted)" }} className="text-lg">←</button>
          <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-secondary)" }}>帖子详情</span>
        </div>
      </header>

      <div ref={scrollRef} style={{ background: "var(--bg-card)" }}>
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>{post.zone}</span>
            {post.is_official && (
              <span className="text-[10px] text-orange-500 px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--bg-input)" }}>🔥 精华</span>
            )}
          </div>
          <h1 className="text-base font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{post.title}</h1>
          <p className="text-sm mt-1.5 leading-normal" style={{ color: "var(--text-secondary)" }}>{post.content}</p>
        </div>

        <div className="h-2" style={{ background: "var(--divider)" }} />
        <div className="px-4 py-2 text-sm font-bold border-b" style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}>回帖区</div>

        {comments.map((c, i) => (
          <div key={c.id} className="border-b" style={{ borderColor: "var(--border)" }}>
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{i + 1}楼</span>
                {c.role === "assistant" && (
                  <span className="text-[10px] text-white px-1.5 py-[1px] rounded" style={{ background: "var(--accent)" }}>楼主</span>
                )}
                {c.role === "user" && (
                  <span className="text-[10px] px-1.5 py-[1px] rounded" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>网友</span>
                )}
                <button
                  onClick={() => handleLike(c.id)}
                  className="ml-auto flex items-center gap-1 text-xs active:scale-110 transition-all"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span>👍</span>
                  {c.likes > 0 && <span>{c.likes}</span>}
                </button>
              </div>
              <p className="text-sm leading-normal" style={{ color: "var(--text-primary)" }}>{renderContent(c.content)}</p>
            </div>
          </div>
        ))}

        <div className="h-2" />
      </div>

      {/* Bottom bar — max-width aligned with content */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-[480px] mx-auto border-t pb-[env(safe-area-inset-bottom)]" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 px-3 py-2.5">
            {/* Input with @楼主 inside */}
            <div
              className="flex-1 flex items-center h-9 rounded-lg px-2 overflow-hidden"
              style={{ background: "var(--bg-input)" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="写下你的回复..."
                className="flex-1 h-full bg-transparent text-sm outline-none min-w-0"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={() => setAtHost(!atHost)}
                className="shrink-0 text-[11px] px-1.5 py-0.5 rounded font-medium ml-1 transition-colors"
                style={atHost
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "transparent", color: "var(--text-muted)" }
                }
              >
                @楼主
              </button>
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() && !atHost}
              className="shrink-0 h-9 px-4 text-sm rounded-lg disabled:opacity-40"
              style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
            >
              发布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
