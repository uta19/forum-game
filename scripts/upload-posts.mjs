/**
 * 只更新官方帖的批量脚本
 *
 * 用法：
 *   DATABASE_URL="postgresql://..." node scripts/upload-posts.mjs
 *   DATABASE_URL="postgresql://..." node scripts/upload-posts.mjs scripts/my-custom-file.json
 *
 * 默认读取 scripts/optimized-posts.json
 *
 * JSON 格式（数组）：
 * [
 *   {
 *     "id": "official_1",
 *     "zone": "育才同城",
 *     "title": "...",
 *     "content": "...",
 *     "system_prompt": "..."
 *   }
 * ]
 *
 * 规则：
 * - 只更新数据库里已存在的官方帖（is_official = true）
 * - 不新增新帖子
 * - 非官方帖或不存在的 id 直接跳过
 */
import pg from "pg";
import fs from "fs";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const filePath = process.argv[2] || "scripts/optimized-posts.json";

  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    console.error(`请先运行 optimize-posts.mjs 生成，或手动创建 JSON 文件`);
    process.exit(1);
  }

  const posts = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`📦 读取到 ${posts.length} 条帖子\n`);

  let updated = 0;
  let skipped = 0;

  for (const p of posts) {
    if (!p.id || !p.title || !p.content || !p.system_prompt) {
      console.log(`  ⏭️  跳过（缺少必要字段）: ${p.id || "无id"}`);
      skipped++;
      continue;
    }

    const { rows } = await pool.query(
      "SELECT id FROM posts WHERE id = $1 AND is_official = true",
      [p.id]
    );

    if (rows.length === 0) {
      console.log(`  ⏭️  跳过（不是官方帖或数据库里不存在）: ${p.id}`);
      skipped++;
      continue;
    }

    await pool.query(
      "UPDATE posts SET title = $1, content = $2, system_prompt = $3, zone = COALESCE($4, zone) WHERE id = $5 AND is_official = true",
      [p.title, p.content, p.system_prompt, p.zone || null, p.id]
    );
    console.log(`  ✏️  更新官方帖: ${p.id} — ${p.title.substring(0, 35)}...`);
    updated++;
  }

  console.log(`\n🎉 完成！${updated} 条官方帖已更新，${skipped} 条跳过`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
