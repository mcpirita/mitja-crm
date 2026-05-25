"use client";

import type { ColumnMapping, ImportableField } from "@/lib/import/csv";
import { IMPORTABLE_FIELDS } from "@/lib/import/csv";

const FIELD_LABELS_RU: Record<ImportableField, string> = {
  name: "Имя",
  company: "Компания",
  email: "Email",
  segment: "Сегмент",
  status: "Статус",
  city: "Город",
  hook_text: "Хук",
};

const REQUIRED: Record<ImportableField, boolean> = {
  name: true,
  company: true,
  email: false,
  segment: true,
  status: false,
  city: false,
  hook_text: false,
};

interface Props {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
}

export function ColumnMapper({ headers, mapping, onChange }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-medium text-zinc-900 mb-3">Сопоставление колонок</h2>
      <p className="text-sm text-zinc-600 mb-4">
        Выберите, какая колонка CSV соответствует полю лида. Поля, отмеченные звёздочкой, обязательны.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {IMPORTABLE_FIELDS.map((field) => (
          <label key={field} className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">
              {FIELD_LABELS_RU[field]}
              {REQUIRED[field] ? <span className="text-rose-600"> *</span> : null}
            </span>
            <select
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              value={mapping[field] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                onChange({ ...mapping, [field]: value === "" ? null : value });
              }}
            >
              <option value="">— не использовать —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
