"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadRow, OutreachEventRow, SegmentRow } from "@/lib/schemas";
import { SegmentBadge } from "./SegmentBadge";
import { StatusBadge } from "./StatusBadge";
import { EventTimeline } from "./EventTimeline";
import { StatusQuickButtons } from "./StatusQuickButtons";
import { EmailGenerator } from "./EmailGenerator";
import { LeadEditForm } from "./LeadEditForm";
import { LeadSpacesSection } from "./LeadSpacesSection";

interface Props {
  id: number;
  segments: SegmentRow[];
}

function resolveSegment(
  slug: string,
  segments: SegmentRow[],
): { label: string; color: string } {
  const row = segments.find((s) => s.slug === slug);
  if (row) return { label: row.label_ru, color: row.color };
  return { label: slug, color: "zinc" };
}

export function LeadDetail({ id, segments }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [events, setEvents] = useState<OutreachEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [hookDraft, setHookDraft] = useState("");
  const [hookSaving, setHookSaving] = useState(false);
  const [hookSaved, setHookSaved] = useState(false);

  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/leads/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Не удалось загрузить лида");
        return (await res.json()) as { lead: LeadRow; events: OutreachEventRow[] };
      })
      .then((data) => {
        if (cancelled || !data) return;
        setLead(data.lead);
        setEvents(data.events);
        setHookDraft(data.lead.hook_text ?? "");
        setNotesDraft(data.lead.notes ?? "");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function saveHook() {
    setHookSaving(true);
    setHookSaved(false);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook_text: hookDraft }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить hook");
      const updated = (await res.json()) as LeadRow;
      setLead(updated);
      setHookSaved(true);
      setTimeout(() => setHookSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setHookSaving(false);
    }
  }

  async function saveNotes() {
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить заметки");
      const updated = (await res.json()) as LeadRow;
      setLead(updated);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setNotesSaving(false);
    }
  }

  async function reloadEvents() {
    try {
      const res = await fetch(`/api/leads/${id}/events`);
      if (res.ok) {
        const data = (await res.json()) as OutreachEventRow[];
        setEvents(data);
      }
    } catch {
      // ignore
    }
  }

  async function onQuickAction(updated: LeadRow, newEvent?: OutreachEventRow) {
    setLead(updated);
    if (newEvent) {
      setEvents((prev) => [newEvent, ...prev]);
    } else {
      reloadEvents();
    }
  }

  async function onDelete() {
    if (!confirm("Удалить лида и всю его историю?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Не удалось удалить");
      router.push("/leads");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setDeleting(false);
    }
  }

  if (loading) return <div className="text-sm text-zinc-500">Загрузка...</div>;
  if (notFound)
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        Лид не найден.{" "}
        <Link href="/leads" className="underline">
          К списку
        </Link>
      </div>
    );
  if (!lead)
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {error ?? "Не удалось загрузить лида"}
      </div>
    );

  const inputCls =
    "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900";

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        {editing ? (
          <LeadEditForm
            lead={lead}
            onSaved={(updated) => {
              setLead(updated);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">{lead.company}</h2>
                {lead.name ? (
                  <div className="text-sm text-zinc-500">{lead.name}</div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SegmentBadge
                  label={resolveSegment(lead.segment, segments).label}
                  color={resolveSegment(lead.segment, segments).color}
                />
                <StatusBadge status={lead.status} />
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  Редактировать
                </button>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">Email</dt>
                <dd className="text-zinc-900">
                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.email}
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Сайт</dt>
                <dd className="text-zinc-900">
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {lead.website}
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Страна / Город</dt>
                <dd className="text-zinc-900">
                  {lead.country}
                  {lead.city ? `, ${lead.city}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Источник</dt>
                <dd className="text-zinc-900">{lead.source}</dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-900 mb-2">
          Hook (локация / зацепка)
        </h3>
        <textarea
          value={hookDraft}
          onChange={(e) => setHookDraft(e.target.value)}
          rows={4}
          className={inputCls}
          placeholder="Например: рядом с Pforzheim Marktplatz, удобная локация для гастро"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={saveHook}
            disabled={hookSaving}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {hookSaving ? "Сохраняем..." : "Сохранить"}
          </button>
          {hookSaved ? (
            <span className="text-sm text-emerald-700">Сохранено</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">Предлагаемые помещения</h3>
        <LeadSpacesSection leadId={id} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
          Быстрые действия
        </h3>
        <StatusQuickButtons leadId={id} onChange={onQuickAction} />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
          Письмо
        </h3>
        <div id="email-block">
          <EmailGenerator
            lead={lead}
            onEventCreated={(updated, event) => {
              setLead(updated);
              setEvents((prev) => [event, ...prev]);
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">Таймлайн</h3>
        <EventTimeline events={events} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-900 mb-2">Заметки</h3>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={4}
          className={inputCls}
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={saveNotes}
            disabled={notesSaving}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {notesSaving ? "Сохраняем..." : "Сохранить"}
          </button>
          {notesSaved ? (
            <span className="text-sm text-emerald-700">Сохранено</span>
          ) : null}
        </div>
      </section>

      <section className="flex items-center justify-between">
        <Link
          href="/leads"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          К списку лидов
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          {deleting ? "Удаляем..." : "Удалить лида"}
        </button>
      </section>
    </div>
  );
}
