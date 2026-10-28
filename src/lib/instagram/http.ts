import { NextResponse } from "next/server";

// A ponte roda dentro de instagram.com e chama estes endpoints. A credencial é
// o código no corpo/header, então liberar a origem não expõe outra conexão.
export const CABECALHOS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Codigo",
  "Cache-Control": "no-store",
};

export function json(dados: unknown, status = 200) {
  return NextResponse.json(dados, { status, headers: CABECALHOS_CORS });
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CABECALHOS_CORS });
}

export function ipDaRequisicao(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

const baldes = new Map<string, { contagem: number; expira: number }>();

export function dentroDoLimite(chave: string, limite = 20, janelaMs = 60_000): boolean {
  const agora = Date.now();
  const atual = baldes.get(chave);
  if (!atual || atual.expira < agora) {
    baldes.set(chave, { contagem: 1, expira: agora + janelaMs });
    return true;
  }
  if (atual.contagem >= limite) return false;
  atual.contagem += 1;
  return true;
}
