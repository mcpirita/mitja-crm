import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadUpdate } from "@/lib/schemas";
import { deleteLead, getLead, updateLead } from "@/lib/db/leads";
import { listEventsForLead } from "@/lib/db/events";

function parseId(idRaw: string): number | null {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const lead = await getLead(id);
  if (!lead) {
    return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
  }
  const events = await listEventsForLead(id);
  return NextResponse.json({ lead, events });
}

export async function PATCH(
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

  const parsed = LeadUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  // LeadUpdate = LeadCreate.partial() сохраняет defaults у полей,
  // поэтому из valid-data берём только ключи, реально пришедшие в body.
  const bodyKeys =
    body && typeof body === "object" ? Object.keys(body as Record<string, unknown>) : [];
  const filtered: Record<string, unknown> = {};
  const validData = parsed.data as Record<string, unknown>;
  for (const key of bodyKeys) {
    if (key in validData) filtered[key] = validData[key];
  }

  const lead = await updateLead(id, filtered as typeof parsed.data);
  if (!lead) {
    return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
  }
  return NextResponse.json(lead);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const ok = await deleteLead(id);
  if (!ok) {
    return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
