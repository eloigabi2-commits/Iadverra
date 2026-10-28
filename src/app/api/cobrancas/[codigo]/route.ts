import { NextResponse } from "next/server";
import { buscarCobrancaPorCodigo, dadosPublicos, sincronizarCobranca } from "@/lib/cobrancas";

export const dynamic = "force-dynamic";

// Público: é a tela de pagamento do cliente, autenticada só pelo código do link.
export async function GET(_req: Request, ctx: RouteContext<"/api/cobrancas/[codigo]">) {
  const { codigo } = await ctx.params;
  const encontrada = await buscarCobrancaPorCodigo(codigo);
  if (!encontrada) return NextResponse.json({ erro: "cobrança não encontrada" }, { status: 404 });

  const cobranca = await sincronizarCobranca(encontrada);
  return NextResponse.json(
    { ok: true, cobranca: dadosPublicos(cobranca) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
