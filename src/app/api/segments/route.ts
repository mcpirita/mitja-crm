import { NextResponse } from "next/server";
import { listSegments, createSegment, getSegment } from "@/lib/db/segments";
import { SegmentCreate } from "@/lib/schemas";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("archived") === "1";
  const rows = await listSegments({ includeArchived });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = SegmentCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  // Если slug передан явно и уже занят — 409.
  if (parsed.data.slug) {
    const existing = await getSegment(parsed.data.slug);
    if (existing) {
      return NextResponse.json(
        { error: "Сегмент с таким slug уже существует" },
        { status: 409 },
      );
    }
  }
  try {
    const row = await createSegment(parsed.data);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось создать сегмент";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
