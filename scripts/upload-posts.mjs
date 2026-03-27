/**
 * 批量导入/更新帖子脚本
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
 *     "id": "xiuxian_1",           // 已有 id 则更新，新 id 则插入
 *     "zone": "修仙渡劫",
 *     "title": "...",
 *     "content": "...",
 *     "system_prompt": "..."
 *   }
 * ]
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
  let inserted = 0;
  let skipped = 0;

  for (const p of posts) {
    if (!p.id || !p.title || !p.content || !p.system_prompt) {
      console.log(`  ⏭️  跳过（缺少必要字段）: ${p.id || "无id"}`);
      skipped++;
      continue;
    }

    // Check if exists
    const { rows } = await pool.query("SELECT id FROM posts WHERE id = $1", [p.id]);

    if (rows.length > 0) {
      // Update
      await pool.query(
        "UPDATE posts SET title = $1, content = $2, system_prompt = $3, zone = COALESCE($4, zone) WHERE id = $5",
        [p.title, p.content, p.system_prompt, p.zone || null, p.id]
      );
      console.log(`  ✏️  更新: ${p.id} — ${p.title.substring(0, 35)}...`);
      updated++;
    } else {
      // Insert
      await pool.query(
        "INSERT INTO posts (id, zone, is_official, title, content, system_prompt) VALUES ($1, $2, $3, $4, $5, $6)",
        [p.id, p.zone || "异世界日常", p.is_official !== false, p.title, p.content, p.system_prompt]
      );
      console.log(`  ➕ 新增: ${p.id} — ${p.title.substring(0, 35)}...`);
      inserted++;
    }
  }

  console.log(`\n🎉 完成！${updated} 更新，${inserted} 新增，${skipped} 跳过`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
