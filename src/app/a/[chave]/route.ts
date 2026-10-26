import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_PAINEL, opcoesDoCookie, painelConfigurado, sessaoDaAtendente } from "@/lib/painel-auth";

// Link pessoal da atendente: abre o painel dela sem senha, só com os clientes dela
export async function GET(req: Request, ctx: RouteContext<"/a/[chave]">) {
  const { chave } = await ctx.params;
  const atendente =
    painelConfigurado() && /^[a-z0-9-]{12,40}$/.test(chave)
      ? await prisma.atendente.findUnique({ where: { chave } })
      : null;
  if (!atendente) {
    // atrasa a resposta para dificultar tentativas em sequência
    await new Promise((ok) => setTimeout(ok, 1000));
    return NextResponse.redirect(new URL("/painel/login?link=invalido", req.url));
  }
  const sessao = sessaoDaAtendente(atendente);
  (await cookies()).set(COOKIE_PAINEL, sessao.valor, opcoesDoCookie(sessao.maxAge));
  return NextResponse.redirect(new URL("/painel", req.url));
}
