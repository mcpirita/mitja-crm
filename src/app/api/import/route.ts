import { NextResponse } from "next/server";
import { LeadCreate } from "@/lib/schemas";
import { getDb } from "@/lib/db/getDb";

export interface ImportError {
  row_index: number;
  message: string;
}

export interface ImportResponse {
  inserted: number;
  errors: ImportError[];
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Невалидный JSON" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { rows?: unknown }).rows)) {
    return NextResponse.json(
      { error: "Ожидается { rows: LeadCreate[] }" },
      { status: 400 }
    );
  }

  const rows = (body as { rows: unknown[] }).rows;
  const errors: ImportError[] = [];
  const toInsert: { input: LeadCreate; row_index: number }[] = [];

  rows.forEach((raw, index) => {
    const parsed = LeadCreate.safeParse(raw);
    if (parsed.success) {
      toInsert.push({ input: parsed.data, row_index: index });
    } else {
      const message = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(row)"}: ${i.message}`)
        .join("; ");
      errors.push({ row_index: index, message });
    }
  });

  let inserted = 0;
  const db = getDb();

  // Вставляем по одному (а не batch), чтобы при ошибке отдельной строки
  // не падал весь импорт — пишем ошибку в errors и едем дальше.
  for (const { input, row_index } of toInsert) {
    try {
      const result = await db.execute({
        sql: `INSERT INTO leads
          (name, company, email, website, country, city, segment, source, status, hook_text, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
        args: [
          input.name,
          input.company,
          input.email ?? null,
          input.website ?? null,
          input.country,
          input.city ?? null,
          input.segment,
          input.source,
          input.status,
          input.hook_text ?? null,
          input.notes ?? null,
        ],
      });
      if (result.rows.length > 0) {
        inserted += 1;
      } else {
        errors.push({ row_index, message: "Не удалось вставить строку" });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка вставки";
      errors.push({ row_index, message });
    }
  }

  const response: ImportResponse = { inserted, errors };
  return NextResponse.json(response);
}
