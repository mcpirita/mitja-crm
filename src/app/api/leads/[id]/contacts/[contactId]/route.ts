import { NextResponse } from "next/server";
import { z } from "zod";
import { ContactUpdate } from "@/lib/schemas";
import {
  deleteContact,
  getContact,
  updateContact,
} from "@/lib/db/contacts";

type Ctx = { params: Promise<{ id: string; contactId: string }> };

function parseId(idRaw: string): number | null {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id: idRaw, contactId: contactIdRaw } = await params;
  const leadId = parseId(idRaw);
  const contactId = parseId(contactIdRaw);
  if (leadId === null || contactId === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const existing = await getContact(contactId);
  if (!existing || existing.lead_id !== leadId) {
    return NextResponse.json({ error: "Контакт не найден" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }

  const parsed = ContactUpdate.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const updated = await updateContact(contactId, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Контакт не найден" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id: idRaw, contactId: contactIdRaw } = await params;
  const leadId = parseId(idRaw);
  const contactId = parseId(contactIdRaw);
  if (leadId === null || contactId === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const existing = await getContact(contactId);
  if (!existing || existing.lead_id !== leadId) {
    return NextResponse.json({ error: "Контакт не найден" }, { status: 404 });
  }

  await deleteContact(contactId);
  return new NextResponse(null, { status: 204 });
}
