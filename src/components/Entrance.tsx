"use client";

import { useState, useEffect } from "react";

export default function Entrance({ onEnter }: { onEnter: () => void }) {
  const [visible, setVisible] = useState(true);

  const handleEnter = () => {
    setVisible(false);
    setTimeout(() => onEnter(), 300);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl p-6 transition-all duration-300"
        style={{
          background: "var(--bg-card)",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.95)",
        }}
      >
        <h2 className="text-lg font-bold mb-5 text-center" style={{ color: "var(--text-primary)" }}>
          《异常互助社区免责协议》
        </h2>
        <div className="text-xs space-y-3 mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <p>1. 本社区发帖人均处于生死边缘、精神崩溃或怪物袭发恐慌期，请网友在围观时保持"瓜吃得不够事大"的基本道德素养。</p>
          <p>2. 如果楼主在互助过程中意外丧失联系（如断气、被天雷劈成渣），本社区不提供怪兽猎人服务。</p>
          <p>3. 你在评论区给出的所有建议，引发的一切因果报应，均与平台无关。</p>
          <p className="font-bold" style={{ color: "var(--accent)" }}>4. 警告：请不要直视屏幕中倒映的自己。</p>
        </div>
        <button
          onClick={handleEnter}
          className="w-full py-3.5 font-bold rounded-xl transition-all active:scale-95 text-sm"
          style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}
        >
          我已阅读并愿意分担因果，签名吃瓜
        </button>
      </div>
    </div>
  );
}
