import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LeadCreate,
  LeadStatus,
  Segment,
} from "@/lib/schemas";
import { createLead, listLeads } from "@/lib/db/leads";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const segmentRaw = url.searchParams.get("segment");
  const statusRaw = url.searchParams.get("status");
  const q = url.searchParams.get("q") ?? undefined;

  const segmentParsed = segmentRaw ? Segment.safeParse(segmentRaw) : null;
  const statusParsed = statusRaw ? LeadStatus.safeParse(statusRaw) : null;

  if (segmentRaw && segmentParsed && !segmentParsed.success) {
    return NextResponse.json({ error: "Некорректный segment" }, { status: 400 });
  }
  if (statusRaw && statusParsed && !statusParsed.success) {
    return NextResponse.json({ error: "Некорректный status" }, { status: 400 });
  }

  const leads = await listLeads({
    segment: segmentParsed?.success ? segmentParsed.data : undefined,
    status: statusParsed?.success ? statusParsed.data : undefined,
    q,
  });

  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }

  const parsed = LeadCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ошибка валидации", details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const lead = await createLead(parsed.data);
    return NextResponse.json(lead);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
