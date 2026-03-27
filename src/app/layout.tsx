import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";

export const metadata: Metadata = {
  title: "跨位面异常互助论坛",
  description: "遇事不决，发帖就对了",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
