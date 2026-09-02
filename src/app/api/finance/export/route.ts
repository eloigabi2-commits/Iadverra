import { NextRequest, NextResponse } from "next/server";
import { listLancamentos } from "@/lib/finance";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[";\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const HEADER = ["data", "tipo", "categoria", "descricao", "valor", "status"].join(";");

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const year = Number(params.get("year"));
  if (!year) {
    return NextResponse.json({ error: "year é obrigatório." }, { status: 400 });
  }
  const monthParam = params.get("month");
  const month = monthParam ? Number(monthParam) : undefined;

  const lancamentos = await listLancamentos({ year, month });
  const lines = lancamentos.map((l) =>
    [l.data, l.tipo, l.categoriaNome, l.descricao, l.valor.toFixed(2).replace(".", ","), l.status]
      .map(csvEscape)
      .join(";"),
  );

  const csv = [HEADER, ...lines].join("\n");
  const filename = month ? `fluxo-caixa-${year}-${String(month).padStart(2, "0")}.csv` : `fluxo-caixa-${year}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
