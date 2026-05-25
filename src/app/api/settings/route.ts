import { NextResponse } from "next/server";
import { get, update } from "@/lib/db/settings";
import { SettingsUpdate } from "@/lib/schemas";

export async function GET() {
  try {
    const row = await get();
    return NextResponse.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }

  const parsed = SettingsUpdate.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Невалидные данные", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const updated = await update(parsed.data);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
