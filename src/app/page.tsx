"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ZONES } from "@/lib/data";
import { useForumStore } from "@/lib/store";
import CreatePostModal from "@/components/CreatePostModal";

export default function Home() {
  const posts = useForumStore((s) => s.posts);
  const [zone, setZone] = useState("全部");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = zone === "全部" ? posts : posts.filter((p) => p.zone === zone);
  const sorted = [...filtered].sort((a, b) => {
    if (a.isOfficial && !b.isOfficial) return -1;
    if (!a.isOfficial && b.isOfficial) return 1;
    return 0;
  });

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="px-4 pt-3 pb-1">
          <h1 className="text-lg font-bold">跨位面异常互助论坛</h1>
          <p className="text-xs text-gray-400 mt-0.5">遇事不决，发帖就对了</p>
        </div>
        {/* Zone Tabs */}
        <div className="flex gap-1 px-4 py-2 overflow-x-auto hide-scrollbar">
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
                zone === z
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </header>

      {/* Post List */}
      <main className="px-4 py-3 space-y-2 pb-24">
        <AnimatePresence initial={false}>
          {sorted.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Link href={`/post/${post.id}`}>
                <div className="bg-white rounded-xl p-3.5 active:scale-[0.99] transition-transform shadow-sm">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {post.zone}
                    </span>
                    {post.isOfficial && (
                      <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded font-medium">
                        🔥 精华
                      </span>
                    )}
                    {!post.isOfficial && (
                      <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                        🆕 新帖
                      </span>
                    )}
                  </div>
                  {/* Title */}
                  <h2 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                    {post.title}
                  </h2>
                  {/* Preview */}
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{post.content}</p>
                  {/* Footer */}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300">
                    <span>💬 {post.comments.length}</span>
                    <span className="ml-auto text-gray-400">进入 →</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-transform z-50"
      >
        +
      </button>

      {/* Create Modal */}
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
