import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : undefined,
});

export default pool;

/* ── 建表 ── */

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zones (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      zone TEXT NOT NULL,
      is_official BOOLEAN DEFAULT false,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
  `);
}

/* ── 板块 ── */

export async function getZones(): Promise<string[]> {
  const { rows } = await pool.query("SELECT name FROM zones ORDER BY name");
  return rows.map((r) => r.name);
}

export async function addZone(name: string) {
  await pool.query("INSERT INTO zones (name) VALUES ($1) ON CONFLICT DO NOTHING", [name]);
}

/* ── 帖子 ── */

export interface PostRow {
  id: string;
  zone: string;
  is_official: boolean;
  title: string;
  content: string;
  system_prompt: string;
  created_at: string;
  comment_count: number;
  views: number;
}

export async function getPosts(zone?: string): Promise<PostRow[]> {
  let sql = `
    SELECT p.*, COALESCE(c.cnt, 0)::int AS comment_count
    FROM posts p
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) c ON c.post_id = p.id
  `;
  const params: string[] = [];
  if (zone && zone !== "全部") {
    sql += " WHERE p.zone = $1";
    params.push(zone);
  }
  sql += " ORDER BY p.created_at DESC";
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getPost(id: string) {
  const { rows } = await pool.query("SELECT * FROM posts WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function incrementViews(id: string) {
  await pool.query("UPDATE posts SET views = COALESCE(views,0) + 1 WHERE id = $1", [id]);
}

export async function createPost(post: {
  id: string;
  zone: string;
  isOfficial: boolean;
  title: string;
  content: string;
  systemPrompt: string;
}) {
  await pool.query(
    "INSERT INTO posts (id, zone, is_official, title, content, system_prompt) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
    [post.id, post.zone, post.isOfficial, post.title, post.content, post.systemPrompt]
  );
}

/* ── 评论 ── */

export interface CommentRow {
  id: string;
  post_id: string;
  role: string;
  content: string;
  likes: number;
  created_at: string;
}

export async function getComments(postId: string): Promise<CommentRow[]> {
  const { rows } = await pool.query(
    "SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at",
    [postId]
  );
  return rows;
}

export async function addComment(c: { id: string; postId: string; role: string; content: string; likes?: number }) {
  await pool.query(
    "INSERT INTO comments (id, post_id, role, content, likes) VALUES ($1,$2,$3,$4,$5)",
    [c.id, c.postId, c.role, c.content, c.likes || 0]
  );
}

export async function likeComment(commentId: string) {
  await pool.query("UPDATE comments SET likes = likes + 1 WHERE id = $1", [commentId]);
}

export async function getPrompt(key: string): Promise<string> {
  const { rows } = await pool.query("SELECT value FROM prompts WHERE key = $1", [key]);
  return rows[0]?.value || "";
}

export async function getConfig(key: string, fallback: string = ""): Promise<string> {
  const { rows } = await pool.query("SELECT value FROM config WHERE key = $1", [key]);
  return rows[0]?.value || fallback;
}
