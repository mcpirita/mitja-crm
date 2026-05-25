import { NextResponse } from "next/server";
import { z } from "zod";
import { OutreachEventCreate, type EventType, type LeadStatus } from "@/lib/schemas";
import { createEvent, listEventsForLead } from "@/lib/db/events";
import { getLead, setLeadStatus } from "@/lib/db/leads";

function parseId(idRaw: string): number | null {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// type events → новый статус лида.
// reply_received не меняет статус (UI выбирает один из replied_*).
const EVENT_STATUS_MAP: Partial<Record<EventType, LeadStatus>> = {
  email_sent: "contacted",
  fup1_sent: "fup1_sent",
  fup2_sent: "fup2_sent",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }
  const events = await listEventsForLead(id);
  return NextResponse.json(events);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }

  // lead_id из URL имеет приоритет.
  const merged =
    body && typeof body === "object"
      ? { ...(body as Record<string, unknown>), lead_id: id }
      : { lead_id: id };

  const parsed = OutreachEventCreate.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const lead = await getLead(id);
  if (!lead) {
    return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
  }

  const event = await createEvent(parsed.data);

  const newStatus = EVENT_STATUS_MAP[parsed.data.type];
  let updatedLead = lead;
  if (newStatus) {
    const maybeLead = await setLeadStatus(id, newStatus);
    if (maybeLead) updatedLead = maybeLead;
  }

  return NextResponse.json({ event, lead: updatedLead });
}
