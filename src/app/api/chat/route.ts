import { NextRequest, NextResponse } from "next/server";
import { getPrompt, getConfig } from "@/lib/db";

export const maxDuration = 60;

const FALLBACKS = [
  "等等有人来了我先躲一下……",
  "手机快没电了容我缓缓……",
  "信号太差了等我换个位置……",
  "有情况！等我确认一下再说……",
  "刚才差点被发现，缓一缓……",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { systemPrompt, messages, playerMessage } = body;

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const model = await getConfig("model_flash", "google/gemini-2.5-flash");
    const replyPrompt = await getPrompt("reply_prompt");

    if (!apiKey) {
      return NextResponse.json({ reply: FALLBACKS[0] });
    }

    const recentReplies = (messages || [])
      .filter((m: { role: string }) => m.role === "assistant")
      .slice(-5)
      .map((m: { content: string }) => m.content);

    const noRepeatList = recentReplies.length > 0
      ? `\n\n【你之前说过的话（禁止重复）】：${recentReplies.map((r: string) => `"${r}"`).join("、")}`
      : "";

    const fullSystem = replyPrompt
      ? `${systemPrompt}\n\n${replyPrompt}${noRepeatList}`
      : `${systemPrompt}${noRepeatList}`;

    const chatMessages = [
      { role: "system" as const, content: fullSystem },
      ...(messages || []).slice(-20),
      { role: "user" as const, content: `网友回复：${playerMessage}` },
    ];

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature: 1.2,
        max_tokens: 300,
        frequency_penalty: 0.8,
      }),
    });

    if (!res.ok) {
      console.error("LLM API error:", res.status);
      return NextResponse.json({ reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
    }

    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content?.trim() || "";

    if (!reply || recentReplies.includes(reply)) {
      reply = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
  }
}
