"use client";

import { useEffect, useState } from "react";

type FormState = {
  translation_style: string;
  signature_ru: string;
  signature_de: string;
  offer_description: string;
};

const EMPTY: FormState = {
  translation_style: "",
  signature_ru: "",
  signature_de: "",
  offer_description: "",
};

export function SettingsForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить настройки");
        const data = await res.json();
        if (cancelled) return;
        setForm({
          translation_style: data.translation_style ?? "",
          signature_ru: data.signature_ru ?? "",
          signature_de: data.signature_de ?? "",
          offer_description: data.offer_description ?? "",
        });
      } catch (err) {
        if (cancelled) return;
        const text = err instanceof Error ? err.message : "Ошибка загрузки";
        setMessage({ kind: "err", text });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onChange<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Не удалось сохранить");
      }
      const data = await res.json();
      setForm((prev) => ({
        translation_style: data.translation_style ?? "",
        signature_ru: data.signature_ru ?? "",
        signature_de: data.signature_de ?? "",
        offer_description: data.offer_description ?? prev.offer_description ?? "",
      }));
      setMessage({ kind: "ok", text: "Сохранено" });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Ошибка сохранения";
      setMessage({ kind: "err", text });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="panel p-6 text-sm text-zinc-500">
        Загрузка настроек…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="panel p-6">
        <label className="cap block mb-1">
          Оффер (описание здания и условий аренды)
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Передаётся Claude при AI-генерации писем как контекст оффера. Опиши площади, условия, гибкость, что предлагаешь.
        </p>
        <textarea
          rows={8}
          value={form.offer_description}
          onChange={(e) => onChange("offer_description", e.target.value)}
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--amber)]"
        />
      </div>

      <div className="panel p-6">
        <label className="cap block mb-1">
          Стиль перевода (system-промпт для Claude)
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Этот текст передаётся как system-сообщение при переводе писем RU→DE.
        </p>
        <textarea
          rows={8}
          value={form.translation_style}
          onChange={(e) => onChange("translation_style", e.target.value)}
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--amber)]"
        />
      </div>

      <div className="panel p-6">
        <label className="cap block mb-1">Подпись (RU)</label>
        <p className="mt-1 text-xs text-zinc-500">
          Подставляется в конец русских писем.
        </p>
        <textarea
          rows={4}
          value={form.signature_ru}
          onChange={(e) => onChange("signature_ru", e.target.value)}
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--amber)]"
        />
      </div>

      <div className="panel p-6">
        <label className="cap block mb-1">Подпись (DE)</label>
        <p className="mt-1 text-xs text-zinc-500">
          Подставляется в конец немецких писем после перевода.
        </p>
        <textarea
          rows={4}
          value={form.signature_de}
          onChange={(e) => onChange("signature_de", e.target.value)}
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-[var(--amber)]"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
        {message ? (
          <span
            className={
              message.kind === "ok"
                ? "text-sm text-emerald-600"
                : "text-sm text-red-600"
            }
          >
            {message.text}
          </span>
        ) : null}
      </div>
    </form>
  );
}
