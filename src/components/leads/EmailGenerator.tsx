"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EmailTemplateRow,
  EventType,
  LeadRow,
  LeadStatus,
  OutreachEventRow,
  TemplateKind,
} from "@/lib/schemas";
import { TEMPLATE_KIND_LABELS_RU } from "@/lib/schemas";
import { substituteVars } from "@/lib/templates/render";

interface Props {
  lead: LeadRow;
  onEventCreated?: (updated: LeadRow, event: OutreachEventRow) => void;
}

function defaultKindByStatus(status: LeadStatus): TemplateKind {
  switch (status) {
    case "new":
      return "initial";
    case "contacted":
    case "awaiting_reply":
      return "fup1";
    case "fup1_sent":
      return "fup2";
    case "fup2_sent":
      return "fup2";
    default:
      return "initial";
  }
}

const KINDS: TemplateKind[] = ["initial", "fup1", "fup2"];

const KIND_TO_EVENT: Record<TemplateKind, EventType> = {
  initial: "email_sent",
  fup1: "fup1_sent",
  fup2: "fup2_sent",
};

const KIND_TO_NEXT_STATUS: Record<TemplateKind, LeadStatus> = {
  initial: "contacted",
  fup1: "fup1_sent",
  fup2: "fup2_sent",
};

export function EmailGenerator({ lead, onEventCreated }: Props) {
  const [kind, setKind] = useState<TemplateKind>(() => defaultKindByStatus(lead.status));
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [subjectRu, setSubjectRu] = useState("");
  const [bodyRu, setBodyRu] = useState("");

  const [subjectDe, setSubjectDe] = useState("");
  const [bodyDe, setBodyDe] = useState("");

  const [translating, setTranslating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const vars = useMemo(
    () => ({
      name: lead.name,
      company: lead.company,
      city: lead.city ?? undefined,
      hook: lead.hook_text ?? undefined,
    }),
    [lead.name, lead.company, lead.city, lead.hook_text],
  );

  useEffect(() => {
    let cancelled = false;
    setTemplatesLoading(true);
    setError(null);

    const params = new URLSearchParams({ segment: lead.segment, kind });

    (async () => {
      try {
        const res = await fetch(`/api/templates?${params.toString()}`);
        if (!res.ok) throw new Error("Не удалось загрузить шаблоны");
        const allForKind = (await res.json()) as EmailTemplateRow[];

        if (cancelled) return;

        const matched =
          allForKind.length > 0
            ? allForKind
            : await (async () => {
                const r2 = await fetch(`/api/templates?segment=any&kind=${kind}`);
                if (!r2.ok) return [] as EmailTemplateRow[];
                return (await r2.json()) as EmailTemplateRow[];
              })();

        if (cancelled) return;

        setTemplates(matched);
        if (matched.length > 0) {
          applyTemplate(matched[0]);
          setSelectedId(matched[0].id);
        } else {
          setSelectedId(null);
          setSubjectRu("");
          setBodyRu("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка");
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.segment, kind]);

  function applyTemplate(tpl: EmailTemplateRow) {
    const renderedSubject = substituteVars(tpl.subject, vars).text;
    const renderedBody = substituteVars(tpl.body, vars).text;
    setSubjectRu(renderedSubject);
    setBodyRu(renderedBody);
    setSubjectDe("");
    setBodyDe("");
  }

  function onSelectTemplate(id: number) {
    setSelectedId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) applyTemplate(tpl);
  }

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось сгенерировать");
      }
      setSubjectRu(data.subject as string);
      setBodyRu(data.body as string);
      setSubjectDe("");
      setBodyDe("");
      setInfo("Черновик сгенерирован Claude. Проверь и при желании отредактируй.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setGenerating(false);
    }
  }

  async function onTranslate() {
    if (!bodyRu.trim()) {
      setError("Сначала заполни RU-текст");
      return;
    }
    setTranslating(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ru_text: bodyRu, kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Перевод не удался");
      }
      setBodyDe(data.de_text as string);
      if (subjectRu.trim()) {
        const subjRes = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ru_text: subjectRu, kind }),
        });
        if (subjRes.ok) {
          const subjData = await subjRes.json();
          setSubjectDe(subjData.de_text as string);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка перевода");
    } finally {
      setTranslating(false);
    }
  }

  async function onCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setInfo(`${label} скопировано в буфер`);
      setTimeout(() => setInfo(null), 1500);
    } catch {
      setError("Не удалось скопировать в буфер");
    }
  }

  async function onMarkSent() {
    setMarking(true);
    setError(null);
    setInfo(null);
    try {
      const eventType = KIND_TO_EVENT[kind];
      const bodySnippet = (bodyDe || bodyRu).trim().slice(0, 280);
      const subject = (subjectDe || subjectRu).trim() || null;

      const evRes = await fetch(`/api/leads/${lead.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          type: eventType,
          subject,
          body_snippet: bodySnippet || null,
        }),
      });
      if (!evRes.ok) throw new Error("Не удалось зафиксировать отправку");
      const data = (await evRes.json()) as { event: OutreachEventRow; lead: LeadRow };

      setInfo(`Отмечено: ${TEMPLATE_KIND_LABELS_RU[kind]} отправлен`);
      onEventCreated?.(data.lead, data.event);
      setKind(defaultKindByStatus(data.lead.status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setMarking(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--amber)]";
  const btnDark =
    "btn btn-primary disabled:opacity-50";
  const btnLight =
    "btn disabled:opacity-50";

  return (
    <div className="panel p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-zinc-600">Этап</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as TemplateKind)}
          className={inputCls + " max-w-[200px]"}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {TEMPLATE_KIND_LABELS_RU[k]}
            </option>
          ))}
        </select>

        <label className="text-sm text-zinc-600 ml-2">Шаблон</label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => onSelectTemplate(Number(e.target.value))}
          disabled={templates.length === 0}
          className={inputCls + " max-w-[280px]"}
        >
          {templates.length === 0 ? (
            <option value="">
              {templatesLoading ? "Загрузка..." : "Нет шаблонов"}
            </option>
          ) : (
            templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))
          )}
        </select>
      </div>

      {templates.length === 0 && !templatesLoading ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Шаблонов для «{lead.segment}» / «{TEMPLATE_KIND_LABELS_RU[kind]}» пока нет. Можешь написать письмо с нуля в поле ниже (переменные {"{name}"}, {"{company}"}, {"{city}"}, {"{hook}"} подставлять не будут), либо{" "}
          <a
            href={`/templates/new?segment=${lead.segment}&kind=${kind}`}
            className="font-medium underline hover:text-amber-700"
          >
            создать шаблон
          </a>
          .
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {info}
        </div>
      ) : null}

      <div>
        <h4 className="font-mono text-[11px] font-medium uppercase tracking-[.22em] text-[var(--dim)] mb-2">Русский</h4>
        <input
          type="text"
          value={subjectRu}
          onChange={(e) => setSubjectRu(e.target.value)}
          placeholder="Тема письма"
          className={inputCls + " mb-2"}
        />
        <textarea
          value={bodyRu}
          onChange={(e) => setBodyRu(e.target.value)}
          rows={10}
          placeholder="Текст письма на русском"
          className={inputCls}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rounded-md bg-violet-700 px-3 py-1.5 text-sm text-white hover:bg-violet-800 disabled:opacity-50"
          >
            {generating ? "Генерируем..." : "Сгенерировать через Claude"}
          </button>
          <button type="button" onClick={onTranslate} disabled={translating || !bodyRu.trim()} className={btnDark}>
            {translating ? "Переводим..." : "Перевести на немецкий"}
          </button>
          <button
            type="button"
            onClick={() => onCopy(`${subjectRu}\n\n${bodyRu}`, "RU")}
            disabled={!bodyRu.trim()}
            className={btnLight}
          >
            Скопировать RU
          </button>
        </div>
      </div>

      <div>
        <h4 className="font-mono text-[11px] font-medium uppercase tracking-[.22em] text-[var(--dim)] mb-2">Немецкий</h4>
        <input
          type="text"
          value={subjectDe}
          onChange={(e) => setSubjectDe(e.target.value)}
          placeholder="Betreff (тема)"
          className={inputCls + " mb-2"}
        />
        <textarea
          value={bodyDe}
          onChange={(e) => setBodyDe(e.target.value)}
          rows={10}
          placeholder="Перевод появится здесь после «Перевести на немецкий»"
          className={inputCls}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCopy(`${subjectDe}\n\n${bodyDe}`, "DE")}
            disabled={!bodyDe.trim()}
            className={btnLight}
          >
            Скопировать DE
          </button>
          <button type="button" onClick={onMarkSent} disabled={marking} className={btnDark}>
            {marking ? "Фиксируем..." : `Я отправил (${TEMPLATE_KIND_LABELS_RU[kind]})`}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          «Я отправил» зафиксирует событие {KIND_TO_EVENT[kind]} и переведёт статус в «
          {KIND_TO_NEXT_STATUS[kind]}».
        </p>
      </div>
    </div>
  );
}
