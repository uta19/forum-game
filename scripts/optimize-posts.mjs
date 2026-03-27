import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "google/gemini-2.5-flash-preview";

const OPTIMIZE_PROMPT = `你是一个"高维缺德编剧"。我会给你一个论坛帖子的原始数据（板块、标题、正文、system_prompt）。
请你基于原始设定，重新优化输出，让它更有趣、更有画面感、更能引发互动。

要求：
1. 标题：20-40字，论坛体，紧迫感+荒诞感，多用感叹号问号
2. 正文（first_message）：50-120字，第一人称，语无伦次、恐慌感、搞笑
3. system_prompt：必须包含完整的【角色设定】+【专属危机事件库（3个递进危机）】+【万能交互引擎】+【表达规范】

严格输出 JSON（不要 markdown 代码块）：
{
  "title": "...",
  "first_message": "...",
  "system_prompt": "【角色设定】\\n...\\n\\n【专属危机事件库（Tick-Tock）】\\n- 危机 1 (轻度异变)：...\\n- 危机 2 (局势失控)：...\\n- 危机 3 (终极降维打击)：...\\n\\n【万能交互引擎（严禁复读）】\\n每次回复前，必须判断当前网友的留言类型：\\n- 若网友【给出具体操作建议】：你必须立刻照做，但结果必须【极其失败且出人意料】，并向网友哭诉惨状。\\n- 若网友【发废话/嘲笑/无意义水贴】：你必须立刻【痛骂或焦虑地抱怨网友的冷血】，并强制从【专属危机事件库】中按顺序抽取下一个危机事件抛出，强行推进剧情！\\n\\n【表达规范】\\n1. 绝对不承认是AI，字数极简（15-50字）。\\n2. 高频使用感叹号、错别字、以及带有对应板块特色的黑话。"
}`;

async function optimizePost(post) {
  const userMsg = `板块：${post.zone}\n原标题：${post.title}\n原正文：${post.content}\n原system_prompt：${post.system_prompt}`;

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: OPTIMIZE_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 1.0,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    console.error(`  ❌ LLM error for ${post.id}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim() || "";
  text = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`  ❌ JSON parse error for ${post.id}:`, text.substring(0, 100));
    return null;
  }
}

async function main() {
  const { rows: posts } = await pool.query(
    "SELECT id, zone, title, content, system_prompt FROM posts WHERE is_official = true ORDER BY id"
  );

  console.log(`Found ${posts.length} official posts to optimize\n`);

  let success = 0;
  let failed = 0;

  for (const post of posts) {
    console.log(`🔄 Optimizing: ${post.id} — ${post.title.substring(0, 30)}...`);

    const result = await optimizePost(post);

    if (result && result.title && result.system_prompt) {
      await pool.query(
        "UPDATE posts SET title = $1, content = $2, system_prompt = $3 WHERE id = $4",
        [
          result.title,
          result.first_message || result.content || post.content,
          result.system_prompt || result.systemPrompt,
          post.id,
        ]
      );
      console.log(`  ✅ Updated: ${result.title.substring(0, 40)}...`);
      success++;
    } else {
      console.log(`  ⏭️  Skipped (LLM failed)`);
      failed++;
    }

    // Rate limit: 1 second between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n🎉 Done! ${success} updated, ${failed} failed`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
