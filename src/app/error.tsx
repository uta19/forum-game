"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-xl p-6 shadow-sm max-w-md w-full text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="font-bold text-lg mb-2">出错了</h2>
        <p className="text-sm text-gray-500 mb-4 break-all">{error.message}</p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-[#ff4757] text-white rounded-full text-sm"
        >
          重试
        </button>
      </div>
    </div>
  );
}
