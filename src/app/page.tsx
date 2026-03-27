"use client";

import Link from "next/link";
import { POSTS } from "@/lib/data";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">🍿 吃瓜社区</h1>
          <span className="text-xs text-gray-400">实时剧情论坛</span>
        </div>
      </header>

      {/* Feed */}
      <main className="p-4 space-y-3 pb-20">
        {POSTS.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={`/post/${post.id}`}>
              <div className="bg-white rounded-xl shadow-sm p-4 active:scale-[0.98] transition-transform">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl shrink-0">
                    {post.coverEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-base leading-snug line-clamp-1">{post.title}</h2>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs text-[#ff4757] bg-red-50 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>💬 {post.commentCount}</span>
                      <span>❤️ {post.likeCount}</span>
                      <span className="ml-auto text-[#ff4757] font-medium">进入剧情 →</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
