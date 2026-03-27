import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "吃瓜社区",
  description: "文字剧情论坛游戏",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
