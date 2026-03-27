"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CreatePostModal from "@/components/CreatePostModal";
import Entrance from "@/components/Entrance";

interface PostItem {
  id: string;
  zone: string;
  is_official: boolean;
  title: string;
  content: string;
  comment_count: number;
}

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [zones, setZones] = useState<string[]>(["全部"]);
  const [zone, setZone] = useState("全部");
  const [showCreate, setShowCreate] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");

  const loadPosts = useCallback(async () => {
    const url = zone === "全部" ? "/api/posts" : `/api/posts?zone=${encodeURIComponent(zone)}`;
    const res = await fetch(url);
    const data = await res.json();
    setPosts(data);
  }, [zone]);

  const loadZones = useCallback(async () => {
    const res = await fetch("/api/zones");
    const data = await res.json();
    setZones(["全部", ...data]);
  }, []);

  useEffect(() => { loadZones(); }, [loadZones]);
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleAddZone = async () => {
    const name = newZoneName.trim();
    if (name && !zones.includes(name)) {
      await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setZones((prev) => [...prev, name]);
      setZone(name);
    }
    setNewZoneName("");
    setShowAddZone(false);
  };

  const handlePostCreated = () => {
    setShowCreate(false);
    loadPosts();
    loadZones();
  };

  if (!hasEntered) {
    return <Entrance onEnter={() => setHasEntered(true)} />;
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="px-4 pt-3 pb-1">
          <h1 className="text-lg font-bold">跨位面异常互助论坛</h1>
          <p className="text-xs text-gray-400 mt-0.5">遇事不决，发帖就对了</p>
        </div>
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto hide-scrollbar">
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
                zone === z ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              title={z}
            >
              {z.length > 6 ? z.slice(0, 6) + ".." : z}
            </button>
          ))}
          {showAddZone ? (
            <input
              autoFocus
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddZone()}
              onBlur={handleAddZone}
              placeholder="板块名"
              className="shrink-0 w-20 text-xs px-2 py-1.5 rounded-full bg-gray-100 outline-none"
            />
          ) : (
            <button
              onClick={() => setShowAddZone(true)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200"
            >
              +
            </button>
          )}
        </div>
      </header>

      <main className="px-4 py-3 space-y-2 pb-24">
        <AnimatePresence initial={false}>
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Link href={`/post/${post.id}`}>
                <div className="bg-white rounded-xl p-3.5 active:scale-[0.99] transition-transform shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {post.zone}
                    </span>
                    {post.is_official && (
                      <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded font-medium">🔥 精华</span>
                    )}
                    {!post.is_official && (
                      <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">🆕 新帖</span>
                    )}
                    {post.comment_count >= 5 && (
                      <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-medium">💥 爆</span>
                    )}
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{post.title}</h2>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300">
                    <span>💬 {post.comment_count}</span>
                    <span className="ml-auto text-gray-400">进入 →</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-transform z-50"
      >
        +
      </button>

      {showCreate && <CreatePostModal onClose={handlePostCreated} />}
    </div>
  );
}
