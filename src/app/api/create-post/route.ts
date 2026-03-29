import { NextRequest, NextResponse } from "next/server";
import { createPost, addZone, addComment, getPrompt, getConfig } from "@/lib/db";

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
    console.log("Create post LLM status:", res.status, "model:", model);
    console.log("Create post LLM finish_reason:", data.choices?.[0]?.finish_reason);
    let text = data.choices?.[0]?.message?.content?.trim() || "";
    console.log("Create post raw text length:", text.length, "first 100:", text.substring(0, 100));
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

    // 异步生成20条精彩评论（不阻塞返回）
    generateInitialComments(postId, title, content, systemPrompt, apiKey, baseUrl).catch((e) =>
      console.error("Generate initial comments error:", e)
    );

    return NextResponse.json({ ...parsed, id: postId, title, content });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}

async function generateInitialComments(
  postId: string,
  title: string,
  content: string,
  systemPrompt: string,
  apiKey: string,
  baseUrl: string
) {
  const model = await getConfig("model_flash", "google/gemini-2.5-flash");

  const prompt = `你现在要为一个论坛帖子生成20条精彩的模拟评论，模拟真实论坛的热闹氛围。

帖子标题：${title}
帖子内容：${content}
楼主人设：${systemPrompt.substring(0, 300)}

要求：
- 生成一个JSON数组，包含20个对象
- 每个对象有 role 和 content 两个字段
- role 交替为 "user"（吃瓜网友）和 "assistant"（楼主回复）
- 奇数位（1,3,5...）是网友评论，偶数位（2,4,6...）是楼主回复
- 网友评论要多样化：有出主意的、有吐槽的、有起哄的、有关心的
- 楼主回复要符合人设，短促口语化（5-30字），带有角色特色
- 所有内容要自然真实，像真人在论坛互动
- 严格返回JSON数组格式：[{"role":"user","content":"..."},{"role":"assistant","content":"..."},...]`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 1.0,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    console.error("Generate comments LLM failed:", res.status);
    return;
  }

  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim() || "";
  text = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

  let comments: { role: string; content: string }[] = [];
  try {
    const parsed = JSON.parse(text);
    comments = Array.isArray(parsed) ? parsed : parsed.comments || parsed.data || [];
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try { comments = JSON.parse(match[0]); } catch { /* skip */ }
    }
  }

  if (!Array.isArray(comments) || comments.length === 0) {
    console.error("Generate comments: no valid array found");
    return;
  }

  // 写入数据库
  for (let i = 0; i < Math.min(comments.length, 20); i++) {
    const c = comments[i];
    if (!c.role || !c.content) continue;
    const role = c.role === "assistant" ? "assistant" : "user";
    await addComment({
      id: `${postId}-c${i}`,
      postId,
      role,
      content: c.content,
      likes: role === "assistant" ? 0 : Math.floor(Math.random() * 15),
    });
  }
  console.log(`Generated ${Math.min(comments.length, 20)} initial comments for ${postId}`);
}
