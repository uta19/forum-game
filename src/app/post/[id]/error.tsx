"use client";

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-8 bg-[#f5f5f5]">
      <div className="bg-white rounded-xl p-6 shadow-sm max-w-md w-full text-center">
        <p className="text-4xl mb-4">😵</p>
        <h2 className="font-bold text-lg mb-2">页面出错了</h2>
        <p className="text-sm text-gray-500 mb-4 break-all">{error.message}</p>
        <pre className="text-xs text-left bg-gray-50 p-3 rounded-lg mb-4 overflow-auto max-h-40 text-red-600">
          {error.stack}
        </pre>
        <button
          onClick={reset}
          className="px-6 py-2 bg-[#ff4757] text-white rounded-full text-sm font-medium"
        >
          重试
        </button>
      </div>
    </div>
  );
}
