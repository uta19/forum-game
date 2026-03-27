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
        max_tokens: 1200,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "LLM 请求失败" }, { status: 502 });
    }

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content?.trim() || "";
    text = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(text);

    const postId = `ugc-${Date.now()}`;
    await addZone(zone);
    await createPost({
      id: postId,
      zone,
      isOfficial: false,
      title: parsed.title,
      content: parsed.first_message || parsed.content,
      systemPrompt: parsed.system_prompt || parsed.systemPrompt,
    });

    return NextResponse.json({ ...parsed, id: postId, content: parsed.first_message || parsed.content });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
