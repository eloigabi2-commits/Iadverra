import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPorToken } from "@/lib/documentos";

export async function POST(_req: Request, ctx: RouteContext<"/api/documentos/[token]/consentimento">) {
  const { token } = await ctx.params;
  const solicitacao = await buscarPorToken(token);
  if (!solicitacao) return NextResponse.json({ erro: "link inválido" }, { status: 404 });

  if (!solicitacao.consentimentoEm) {
    await prisma.solicitacaoDocumento.update({
      where: { id: solicitacao.id },
      data: { consentimentoEm: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
