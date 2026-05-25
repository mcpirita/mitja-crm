import { NextResponse } from "next/server";
import { z } from "zod";
import { TemplateKind } from "@/lib/schemas";
import { getLead } from "@/lib/db/leads";
import { get as getSettings } from "@/lib/db/settings";
import { listForLead } from "@/lib/db/leadSpaces";
import { generateEmail } from "@/lib/generate/anthropic";

const Body = z.object({
  lead_id: z.number().int().positive(),
  kind: TemplateKind,
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { lead_id, kind } = parsed.data;
  const lead = await getLead(lead_id);
  if (!lead) {
    return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
  }

  let settings;
  try {
    settings = await getSettings();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Не удалось прочитать настройки" },
      { status: 500 },
    );
  }

  // Подгружаем привязанные помещения (только активные для генерации статусы).
  const allLinks = await listForLead(lead_id);
  const activeSpaces = allLinks
    .filter((l) => l.status === "considering" || l.status === "expose_sent")
    .map((l) => l.space);

  try {
    const result = await generateEmail({
      lead,
      kind,
      offerDescription: settings.offer_description,
      spaces: activeSpaces.length > 0 ? activeSpaces : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ошибка генерации";
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    if (msg.includes("Оффер")) {
      return NextResponse.json({ error: msg }, { status: 412 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
