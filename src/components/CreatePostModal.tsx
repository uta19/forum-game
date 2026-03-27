"use client";

import { useState, useEffect } from "react";

export default function CreatePostModal({ onClose }: { onClose: () => void }) {
  const [zones, setZones] = useState<string[]>([]);
  const [zone, setZone] = useState("");
  const [identity, setIdentity] = useState("");
  const [crisis, setCrisis] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");

  useEffect(() => {
    fetch("/api/zones").then((r) => r.json()).then((data) => {
      setZones(data);
      if (data.length > 0) setZone(data[0]);
    });
  }, []);

  const handleAddZone = async () => {
    const name = newZoneName.trim();
    if (name && !zones.includes(name)) {
      await fetch("/api/zones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      setZones((prev) => [...prev, name]);
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
      if (data.title) onClose();
    } catch {
      alert("生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl p-5"
        style={{ background: "var(--bg-card)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>发布求助帖</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} className="text-lg">✕</button>
        </div>

        <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>板块</label>
        <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar">
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full"
              style={zone === z ? { background: "var(--btn-primary)", color: "var(--btn-primary-text)" } : { background: "var(--bg-input)", color: "var(--text-secondary)" }}
              title={z}
            >
              {z.length > 6 ? z.slice(0, 6) + ".." : z}
            </button>
          ))}
          {showAddZone ? (
            <input autoFocus value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddZone()} onBlur={handleAddZone} placeholder="板块名" className="shrink-0 w-20 text-xs px-2 py-1.5 rounded-full outline-none" style={{ background: "var(--bg-input)", color: "var(--text-primary)" }} />
          ) : (
            <button onClick={() => setShowAddZone(true)} className="shrink-0 text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>+</button>
          )}
        </div>

        <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>你的身份</label>
        <input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="例：一个刚觉醒超能力的外卖员" className="w-full h-10 rounded-lg px-3 text-sm outline-none mb-3" style={{ background: "var(--bg-input)", color: "var(--text-primary)" }} />

        <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>你遇到的危机</label>
        <textarea value={crisis} onChange={(e) => setCrisis(e.target.value)} placeholder="例：送外卖途中发现客户地址是一栋不存在的楼" rows={3} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none mb-4" style={{ background: "var(--bg-input)", color: "var(--text-primary)" }} />

        <button onClick={handleSubmit} disabled={loading || !identity.trim() || !crisis.trim()} className="w-full h-11 text-sm font-medium rounded-xl disabled:opacity-40" style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}>
          {loading ? "AI 正在帮你编故事..." : "生成并发布"}
        </button>
      </div>
    </div>
  );
}
