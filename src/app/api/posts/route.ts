import { NextRequest, NextResponse } from "next/server";
import { getPosts, createPost } from "@/lib/db";

export async function GET(req: NextRequest) {
  const zone = req.nextUrl.searchParams.get("zone") || undefined;
  const posts = await getPosts(zone);
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await createPost(body);
  return NextResponse.json({ ok: true });
}
