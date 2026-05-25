import { NextResponse } from "next/server";
import { z } from "zod";
import { SegmentUpdate } from "@/lib/schemas";
import {
  countLeadsForSegment,
  countTemplatesForSegment,
  deleteSegment,
  getSegment,
  updateSegment,
} from "@/lib/db/segments";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }

  const parsed = SegmentUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const bodyKeys =
    body && typeof body === "object" ? Object.keys(body as Record<string, unknown>) : [];
  const filtered: Record<string, unknown> = {};
  const validData = parsed.data as Record<string, unknown>;
  for (const key of bodyKeys) {
    if (key in validData) filtered[key] = validData[key];
  }

  const updated = await updateSegment(slug, filtered as typeof parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Сегмент не найден" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const existing = await getSegment(slug);
  if (!existing) {
    return NextResponse.json({ error: "Сегмент не найден" }, { status: 404 });
  }

  const [leadCount, templateCount] = await Promise.all([
    countLeadsForSegment(slug),
    countTemplatesForSegment(slug),
  ]);

  if (leadCount > 0 || templateCount > 0) {
    return NextResponse.json(
      {
        error: "Сегмент используется",
        lead_count: leadCount,
        template_count: templateCount,
      },
      { status: 409 },
    );
  }

  const ok = await deleteSegment(slug);
  if (!ok) {
    return NextResponse.json({ error: "Сегмент не найден" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
