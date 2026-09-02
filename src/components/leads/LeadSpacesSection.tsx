"use client";

import { useEffect, useState } from "react";
import {
  LEAD_SPACE_STATUSES,
  LEAD_SPACE_STATUS_LABELS_RU,
  type LeadSpaceLink,
  type LeadSpaceStatus,
  type SpaceRow,
} from "@/lib/schemas";

interface Props {
  leadId: number;
}

const STATUS_BADGE: Record<LeadSpaceStatus, string> = {
  considering: "bg-amber-50 text-amber-800 border-amber-200",
  expose_sent: "bg-blue-50 text-blue-800 border-blue-200",
  rejected: "bg-rose-50 text-rose-800 border-rose-200",
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

function describe(space: SpaceRow): string {
  const parts: string[] = [space.name];
  if (space.area_m2 !== null) parts.push(`${Math.round(space.area_m2)} м²`);
  return parts.join(" — ");
}

export function LeadSpacesSection({ leadId }: Props) {
  const [attached, setAttached] = useState<LeadSpaceLink[]>([]);
  const [allSpaces, setAllSpaces] = useState<SpaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addValue, setAddValue] = useState<string>("");

  async function loadAll() {
    setError(null);
    try {
      const [linksRes, allRes] = await Promise.all([
        fetch(`/api/leads/${leadId}/spaces`),
        fetch(`/api/spaces`),
      ]);
      if (!linksRes.ok) throw new Error("Не удалось загрузить привязки");
      if (!allRes.ok) throw new Error("Не удалось загрузить помещения");
      const links = (await linksRes.json()) as LeadSpaceLink[];
      const all = (await allRes.json()) as SpaceRow[];
      setAttached(links);
      setAllSpaces(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  async function handleAdd(spaceId: number) {
    if (!spaceId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space_id: spaceId }),
      });
      if (!res.ok) throw new Error("Не удалось привязать помещение");
      setAddValue("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(spaceId: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/leads/${leadId}/spaces?space_id=${spaceId}`,
        { method: "DELETE" },
      );
      if (!res.ok && res.status !== 204) throw new Error("Не удалось отвязать");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(spaceId: number, status: LeadSpaceStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/spaces`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space_id: spaceId, status }),
      });
      if (!res.ok) throw new Error("Не удалось обновить статус");
      const updated = (await res.json()) as LeadSpaceLink;
      setAttached((prev) =>
        prev.map((l) =>
          l.space.id === updated.space.id ? updated : l,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-zinc-500">Загрузка...</div>;
  }

  const attachedIds = new Set(attached.map((l) => l.space.id));
  const available = allSpaces.filter((s) => !attachedIds.has(s.id));

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {attached.length === 0 ? (
        <div className="text-sm text-zinc-500">
          Помещения ещё не привязаны. Добавь хотя бы одно — Claude использует
          его при генерации письма.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {attached.map((link) => (
            <div
              key={link.space.id}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 pl-3 pr-1 py-1 text-sm"
            >
              <span className="font-medium text-zinc-900">
                {describe(link.space)}
              </span>
              <select
                value={link.status}
                disabled={busy}
                onChange={(e) =>
                  handleStatusChange(
                    link.space.id,
                    e.target.value as LeadSpaceStatus,
                  )
                }
                className={
                  "rounded-full border px-2 py-0.5 text-xs focus:outline-none " +
                  STATUS_BADGE[link.status]
                }
              >
                {LEAD_SPACE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_SPACE_STATUS_LABELS_RU[s]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleRemove(link.space.id)}
                disabled={busy}
                aria-label={`Отвязать ${link.space.name}`}
                className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          value={addValue}
          disabled={busy || available.length === 0}
          onChange={(e) => {
            const v = e.target.value;
            setAddValue(v);
            if (v) handleAdd(Number(v));
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-[var(--amber)] focus:outline-none disabled:opacity-50"
        >
          <option value="">
            {available.length === 0
              ? "Все помещения уже привязаны"
              : "+ Добавить помещение..."}
          </option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {describe(s)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
