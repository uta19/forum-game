import { NextRequest, NextResponse } from "next/server";
import { getZones, addZone } from "@/lib/db";

export async function GET() {
  const zones = await getZones();
  return NextResponse.json(zones);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (name?.trim()) {
    await addZone(name.trim());
  }
  return NextResponse.json({ ok: true });
}
