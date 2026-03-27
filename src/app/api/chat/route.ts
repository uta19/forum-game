import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { systemPrompt, stage, messages, playerMessage } = body;

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.LLM_MODEL || "google/gemini-3.1-pro-preview";

    if (!apiKey) {
      return NextResponse.json({
        reply: `信号不好等等……（系统提示：请配置 OPENROUTER_API_KEY 环境变量）`,
        advanceStage: false,
      });
    }

    const stageInstruction = `当前剧情处于第 ${stage + 1} 阶段。请按照该阶段的剧情状态机来回复。如果该阶段已经展开了足够多的互动（至少3-5轮对话），可以在回复末尾加上 [ADVANCE_STAGE] 来推进到下一阶段。最后一个阶段不要再加这个标记。`;

    const chatMessages = [
      {
        role: "system" as const,
        content: `${systemPrompt}\n\n${stageInstruction}\n\n【输出要求】\n- 严格控制在15-40字以内，像发弹幕/朋友圈一样短促\n- 完全沉浸角色，不要用"[楼主更新]"等前缀\n- 下面可能有多条网友评论，你需要综合理解后只回复一条，挑最有价值/最有趣的方向回应\n- 听从网友的指挥并播报执行结果\n- 保持角色的语气特征和高频词`,
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
        temperature: 0.9,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("LLM API error:", res.status, errText.substring(0, 200));
      return NextResponse.json({
        reply: "卧槽信号断了等等，我换个地方蹲……",
        advanceStage: false,
      });
    }

    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content?.trim() || "";

    const advanceStage = reply.includes("[ADVANCE_STAGE]");
    reply = reply.replace(/\[ADVANCE_STAGE\]/g, "").trim();

    if (!reply) {
      reply = "等等有情况，容我缓缓……";
    }

    return NextResponse.json({ reply, advanceStage });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      reply: "救命手机要没电了等等！！",
      advanceStage: false,
    });
  }
}
