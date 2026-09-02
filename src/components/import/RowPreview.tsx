"use client";

import { IMPORTABLE_FIELDS, type ImportableField } from "@/lib/import/csv";
import { LEAD_STATUSES } from "@/lib/schemas";

const FIELD_LABELS_RU: Record<ImportableField, string> = {
  name: "Имя",
  company: "Компания",
  email: "Email",
  segment: "Сегмент",
  status: "Статус",
  city: "Город",
  hook_text: "Хук",
};

interface Props {
  mapped: Record<string, string | undefined>[];
  // Slugs of known segments; empty array = skip segment validation (back-compat).
  validSegmentSlugs?: string[];
}

function isCellInvalid(
  field: ImportableField,
  value: string | undefined,
  validSegmentSlugs: string[],
): boolean {
  if (field === "name" || field === "company") {
    return !value || value.length === 0;
  }
  if (field === "segment") {
    if (!value) return true;
    if (validSegmentSlugs.length === 0) return false;
    return !validSegmentSlugs.includes(value);
  }
  if (field === "status") {
    if (!value) return false; // default "new"
    return !(LEAD_STATUSES as readonly string[]).includes(value);
  }
  return false;
}

export function RowPreview({ mapped, validSegmentSlugs = [] }: Props) {
  const previewRows = mapped.slice(0, 10);

  if (previewRows.length === 0) {
    return null;
  }

  return (
    <div className="panel p-5 overflow-x-auto">
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[.22em] text-[var(--dim)] mb-3">
        Превью (первые {previewRows.length} из {mapped.length})
      </h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-600">
            <th className="px-2 py-2 font-medium">#</th>
            {IMPORTABLE_FIELDS.map((f) => (
              <th key={f} className="px-2 py-2 font-medium">
                {FIELD_LABELS_RU[f]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, idx) => (
            <tr key={idx} className="border-b border-zinc-100">
              <td className="px-2 py-2 text-zinc-500">{idx + 1}</td>
              {IMPORTABLE_FIELDS.map((f) => {
                const value = row[f];
                const invalid = isCellInvalid(f, value, validSegmentSlugs);
                return (
                  <td
                    key={f}
                    className={
                      "px-2 py-2 " +
                      (invalid
                        ? "bg-rose-50 text-rose-900"
                        : "text-zinc-800")
                    }
                  >
                    {value ?? <span className="text-zinc-400">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
