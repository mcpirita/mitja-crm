import { NextResponse } from "next/server";
import { findDuplicateLeads } from "@/lib/db/dedup";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const company = url.searchParams.get("company");
  const name = url.searchParams.get("name");
  const excludeIdRaw = url.searchParams.get("excludeId");
  const excludeId = excludeIdRaw ? Number(excludeIdRaw) : undefined;

  if (!email && !company && !name) {
    return NextResponse.json({ matches: [] });
  }

  const matches = await findDuplicateLeads({
    email,
    company,
    name,
    excludeId:
      excludeId && Number.isInteger(excludeId) ? excludeId : undefined,
  });

  return NextResponse.json({ matches });
}
