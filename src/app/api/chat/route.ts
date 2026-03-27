import { NextRequest, NextResponse } from "next/server";

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
    const model = process.env.LLM_MODEL || "google/gemini-2.5-flash-preview";

    if (!apiKey) {
      return NextResponse.json({
        reply: "信号不好等等……（系统提示：请配置 OPENROUTER_API_KEY 环境变量）",
      });
    }

    // Collect recent assistant replies to prevent repetition
    const recentReplies = (messages || [])
      .filter((m: { role: string }) => m.role === "assistant")
      .slice(-5)
      .map((m: { content: string }) => m.content);

    const noRepeatHint = recentReplies.length > 0
      ? `\n\n【禁止重复】你之前说过的话：${recentReplies.map((r: string) => `"${r}"`).join("、")}。绝对不要重复这些内容，必须说新的东西，推进剧情发展。`
      : "";

    const chatMessages = [
      {
        role: "system" as const,
        content: `${systemPrompt}\n\n【输出要求】\n- 严格控制在15-40字以内，像发弹幕/朋友圈一样短促\n- 完全沉浸角色，不要用"[楼主更新]"等前缀\n- 下面可能有多条网友评论，你需要综合理解后只回复一条，挑最有价值/最有趣的方向回应\n- 听从网友的指挥并播报执行结果\n- 保持角色的语气特征和高频词\n- 每次回复必须推进剧情，不要原地踏步${noRepeatHint}`,
      },
      ...(messages || []).slice(-20),
      {
        role: "user" as const,
        content: `[网友评论汇总]: ${playerMessage}`,
      },
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
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("LLM API error:", res.status, errText.substring(0, 200));
      return NextResponse.json({ reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
    }

    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content?.trim() || "";

    // If reply is empty or duplicates a recent one, use fallback
    if (!reply || recentReplies.includes(reply)) {
      reply = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
  }
}
