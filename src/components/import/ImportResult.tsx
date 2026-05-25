"use client";

interface ImportError {
  row_index: number;
  message: string;
}

interface Props {
  title: string;
  inserted?: number;
  validCount?: number;
  errors: ImportError[];
}

export function ImportResult({ title, inserted, validCount, errors }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-medium text-zinc-900 mb-3">{title}</h2>
      <div className="text-sm text-zinc-700 space-y-1">
        {typeof inserted === "number" ? (
          <p>
            Импортировано: <span className="font-medium text-emerald-700">{inserted}</span>
          </p>
        ) : null}
        {typeof validCount === "number" ? (
          <p>
            К импорту: <span className="font-medium text-emerald-700">{validCount}</span>
          </p>
        ) : null}
        <p>
          Ошибок: <span className={errors.length > 0 ? "font-medium text-rose-700" : "font-medium text-zinc-700"}>{errors.length}</span>
        </p>
      </div>
      {errors.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-rose-800 max-h-64 overflow-y-auto">
          {errors.map((e, i) => (
            <li key={i} className="rounded bg-rose-50 px-2 py-1">
              Строка {e.row_index + 1}: {e.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
