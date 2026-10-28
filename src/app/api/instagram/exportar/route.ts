import { importar } from "@/lib/instagram/conexao";
import { lerExportacao } from "@/lib/instagram/exportacao";
import { dentroDoLimite, ipDaRequisicao, json, preflight } from "@/lib/instagram/http";
import { codigoValido, normalizarPessoa } from "@/lib/instagram/tipos";

export const runtime = "nodejs";
export const maxDuration = 60;

const LIMITE_ZIP = 25 * 1024 * 1024;

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  if (!dentroDoLimite(`exportar:${ipDaRequisicao(req)}`, 6)) {
    return json({ erro: "muitos envios de arquivo; espere um minuto" }, 429);
  }

  const form = await req.formData().catch(() => null);
  if (!form) return json({ erro: "envio inválido" }, 400);

  const codigo = form.get("codigo");
  const username = form.get("username");
  const arquivo = form.get("arquivo");
  if (!codigoValido(codigo)) return json({ erro: "código de conexão inválido" }, 400);
  if (typeof username !== "string" || !username.trim()) {
    return json({ erro: "informe o @ da sua conta" }, 400);
  }
  const perfil = normalizarPessoa({ username });
  if (!perfil) return json({ erro: "@ inválido" }, 400);
  if (!(arquivo instanceof Blob) || arquivo.size === 0) {
    return json({ erro: "envie o arquivo .zip do Instagram" }, 400);
  }
  if (arquivo.size > LIMITE_ZIP) {
    return json({ erro: "arquivo acima de 25 MB; exporte só seguidores e seguindo" }, 413);
  }

  let listas;
  try {
    listas = await lerExportacao(Buffer.from(await arquivo.arrayBuffer()));
  } catch (e) {
    const grande = e instanceof Error && e.message === "conteúdo do zip grande demais";
    return json({ erro: grande ? e.message : "não consegui abrir o .zip" }, 400);
  }

  if (!listas.achouArquivo) {
    return json(
      { erro: "o zip não tem followers.json nem following.json; exporte 'Seguidores e seguindo' em JSON" },
      400
    );
  }
  if (listas.seguidores.length === 0 && listas.seguindo.length === 0) {
    return json({ erro: "as listas do arquivo estão vazias" }, 400);
  }

  const resultado = await importar({
    codigo,
    perfil,
    seguidores: listas.seguidores,
    seguindo: listas.seguindo,
    seguidoresTruncado: listas.seguidoresTruncado,
  });
  if (!resultado.ok) return json({ erro: resultado.erro }, resultado.status);

  return json({
    ...resultado,
    aviso: listas.seguidoresTruncado
      ? "A lista de seguidores passou do limite de 20 mil perfis; por segurança, não marcamos quem deixou de seguir neste envio."
      : "O arquivo do Instagram é uma foto do momento: ele mostra quem deixou de seguir, mas não confirma bloqueio. " +
        "A verificação de perfil inacessível só acontece pela extensão.",
  });
}
