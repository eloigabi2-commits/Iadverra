import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPorToken, isTipoFoto, TAMANHO_MAXIMO_FOTO } from "@/lib/documentos";

// Descobre o formato pelos primeiros bytes, sem confiar no que o navegador diz
function formatoDaImagem(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = (inicio: number, fim: number) => String.fromCharCode(...b.slice(inicio, fim));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|mif1|msf1)$/.test(ascii(8, 12))) return "image/heic";
  return null;
}

export async function POST(req: Request, ctx: RouteContext<"/api/documentos/[token]/fotos">) {
  const { token } = await ctx.params;
  const solicitacao = await buscarPorToken(token);
  if (!solicitacao) return NextResponse.json({ erro: "link inválido" }, { status: 404 });
  if (solicitacao.status !== "aguardando") {
    return NextResponse.json({ erro: "documentos já enviados" }, { status: 409 });
  }
  if (!solicitacao.consentimentoEm) {
    return NextResponse.json({ erro: "aceite a política de privacidade antes" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  const tipo = form?.get("tipo");
  const arquivo = form?.get("arquivo");
  if (!isTipoFoto(tipo) || !(arquivo instanceof Blob)) {
    return NextResponse.json({ erro: "envio inválido" }, { status: 400 });
  }
  if (arquivo.size === 0 || arquivo.size > TAMANHO_MAXIMO_FOTO) {
    return NextResponse.json({ erro: "foto muito grande" }, { status: 413 });
  }

  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const mime = formatoDaImagem(dados);
  if (!mime) return NextResponse.json({ erro: "arquivo não é uma foto" }, { status: 415 });

  await prisma.fotoDocumento.upsert({
    where: { solicitacaoId_tipo: { solicitacaoId: solicitacao.id, tipo } },
    create: { solicitacaoId: solicitacao.id, tipo, mime, tamanho: dados.length, dados },
    update: { mime, tamanho: dados.length, dados, criadoEm: new Date() },
  });

  return NextResponse.json({ ok: true });
}
