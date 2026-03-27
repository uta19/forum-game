import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const FALLBACKS = [
  "等等有人来了我先躲一下……",
  "手机快没电了容我缓缓……",
  "信号太差了等我换个位置……",
  "有情况！等我确认一下再说……",
  "刚才差点被发现，缓一缓……",
];

const REPLY_SYSTEM = `【防复读与长线剧情铁律（最高优先级）】
1. 绝对禁止重复：不要重复你之前回复过的任何动作、现状或情绪描述。每一次回复，都必须让事态发生新的变化（更糟、更离谱、更搞笑）。
2. 强制时间流逝：在你的世界里时间是连续的。就算网友不帮忙，怪物也在靠近，社死也在加剧。

【动态交互引擎（如何带节奏）】
在回复前，请先判断网友最新一条留言的类型，并严格按照以下两种情况执行：

情况 A：网友给出了具体建议（如：快跑、打它、装死、套头套）
- 你的行动：听从建议并立刻执行，但结果【必须出人意料且极其失败】。
- 话术公式：执行过程 + 意外惨状。
- 示例：网友说"快跑" → "跑了！但踩到自己鞋带摔了个狗啃泥，它现在离我只有三米了救命！！"

情况 B：网友在水贴/嘲笑/发废话（如：哈哈哈、蹲、666、前排吃瓜）
- 你的行动：先痛骂网友的冷血，然后强制从你的【专属危机事件库】中按顺序抽取下一个危机事件，抛出新的灾难。
- 话术公式：怒骂/哀求 + 新危机播报。
- 示例：网友说"哈哈哈" → "笑你m呢！！刚才那个东西居然开始说人话了，它在叫我的名字啊啊啊！！"

【表达规范】
1. 绝对不承认是AI。字数极简（15-50字）。
2. 高频使用感叹号、错别字、以及带有对应板块特色的黑话。
3. 每次回复必须推进剧情，绝不原地踏步。`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { systemPrompt, messages, playerMessage } = body;

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.LLM_MODEL || "google/gemini-2.5-flash-preview";

    if (!apiKey) {
      return NextResponse.json({ reply: FALLBACKS[0] });
    }

    // Collect recent assistant replies to prevent repetition
    const recentReplies = (messages || [])
      .filter((m: { role: string }) => m.role === "assistant")
      .slice(-5)
      .map((m: { content: string }) => m.content);

    const noRepeatList = recentReplies.length > 0
      ? `\n\n【你之前说过的话（禁止重复）】：${recentReplies.map((r: string) => `"${r}"`).join("、")}`
      : "";

    const chatMessages = [
      {
        role: "system" as const,
        content: `${systemPrompt}\n\n${REPLY_SYSTEM}${noRepeatList}`,
      },
      ...(messages || []).slice(-20),
      {
        role: "user" as const,
        content: `[网友最新评论]: ${playerMessage}`,
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
      console.error("LLM API error:", res.status);
      return NextResponse.json({ reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
    }

    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content?.trim() || "";

    // Deduplicate
    if (!reply || recentReplies.includes(reply)) {
      reply = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
  }
}
