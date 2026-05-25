"use client";

import { useMemo } from "react";
import { substituteVars, type TemplateVars } from "@/lib/templates/render";

const FAKE_VARS: TemplateVars = {
  name: "Анна",
  company: "Bolderwelt",
  city: "Pforzheim",
  hook: "пример хука",
};

const PLACEHOLDER_LABELS: Record<string, string> = {
  name: "{name}",
  company: "{company}",
  city: "{city}",
  hook: "{hook}",
};

export function TemplatePreview({
  subject,
  body,
}: {
  subject: string;
  body: string;
}) {
  const subjectResult = useMemo(
    () => substituteVars(subject, FAKE_VARS),
    [subject],
  );
  const bodyResult = useMemo(() => substituteVars(body, FAKE_VARS), [body]);

  const missing = Array.from(
    new Set([...subjectResult.missing, ...bodyResult.missing]),
  );

  // Подсвечиваем плейсхолдеры из missing — они так и остались в тексте.
  function renderWithHighlights(text: string) {
    if (missing.length === 0) {
      return <span>{text}</span>;
    }
    // Регулярка по всем missing-плейсхолдерам.
    const re = new RegExp(
      `(${missing.map((k) => `\\{${k}\\}`).join("|")})`,
      "g",
    );
    const parts = text.split(re);
    return (
      <>
        {parts.map((part, i) => {
          if (missing.some((k) => `{${k}}` === part)) {
            return (
              <mark
                key={i}
                className="rounded bg-amber-100 px-1 text-amber-900"
              >
                {part}
              </mark>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900">Превью</h3>
        <span className="text-xs text-zinc-500">
          Фейковые данные: name=Анна, company=Bolderwelt, city=Pforzheim,
          hook=«пример хука»
        </span>
      </div>

      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          Тема
        </div>
        <div className="mt-1 text-sm text-zinc-900">
          {renderWithHighlights(subjectResult.text)}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          Тело
        </div>
        <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-zinc-900">
          {renderWithHighlights(bodyResult.text)}
        </pre>
      </div>

      {missing.length > 0 ? (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Не подставлены плейсхолдеры:{" "}
          {missing
            .map((k) => PLACEHOLDER_LABELS[k] ?? `{${k}}`)
            .join(", ")}
          .
        </div>
      ) : null}
    </div>
  );
}
