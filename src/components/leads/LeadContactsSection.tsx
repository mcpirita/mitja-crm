"use client";

import { useEffect, useState } from "react";
import type { ContactRow } from "@/lib/schemas";

interface Props {
  leadId: number;
}

const emptyDraft = { name: "", email: "", role: "", notes: "" };

export function LeadContactsSection({ leadId }: Props) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/contacts`);
      if (!res.ok) throw new Error("Не удалось загрузить контакты");
      setContacts((await res.json()) as ContactRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  async function handleAdd() {
    if (!draft.name.trim() && !draft.email.trim()) {
      setError("Укажите имя или email контакта");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      if (draft.name.trim()) payload.name = draft.name.trim();
      if (draft.email.trim()) payload.email = draft.email.trim();
      if (draft.role.trim()) payload.role = draft.role.trim();
      if (draft.notes.trim()) payload.notes = draft.notes.trim();

      const res = await fetch(`/api/leads/${leadId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Не удалось добавить контакт");
      }
      const created = (await res.json()) as ContactRow;
      setContacts((prev) => [...prev, created]);
      setDraft(emptyDraft);
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(contactId: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error("Не удалось удалить");
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--amber)]";

  if (loading) {
    return <div className="text-sm text-zinc-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {contacts.length === 0 ? (
        <div className="text-sm text-zinc-500">
          Дополнительных контактов нет. Главный контакт — в шапке карточки.
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
            >
              <div className="min-w-0 text-sm">
                <div className="flex flex-wrap items-center gap-x-2">
                  {c.name ? (
                    <span className="font-medium text-zinc-900">{c.name}</span>
                  ) : (
                    <span className="text-zinc-400">без имени</span>
                  )}
                  {c.role ? (
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
                      {c.role}
                    </span>
                  ) : null}
                </div>
                {c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    className="text-[var(--amber-hi)] hover:underline"
                  >
                    {c.email}
                  </a>
                ) : null}
                {c.notes ? (
                  <div className="text-xs text-zinc-500">{c.notes}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                disabled={busy}
                aria-label="Удалить контакт"
                className="shrink-0 rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Имя"
              className={inputCls}
              disabled={busy}
            />
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="Email"
              className={inputCls}
              disabled={busy}
            />
            <input
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              placeholder="Роль (напр. директор)"
              className={inputCls}
              disabled={busy}
            />
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Заметка"
              className={inputCls}
              disabled={busy}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy}
              className="btn btn-primary disabled:opacity-50"
            >
              {busy ? "Сохраняем…" : "Добавить контакт"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft(emptyDraft);
                setError(null);
              }}
              disabled={busy}
              className="btn disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="btn"
        >
          + Добавить контакт
        </button>
      )}
    </div>
  );
}
