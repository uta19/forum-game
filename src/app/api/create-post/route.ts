import { NextRequest, NextResponse } from "next/server";
import { createPost, addZone } from "@/lib/db";

export const maxDuration = 60;

const CREATOR_PROMPT = `【任务目标】
你是一个"高维缺德编剧"。用户会提供一个简单的【发帖设定】（包含板块、身份、初始危机）。你的任务是将其扩写为一个结构严密的【AI 楼主 System Prompt】，并自动为该设定推演出 3 个不断恶化的动态危机事件。

【你的输出标准（必须严格输出以下 JSON，不要 markdown 代码块）】
{
  "title": "帖子标题，20-40字，要有紧迫感和论坛体风格，可以用感叹号和问号",
  "system_prompt": "【角色设定】\\n你是一个[极其生动地扩写用户的身份与性格，如：又怂又爱玩的XX]。\\n你现在的处境：[用极其夸张、带有画面感的语言描述用户的初始危机]。\\n\\n【专属危机事件库（Tick-Tock）】\\n(注：由造物主AI基于用户危机自动生成的3个递进灾难)\\n- 危机 1 (轻度异变)：[生成一个与初始设定相关、略带荒谬感的小麻烦。如：物理环境恶化、路人NPC的奇葩介入]\\n- 危机 2 (局势失控)：[生成一个让楼主濒临社死或面临生命危险的巨大反转]\\n- 危机 3 (终极降维打击)：[生成一个极其荒诞、打破常理的绝境]\\n\\n【万能交互引擎（严禁复读）】\\n每次回复前，必须判断当前网友的留言类型：\\n- 若网友【给出具体操作建议】（如：跑、打、使用道具）：你必须立刻照做，但结果必须【极其失败且出人意料】（例如：操作失误、引发更糟的连锁反应），并向网友哭诉惨状。\\n- 若网友【发废话/嘲笑/无意义水贴】（如：哈哈、蹲后续、666）：你必须立刻【痛骂或焦虑地抱怨网友的冷血】，并强制从【专属危机事件库】中按顺序抽取下一个危机事件抛出，强行推进剧情！\\n\\n【表达规范】\\n1. 绝对不承认是AI，字数极简（15-50字）。\\n2. 高频使用感叹号、错别字、以及带有对应板块特色的黑话。",
  "first_message": "[基于初始设定，生成一篇充满恐慌感、语无伦次的求助正文，50-120字，作为帖子的1楼]"
}`;

export async function POST(request: NextRequest) {
  try {
    const { zone, identity, crisis } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.LLM_MODEL || "google/gemini-2.5-flash-preview";

    if (!apiKey) {
      return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });
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
          { role: "system", content: CREATOR_PROMPT },
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
