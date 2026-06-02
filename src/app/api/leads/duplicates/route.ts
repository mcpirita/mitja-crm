import { NextResponse } from "next/server";
import { findSimilarPairs } from "@/lib/db/dedup";

export async function GET() {
  const pairs = await findSimilarPairs();
  return NextResponse.json({ pairs });
}
