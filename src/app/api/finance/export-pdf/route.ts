import { NextRequest } from "next/server";
import { getAnnualSummary, getConfiguracao, getMonthlySummary } from "@/lib/finance";
import { buildInvoicePdf, type InvoiceData } from "@/lib/invoice-pdf";

function geradoEm(): string {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const year = Number(params.get("year"));
  const monthParam = params.get("month");
  const month = monthParam ? Number(monthParam) : undefined;

  if (!year) {
    return new Response(JSON.stringify({ error: "year é obrigatório." }), { status: 400 });
  }

  const config = await getConfiguracao();
  let data: InvoiceData;
  let filename: string;

  if (month) {
    if (month < 1 || month > 12) {
      return new Response(JSON.stringify({ error: "month deve ser entre 1 e 12." }), { status: 400 });
    }
    const resumo = await getMonthlySummary(year, month);
    data = {
      tipo: "mensal",
      nomeEmpresa: config.nomeEmpresa,
      year,
      month,
      geradoEm: geradoEm(),
      saldoInicial: resumo.saldoInicial,
      receitas: resumo.receitas,
      despesas: resumo.despesas,
      lucroLiquido: resumo.lucroLiquido,
      margem: resumo.margem,
      saldoFinal: resumo.saldoFinal,
      lancamentos: resumo.lancamentos,
      ajustes: resumo.ajustes,
    };
    filename = `contabilidade-conforme-${year}-${String(month).padStart(2, "0")}.pdf`;
  } else {
    const resumo = await getAnnualSummary(year);
    data = {
      tipo: "anual",
      nomeEmpresa: config.nomeEmpresa,
      year,
      geradoEm: geradoEm(),
      saldoInicial: resumo.saldoInicialAno,
      receitas: resumo.totalReceitas,
      despesas: resumo.totalDespesas,
      lucroLiquido: resumo.totalLucroLiquido,
      margem: resumo.margemAnual,
      saldoFinal: resumo.saldoFinalAno,
      meses: resumo.meses.map((m) => ({
        month: m.month,
        receitas: m.receitas,
        despesas: m.despesas,
        lucroLiquido: m.lucroLiquido,
        saldoFinal: m.saldoFinal,
      })),
    };
    filename = `contabilidade-conforme-${year}.pdf`;
  }

  const pdf = await buildInvoicePdf(data);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
