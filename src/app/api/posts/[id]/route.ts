import { NextRequest, NextResponse } from "next/server";
import { getPost, incrementViews } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  await incrementViews(id);
  return NextResponse.json(post);
}
