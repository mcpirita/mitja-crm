import { NextResponse } from "next/server";
import { z } from "zod";
import { SpaceUpdate } from "@/lib/schemas";
import { deleteSpace, getSpace, updateSpace } from "@/lib/db/spaces";

type Ctx = { params: Promise<{ id: string }> };

function parseId(idRaw: string): number | null {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  try {
    const row = await getSpace(id);
    if (!row) {
      return NextResponse.json({ error: "Помещение не найдено" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("GET /api/spaces/[id] error:", err);
    return NextResponse.json(
      { error: "Не удалось получить помещение" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Невалидный JSON в теле запроса" },
      { status: 400 },
    );
  }

  const parsed = SpaceUpdate.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  // Берём только те ключи, которые реально пришли (как в leads).
  const bodyKeys =
    json && typeof json === "object" ? Object.keys(json as Record<string, unknown>) : [];
  const filtered: Record<string, unknown> = {};
  const validData = parsed.data as Record<string, unknown>;
  for (const key of bodyKeys) {
    if (key in validData) filtered[key] = validData[key];
  }

  try {
    const row = await updateSpace(id, filtered as typeof parsed.data);
    if (!row) {
      return NextResponse.json({ error: "Помещение не найдено" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("PATCH /api/spaces/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Не удалось обновить помещение";
    if (msg.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { error: "Помещение с таким названием уже существует" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Не удалось обновить помещение" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  try {
    const ok = await deleteSpace(id);
    if (!ok) {
      return NextResponse.json({ error: "Помещение не найдено" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/spaces/[id] error:", err);
    return NextResponse.json(
      { error: "Не удалось удалить помещение" },
      { status: 500 },
    );
  }
}
