import { getDb } from "./getDb";
import { SettingsRow, type SettingsUpdate, type SettingsRow as SettingsRowType } from "@/lib/schemas";

export async function get(): Promise<SettingsRowType> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id, translation_style, signature_ru, signature_de, updated_at FROM settings WHERE id = 1",
    args: [],
  });
  const row = result.rows[0];
  if (!row) {
    throw new Error("Строка settings id=1 не найдена. Запусти миграции.");
  }
  const parsed = SettingsRow.parse({
    id: 1,
    translation_style: row.translation_style as string,
    signature_ru: row.signature_ru as string,
    signature_de: row.signature_de as string,
    updated_at: row.updated_at as string,
  });
  return parsed;
}

export async function update(patch: Partial<SettingsUpdate>): Promise<SettingsRowType> {
  const db = getDb();

  const fields: string[] = [];
  const args: (string | number)[] = [];

  if (patch.translation_style !== undefined) {
    fields.push("translation_style = ?");
    args.push(patch.translation_style);
  }
  if (patch.signature_ru !== undefined) {
    fields.push("signature_ru = ?");
    args.push(patch.signature_ru);
  }
  if (patch.signature_de !== undefined) {
    fields.push("signature_de = ?");
    args.push(patch.signature_de);
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    await db.execute({
      sql: `UPDATE settings SET ${fields.join(", ")} WHERE id = 1`,
      args,
    });
  }

  return get();
}
