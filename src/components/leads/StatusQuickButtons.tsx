"use client";

import { useState } from "react";
import type { EventType, LeadRow, LeadStatus, OutreachEventRow } from "@/lib/schemas";

type Action =
  | { kind: "event"; type: EventType; label: string; statusAfter?: LeadStatus }
  | { kind: "status"; status: LeadStatus; label: string };

const ACTIONS: Action[] = [
  { kind: "event", type: "email_sent", label: "Отправил первое" },
  { kind: "event", type: "fup1_sent", label: "Отправил fup1" },
  { kind: "event", type: "fup2_sent", label: "Отправил fup2" },
  {
    kind: "event",
    type: "reply_received",
    label: "Ответ: интересно",
    statusAfter: "replied_interested",
  },
  {
    kind: "event",
    type: "reply_received",
    label: "Ответ: не интересно",
    statusAfter: "replied_not_interested",
  },
  {
    kind: "event",
    type: "reply_received",
    label: "Ответ: позже",
    statusAfter: "replied_later",
  },
  {
    kind: "event",
    type: "meeting",
    label: "Встреча",
    statusAfter: "meeting_scheduled",
  },
  {
    kind: "event",
    type: "viewing",
    label: "Просмотр",
    statusAfter: "viewing_done",
  },
  { kind: "status", status: "in_negotiation", label: "Переговоры" },
  { kind: "status", status: "won", label: "Выиграл" },
  { kind: "status", status: "lost", label: "Потерял" },
  { kind: "status", status: "dead", label: "Мёртв" },
];

interface Props {
  leadId: number;
  onChange: (lead: LeadRow, newEvent?: OutreachEventRow) => void;
}

export function StatusQuickButtons({ leadId, onChange }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: Action, key: string) {
    setPending(key);
    setError(null);
    try {
      if (action.kind === "event") {
        const res = await fetch(`/api/leads/${leadId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: leadId, type: action.type }),
        });
        if (!res.ok) throw new Error("Не удалось создать событие");
        const data = (await res.json()) as { event: OutreachEventRow; lead: LeadRow };
        let lead = data.lead;
        if (action.statusAfter) {
          const patchRes = await fetch(`/api/leads/${leadId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action.statusAfter }),
          });
          if (!patchRes.ok) throw new Error("Не удалось обновить статус");
          lead = (await patchRes.json()) as LeadRow;
        }
        onChange(lead, data.event);
      } else {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action.status }),
        });
        if (!res.ok) throw new Error("Не удалось обновить статус");
        const lead = (await res.json()) as LeadRow;
        onChange(lead);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action, idx) => {
          const key = `${action.kind}-${idx}`;
          const busy = pending === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => runAction(action, key)}
              disabled={pending !== null}
              className="btn disabled:opacity-50"
            >
              {busy ? "..." : action.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <div className="mt-2 text-sm text-rose-700">{error}</div>
      ) : null}
    </div>
  );
}
