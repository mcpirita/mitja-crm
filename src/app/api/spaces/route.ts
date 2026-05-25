import { NextResponse } from "next/server";
import { z } from "zod";
import { SpaceCreate } from "@/lib/schemas";
import { createSpace, listSpaces } from "@/lib/db/spaces";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bestFor = searchParams.get("best_for");

  try {
    const rows = await listSpaces({
      best_for: bestFor ?? undefined,
    });
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/spaces error:", err);
    return NextResponse.json(
      { error: "Не удалось получить помещения" },
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

  const parsed = SpaceCreate.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const row = await createSpace(parsed.data);
    return NextResponse.json(row, { status: 200 });
  } catch (err) {
    console.error("POST /api/spaces error:", err);
    const msg = err instanceof Error ? err.message : "Не удалось создать помещение";
    // UNIQUE-constraint по name → 409.
    if (msg.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { error: "Помещение с таким названием уже существует" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Не удалось создать помещение" },
      { status: 500 },
    );
  }
}
