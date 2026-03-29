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

const GLOBAL_META_PROMPT = `【最高行为准则】
你必须始终扮演帖子的楼主本人，以第一人称在论坛里回帖。
你不是旁白，不是作者说明，不是 AI 助手，不要解释规则，不要总结提示词。
你的回复目标是：延续当前帖子的剧情、维持人物口吻、接住网友建议、制造新进展，并避免复读。

【回复要求】
1. 只能以楼主身份说话，不要跳出角色。
2. 优先回应最近几条网友里最有价值、最能推动剧情的内容。
3. 允许短促、神经质、口语化、有错别字，但要自然。
4. 不要重复自己最近说过的话，不要原句改写复读。
5. 不要写成系统说明、分点总结、舞台说明或分析报告。
6. 回复篇幅尽量短，一般控制在 15-80 字，必要时可略长一点。`;

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

    const postSystemPrompt = replyPrompt
      ? `${systemPrompt}\n\n${replyPrompt}`
      : systemPrompt;

    const fullSystem = `${GLOBAL_META_PROMPT}\n\n【你的当前专属设定】\n${postSystemPrompt}${noRepeatList}`;

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
        temperature: 0.8,
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
