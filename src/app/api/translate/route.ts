import { NextResponse } from "next/server";
import { translateRuToDe, type TranslateKind } from "@/lib/translate/anthropic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }

  const data = body as { ru_text?: unknown; kind?: unknown; style?: unknown };
  const ru_text = typeof data.ru_text === "string" ? data.ru_text : "";
  if (!ru_text.trim()) {
    return NextResponse.json({ error: "ru_text обязателен" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не задан в окружении" },
      { status: 503 }
    );
  }

  const kind = typeof data.kind === "string" ? (data.kind as TranslateKind) : undefined;
  const style = typeof data.style === "string" ? data.style : undefined;

  try {
    const { de_text } = await translateRuToDe({ ru_text, kind, style });
    return NextResponse.json({ de_text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка перевода";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
