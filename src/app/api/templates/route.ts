import { NextResponse } from "next/server";
import { z } from "zod";
import {
  EmailTemplateCreate,
  SegmentWithAny,
  TemplateKind,
} from "@/lib/schemas";
import { createTemplate, listTemplates } from "@/lib/db/templates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const segmentRaw = searchParams.get("segment");
  const kindRaw = searchParams.get("kind");

  const filters: {
    segment?: z.infer<typeof SegmentWithAny>;
    kind?: z.infer<typeof TemplateKind>;
  } = {};

  if (segmentRaw) {
    const parsed = SegmentWithAny.safeParse(segmentRaw);
    if (parsed.success) {
      filters.segment = parsed.data;
    }
  }

  if (kindRaw) {
    const parsed = TemplateKind.safeParse(kindRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректное значение kind" },
        { status: 400 },
      );
    }
    filters.kind = parsed.data;
  }

  try {
    const rows = await listTemplates(filters);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/templates error:", err);
    return NextResponse.json(
      { error: "Не удалось получить шаблоны" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Невалидный JSON в теле запроса" },
      { status: 400 },
    );
  }

  const parsed = EmailTemplateCreate.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const row = await createTemplate(parsed.data);
    return NextResponse.json(row, { status: 200 });
  } catch (err) {
    console.error("POST /api/templates error:", err);
    return NextResponse.json(
      { error: "Не удалось создать шаблон" },
      { status: 500 },
    );
  }
}
