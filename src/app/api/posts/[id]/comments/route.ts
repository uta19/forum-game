import { NextRequest, NextResponse } from "next/server";
import { getComments, addComment } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await getComments(id);
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await addComment({ ...body, postId: id });
  return NextResponse.json({ ok: true });
}
