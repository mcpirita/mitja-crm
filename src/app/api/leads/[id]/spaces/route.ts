import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadSpaceStatus } from "@/lib/schemas";
import { getLead } from "@/lib/db/leads";
import { getSpace } from "@/lib/db/spaces";
import {
  attach,
  detach,
  listForLead,
  updateStatus,
} from "@/lib/db/leadSpaces";

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

  const links = await listForLead(leadId);
  return NextResponse.json(links);
}

const PostBody = z.object({
  space_id: z.number().int().positive(),
  status: LeadSpaceStatus.optional(),
});

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

  const parsed = PostBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const space = await getSpace(parsed.data.space_id);
  if (!space) {
    return NextResponse.json({ error: "Помещение не найдено" }, { status: 404 });
  }

  const link = await attach(
    leadId,
    parsed.data.space_id,
    parsed.data.status ?? "considering",
  );
  if (!link) {
    return NextResponse.json(
      { error: "Не удалось привязать помещение" },
      { status: 500 },
    );
  }
  return NextResponse.json(link, { status: 200 });
}

const PatchBody = z.object({
  space_id: z.number().int().positive(),
  status: LeadSpaceStatus,
});

export async function PATCH(request: Request, { params }: Ctx) {
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

  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const link = await updateStatus(leadId, parsed.data.space_id, parsed.data.status);
  if (!link) {
    return NextResponse.json(
      { error: "Привязка не найдена" },
      { status: 404 },
    );
  }
  return NextResponse.json(link);
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id: idRaw } = await params;
  const leadId = parseId(idRaw);
  if (leadId === null) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const spaceIdRaw = searchParams.get("space_id");
  const spaceId = spaceIdRaw ? Number(spaceIdRaw) : NaN;
  if (!Number.isInteger(spaceId) || spaceId <= 0) {
    return NextResponse.json(
      { error: "Требуется параметр space_id" },
      { status: 400 },
    );
  }

  const ok = await detach(leadId, spaceId);
  if (!ok) {
    return NextResponse.json({ error: "Привязка не найдена" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
