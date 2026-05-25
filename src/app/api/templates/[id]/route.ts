import { NextResponse } from "next/server";
import { z } from "zod";
import { EmailTemplateUpdate } from "@/lib/schemas";
import {
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "@/lib/db/templates";

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
    const row = await getTemplate(id);
    if (!row) {
      return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("GET /api/templates/[id] error:", err);
    return NextResponse.json(
      { error: "Не удалось получить шаблон" },
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

  const parsed = EmailTemplateUpdate.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const row = await updateTemplate(id, parsed.data);
    if (!row) {
      return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("PATCH /api/templates/[id] error:", err);
    return NextResponse.json(
      { error: "Не удалось обновить шаблон" },
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
    const ok = await deleteTemplate(id);
    if (!ok) {
      return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/templates/[id] error:", err);
    return NextResponse.json(
      { error: "Не удалось удалить шаблон" },
      { status: 500 },
    );
  }
}
