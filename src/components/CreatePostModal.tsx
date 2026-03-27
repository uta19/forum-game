"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForumStore, uid } from "@/lib/store";

export default function CreatePostModal({ onClose }: { onClose: () => void }) {
  const addPost = useForumStore((s) => s.addPost);
  const zones = useForumStore((s) => s.zones);
  const addZone = useForumStore((s) => s.addZone);
  const zoneOptions = zones.filter((z) => z !== "全部");

  const [zone, setZone] = useState(zoneOptions[0]);
  const [identity, setIdentity] = useState("");
  const [crisis, setCrisis] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");

  const handleAddZone = () => {
    const name = newZoneName.trim();
    if (name && !zones.includes(name)) {
      addZone(name);
      setZone(name);
    }
    setNewZoneName("");
    setShowAddZone(false);
  };

  const handleSubmit = async () => {
    if (!identity.trim() || !crisis.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/create-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone, identity: identity.trim(), crisis: crisis.trim() }),
      });
      const data = await res.json();

      if (data.systemPrompt && data.content && data.title) {
        addPost({
          id: uid(),
          zone,
          isOfficial: false,
          title: data.title,
          content: data.content,
          systemPrompt: data.systemPrompt,
          comments: [],
        });
        onClose();
      }
    } catch {
      alert("生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-2xl p-5"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">发布求助帖</h2>
          <button onClick={onClose} className="text-gray-400 text-lg">✕</button>
        </div>

        {/* Zone */}
        <label className="text-xs text-gray-500 mb-1 block">板块</label>
        <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar">
          {zoneOptions.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full ${
                zone === z ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {z}
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
              className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-400"
            >
              +
            </button>
          )}
        </div>

        {/* Identity */}
        <label className="text-xs text-gray-500 mb-1 block">你的身份</label>
        <input
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder="例：一个刚觉醒超能力的外卖员"
          className="w-full h-10 bg-gray-50 rounded-lg px-3 text-sm outline-none mb-3"
        />

        {/* Crisis */}
        <label className="text-xs text-gray-500 mb-1 block">你遇到的危机</label>
        <textarea
          value={crisis}
          onChange={(e) => setCrisis(e.target.value)}
          placeholder="例：送外卖途中发现客户地址是一栋不存在的楼"
          rows={3}
          className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none resize-none mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !identity.trim() || !crisis.trim()}
          className="w-full h-11 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-40"
        >
          {loading ? "AI 正在帮你编故事..." : "生成并发布"}
        </button>
      </motion.div>
    </div>
  );
}
