import type { EventType, OutreachEventRow } from "@/lib/schemas";

const EVENT_LABELS_RU: Record<EventType, string> = {
  email_sent: "Первое письмо отправлено",
  fup1_sent: "Фоллоуап 1 отправлен",
  fup2_sent: "Фоллоуап 2 отправлен",
  reply_received: "Получен ответ",
  meeting: "Встреча",
  viewing: "Просмотр",
  note: "Заметка",
  other: "Другое",
};

function formatDate(value: string): string {
  // happened_at в SQLite формата 'YYYY-MM-DD HH:MM:SS'
  const tryDate = new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
  if (isNaN(tryDate.getTime())) return value;
  return tryDate.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventTimeline({ events }: { events: OutreachEventRow[] }) {
  if (events.length === 0) {
    return (
      <div className="text-sm text-zinc-500">Событий пока нет.</div>
    );
  }
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex gap-3 rounded-md border border-zinc-200 bg-white p-3"
        >
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zinc-400" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-900">
                {EVENT_LABELS_RU[event.type]}
              </span>
              <span className="text-xs text-zinc-500">
                {formatDate(event.happened_at)}
              </span>
            </div>
            {event.subject ? (
              <div className="mt-1 text-sm text-zinc-700">
                <span className="text-zinc-500">Тема: </span>
                {event.subject}
              </div>
            ) : null}
            {event.body_snippet ? (
              <div className="mt-1 text-sm text-zinc-600 line-clamp-3 whitespace-pre-line">
                {event.body_snippet}
              </div>
            ) : null}
            {event.notes ? (
              <div className="mt-1 text-xs text-zinc-500 whitespace-pre-line">
                {event.notes}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
