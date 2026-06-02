import { NextResponse } from "next/server";
import { z } from "zod";
import { ContactCreate } from "@/lib/schemas";
import { getLead } from "@/lib/db/leads";
import { createContact, listContacts } from "@/lib/db/contacts";

type Ctx = { params: Promise<{ id: string }> };

function parseId(idRaw: string): number | null {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id: idRaw } = await params;
  const leadId = parseId(idRaw);
  if (leadId === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const lead = await getLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
  }

  const contacts = await listContacts(leadId);
  return NextResponse.json(contacts);
}

export async function POST(request: Request, { params }: Ctx) {
  const { id: idRaw } = await params;
  const leadId = parseId(idRaw);
  if (leadId === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const lead = await getLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }

  const parsed = ContactCreate.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const contact = await createContact(leadId, parsed.data);
  return NextResponse.json(contact, { status: 200 });
}
