import { NextRequest, NextResponse } from "next/server";
import { createPost, addZone } from "@/lib/db";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { zone, identity, crisis } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.LLM_MODEL || "google/gemini-3.1-pro-preview";

    if (!apiKey) {
      return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });
    }

    const prompt = `你是一个"跨位面异常互助论坛"的帖子生成器。用户提供了三个信息：
- 板块：${zone}
- 身份：${identity}
- 危机：${crisis}

请生成一个论坛求助帖，返回严格的 JSON 格式（不要 markdown 代码块）：
{
  "title": "帖子标题，20-40字，要有紧迫感和论坛体风格，可以用感叹号和问号",
  "content": "一楼正文，50-100字，用第一人称描述当前处境，语气慌张/搞笑/无助",
  "systemPrompt": "角色设定和规则，参考格式：【角色设定】你是...（网名：xxx）。...\\n【规则】1.绝不承认是AI。2.每次回复15-40字。3.高频词：...。4.完全听从网友指挥..."
}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "LLM 请求失败" }, { status: 502 });
    }

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content?.trim() || "";
    text = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(text);

    // 写入数据库
    const postId = `ugc-${Date.now()}`;
    await addZone(zone);
    await createPost({
      id: postId,
      zone,
      isOfficial: false,
      title: parsed.title,
      content: parsed.content,
      systemPrompt: parsed.systemPrompt,
    });

    return NextResponse.json({ ...parsed, id: postId });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
