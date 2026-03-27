"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Entrance({ onEnter }: { onEnter: () => void }) {
  const [step, setStep] = useState(0);
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 2000);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 3000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handleCaptcha = (choice: string) => {
    if (choice === "C") {
      setErrorMsg("");
      setStep(3);
    } else {
      setShake(true);
      setErrorMsg(
        choice === "A"
          ? "系统提示：大无语了，机通人类，达标中断。"
          : "系统提示：逻辑无比荒诞，达标中断。"
      );
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleEnter = () => {
    setStep(4);
    setTimeout(() => onEnter(), 500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black text-white overflow-hidden font-mono">
      <style>{`
        @keyframes glitch {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 2px) }
          40% { transform: translate(-2px, -2px) }
          60% { transform: translate(2px, 2px) }
          80% { transform: translate(2px, -2px) }
          100% { transform: translate(0) }
        }
        .glitch-text { animation: glitch 0.2s linear infinite; }
      `}</style>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" exit={{ opacity: 0, filter: "blur(10px)" }} className="text-gray-500 text-sm">
            404 Not Found - nginx/1.18.0
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="flex flex-col items-center text-red-500 glitch-text"
          >
            <p className="text-xl mb-2 tracking-widest">⚠️ 检测到异常频段活动...</p>
            <p className="text-green-500">正在拦截异常网络层...</p>
            <p className="text-green-500 mt-4">确认达标机【跨网异常互助节点】</p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, x: shake ? [-10, 10, -10, 10, 0] : 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md p-6 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl mx-4"
          >
            <h2 className="text-red-400 text-lg font-bold mb-4 border-b border-red-900 pb-2">
              安全验证：请证明你不是毫无价值的机通人类
            </h2>
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
              当你回到家，发现厨房站着一个奇怪的女人在盯着你，此时你最应该做的是？
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleCaptcha("A")}
                className="w-full text-left p-3 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                [A] 马上拨打报警
              </button>
              <button
                onClick={() => handleCaptcha("B")}
                className="w-full text-left p-3 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                [B] 尖叫并疯狂打她
              </button>
              <button
                onClick={() => handleCaptcha("C")}
                className="w-full text-left p-3 text-sm bg-gray-800 hover:bg-green-900 rounded transition-colors border border-transparent hover:border-green-500"
              >
                [C] 打开手机发小红书互助论坛
              </button>
            </div>
            {errorMsg && <p className="mt-4 text-red-500 text-xs animate-pulse">{errorMsg}</p>}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "brightness(0)" }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md p-6 bg-gray-900 border border-green-800 rounded-lg mx-4"
          >
            <h2 className="text-green-500 text-xl font-bold mb-4">《异常互助社区免责协议》</h2>
            <div className="text-gray-400 text-xs space-y-2 mb-8 leading-relaxed">
              <p>1. 本社区发帖人均处于生死边缘、精神崩溃或怪物袭发恐慌期，请网友在围观时保持"瓜吃得不够事大"的基本道德素养。</p>
              <p>2. 如果楼主在互助过程中意外丧失联系（如断气、断天雷劈成渣），本社区不提供怪兽猎人服务。</p>
              <p>3. 你在评论区给出的所有楼主建议，启发的一切因果报应，均与平台无关。</p>
              <p className="text-red-400 font-bold mt-4">4. 警告：请不要直视屏幕中倒映的自己。</p>
            </div>
            <button
              onClick={handleEnter}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-[0_0_15px_rgba(22,163,74,0.5)] transition-all active:scale-95"
            >
              我已阅读并愿意分担人祸，签名吃瓜
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black z-50" />
        )}
      </AnimatePresence>
    </div>
  );
}
