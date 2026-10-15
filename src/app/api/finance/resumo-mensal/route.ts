import { NextRequest, NextResponse } from "next/server";
import { getMonthlySummary } from "@/lib/finance";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "year e month (1-12) são obrigatórios." }, { status: 400 });
  }
  const resumo = await getMonthlySummary(year, month);
  return NextResponse.json(resumo);
}
