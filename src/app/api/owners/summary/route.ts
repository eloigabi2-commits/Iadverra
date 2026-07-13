import { NextRequest, NextResponse } from "next/server";
import { parseCnaesParam, parseUfParam } from "@/lib/filters";
import { summarizeByCnae } from "@/lib/owners";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const cnaes = parseCnaesParam(params.get("cnaes"));
  const uf = parseUfParam(params.get("uf"));

  const summary = await summarizeByCnae({ cnaes, uf });
  const total = summary.reduce((sum, item) => sum + item.totalDonos, 0);

  return NextResponse.json({ summary, total });
}
