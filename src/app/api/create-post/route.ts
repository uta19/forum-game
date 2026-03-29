import { NextRequest, NextResponse } from "next/server";
import { createPost, addZone, getPrompt, getConfig } from "@/lib/db";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { zone, identity, crisis } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const model = await getConfig("model_pro", "google/gemini-3.1-pro-preview");
    const creatorPrompt = await getPrompt("creator_prompt");

    if (!apiKey) {
      return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });
    }

    if (!creatorPrompt) {
      return NextResponse.json({ error: "未配置造物主 Prompt" }, { status: 500 });
    }

    const userInput = `板块：${zone} | 身份：${identity} | 初始危机：${crisis}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: creatorPrompt },
          { role: "user", content: userInput },
        ],
        temperature: 1.0,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "LLM 请求失败" }, { status: 502 });
    }

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content?.trim() || "";
    // 清理 markdown 代码块
    text = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

    // 从文本中提取第一个 JSON 对象
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // LLM 可能返回了非纯 JSON，尝试提取 {...} 部分
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("Create post: no JSON found in LLM response:", text.substring(0, 200));
        return NextResponse.json({ error: "AI 生成格式异常，请重试" }, { status: 502 });
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch (e2) {
        console.error("Create post: JSON parse failed:", e2, text.substring(0, 200));
        return NextResponse.json({ error: "AI 生成格式异常，请重试" }, { status: 502 });
      }
    }

    // 兼容 LLM 返回的各种字段名
    const content = parsed.first_message || parsed.content || "";
    const systemPrompt = parsed.system_prompt || parsed.systemPrompt || "";
    // 如果 LLM 没返回 title，从 content 截取前30字作为标题
    const title = parsed.title || (content.length > 30 ? content.substring(0, 30) + "…" : content) || "新帖子";

    if (!content || !systemPrompt) {
      console.error("Create post: missing content or system_prompt in LLM response:", JSON.stringify(parsed).substring(0, 300));
      return NextResponse.json({ error: "AI 生成内容不完整，请重试" }, { status: 502 });
    }

    const postId = `ugc-${Date.now()}`;
    await addZone(zone);
    await createPost({
      id: postId,
      zone,
      isOfficial: false,
      title,
      content,
      systemPrompt,
    });

    return NextResponse.json({ ...parsed, id: postId, title, content });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
