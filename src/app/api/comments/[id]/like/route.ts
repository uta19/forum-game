import { NextRequest, NextResponse } from "next/server";
import { likeComment } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await likeComment(id);
  return NextResponse.json({ ok: true });
}
