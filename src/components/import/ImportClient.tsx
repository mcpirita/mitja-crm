"use client";

import { useMemo, useState } from "react";
import {
  parseCsv,
  autoMap,
  mapRows,
  validateRows,
  type ColumnMapping,
  type ParsedCsv,
  type ValidationError,
} from "@/lib/import/csv";
import { ColumnMapper } from "./ColumnMapper";
import { RowPreview } from "./RowPreview";
import { ImportResult } from "./ImportResult";

interface ServerResult {
  inserted: number;
  errors: ValidationError[];
}

export function ImportClient() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);

  const [dryRun, setDryRun] = useState<{ validCount: number; errors: ValidationError[] } | null>(
    null
  );
  const [serverResult, setServerResult] = useState<ServerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mapped = useMemo(() => {
    if (!parsed) return [];
    return mapRows(parsed.rows, mapping);
  }, [parsed, mapping]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setDryRun(null);
    setServerResult(null);
    setSubmitError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setParseError("Не удалось прочитать файл");
    };
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const result = parseCsv(text);
        if (result.headers.length === 0) {
          setParseError("В CSV не найдено заголовков. Проверьте, что первая строка — это имена колонок.");
          setParsed(null);
          return;
        }
        setParsed(result);
        setMapping(autoMap(result.headers));
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Ошибка парсинга CSV");
        setParsed(null);
      }
    };
    reader.readAsText(file);
  }

  function handleDryRun() {
    if (!parsed) return;
    const { valid, errors } = validateRows(mapped);
    setDryRun({ validCount: valid.length, errors });
    setServerResult(null);
    setSubmitError(null);
  }

  async function handleImport() {
    if (!parsed) return;
    const { valid } = validateRows(mapped);
    if (valid.length === 0) {
      setSubmitError("Нет валидных строк для импорта");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setServerResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: valid }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      const data = (await res.json()) as ServerResult;
      setServerResult(data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Ошибка запроса");
    } finally {
      setSubmitting(false);
    }
  }

  const validCount = dryRun?.validCount ?? 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-zinc-800">CSV-файл</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:text-white file:hover:bg-zinc-800"
          />
        </label>
        {fileName ? (
          <p className="mt-2 text-xs text-zinc-500">Файл: {fileName}</p>
        ) : null}
        {parseError ? (
          <p className="mt-2 text-sm text-rose-700">{parseError}</p>
        ) : null}
      </div>

      {parsed ? (
        <>
          <ColumnMapper
            headers={parsed.headers}
            mapping={mapping}
            onChange={(next) => {
              setMapping(next);
              setDryRun(null);
              setServerResult(null);
            }}
          />

          <RowPreview mapped={mapped} />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDryRun}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
            >
              Dry-run (проверить)
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={submitting || !dryRun || dryRun.validCount === 0}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {submitting ? "Импортируем…" : `Импортировать${dryRun ? ` (${validCount})` : ""}`}
            </button>
          </div>

          {dryRun ? (
            <ImportResult
              title="Результат dry-run"
              validCount={dryRun.validCount}
              errors={dryRun.errors}
            />
          ) : null}

          {submitError ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
              {submitError}
            </div>
          ) : null}

          {serverResult ? (
            <ImportResult
              title="Результат импорта"
              inserted={serverResult.inserted}
              errors={serverResult.errors}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
