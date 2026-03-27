/**
 * 批量优化帖子脚本
 * 
 * 用法：
 *   DATABASE_URL="postgresql://..." OPENROUTER_API_KEY="sk-or-..." node scripts/optimize-posts.mjs
 * 
 * 功能：
 *   1. 从数据库读取所有 is_official=true 的帖子
 *   2. 用 LLM 逐条重写 title、content、system_prompt
 *   3. 先导出到 optimized-posts.json，你可以检查后再用 upload-posts.mjs 导入
 */
import pg from "pg";
import fs from "fs";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = process.env.LLM_MODEL || "google/gemini-2.5-flash";

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
  "system_prompt": "【角色设定】\\n...\\n\\n【专属危机事件库（Tick-Tock）】\\n- 危机 1 (轻度异变)：...\\n- 危机 2 (局势失控)：...\\n- 危机 3 (终极降维打击)：...\\n\\n【万能交互引擎（严禁复读）】\\n...\\n\\n【表达规范】\\n..."
}`;

async function optimizePost(post) {
  const userMsg = `板块：${post.zone}\n原标题：${post.title}\n原正文：${post.content}\n原system_prompt片段：${post.system_prompt.substring(0, 300)}`;

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
    const errText = await res.text();
    console.error(`  ❌ LLM error ${res.status}: ${errText.substring(0, 100)}`);
    return null;
  }

  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim() || "";
  text = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`  ❌ JSON parse error:`, text.substring(0, 100));
    return null;
  }
}

async function main() {
  if (!API_KEY) { console.error("请设置 OPENROUTER_API_KEY"); process.exit(1); }

  const { rows: posts } = await pool.query(
    "SELECT id, zone, title, content, system_prompt FROM posts WHERE is_official = true ORDER BY id"
  );

  console.log(`📋 找到 ${posts.length} 条官方帖子\n`);

  const results = [];
  let success = 0, failed = 0;

  for (const post of posts) {
    console.log(`🔄 [${success + failed + 1}/${posts.length}] ${post.id} — ${post.title.substring(0, 30)}...`);

    const result = await optimizePost(post);

    if (result && result.title && result.system_prompt) {
      results.push({
        id: post.id,
        zone: post.zone,
        title: result.title,
        content: result.first_message || result.content || post.content,
        system_prompt: result.system_prompt,
      });
      console.log(`  ✅ → ${result.title.substring(0, 40)}...`);
      success++;
    } else {
      // 保留原始数据
      results.push({
        id: post.id,
        zone: post.zone,
        title: post.title,
        content: post.content,
        system_prompt: post.system_prompt,
        _skipped: true,
      });
      console.log(`  ⏭️  跳过（保留原始）`);
      failed++;
    }

    // 限速 1.5s
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 写入 JSON 文件
  const outPath = "scripts/optimized-posts.json";
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");

  console.log(`\n🎉 完成！${success} 成功，${failed} 跳过`);
  console.log(`📄 结果已保存到 ${outPath}`);
  console.log(`👉 检查后运行: DATABASE_URL="..." node scripts/upload-posts.mjs`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
