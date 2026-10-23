import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPorToken, TIPOS_FOTO } from "@/lib/documentos";

export async function POST(_req: Request, ctx: RouteContext<"/api/documentos/[token]/concluir">) {
  const { token } = await ctx.params;
  const solicitacao = await buscarPorToken(token);
  if (!solicitacao) return NextResponse.json({ erro: "link inválido" }, { status: 404 });
  if (solicitacao.status !== "aguardando") return NextResponse.json({ ok: true });

  const enviados = new Set(solicitacao.fotos.map((f) => f.tipo));
  const faltando = TIPOS_FOTO.filter((t) => !enviados.has(t));
  if (faltando.length > 0) {
    return NextResponse.json({ erro: "faltam fotos", faltando }, { status: 400 });
  }

  await prisma.solicitacaoDocumento.update({
    where: { id: solicitacao.id },
    data: { status: "enviado", enviadoEm: new Date() },
  });
  return NextResponse.json({ ok: true });
}
