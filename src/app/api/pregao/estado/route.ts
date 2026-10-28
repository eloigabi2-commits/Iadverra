import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { pregaoConfigurado, usuarioDaSessao } from "@/lib/pregao-auth";

const LIMITE = 600_000;

function nomeDoEstado(estado: Record<string, unknown>, atual: string): string {
  const usuario = estado.user;
  if (!usuario || typeof usuario !== "object") return atual;
  const dados = usuario as Record<string, unknown>;
  const partes = [dados.first, dados.last]
    .filter((parte): parte is string => typeof parte === "string")
    .map((parte) => parte.trim())
    .filter(Boolean);
  const nome = partes.join(" ").slice(0, 120);
  return nome.length >= 2 ? nome : atual;
}

export async function POST(request: Request) {
  if (!pregaoConfigurado()) {
    return Response.json({ erro: "O simulador está sendo configurado." }, { status: 503 });
  }

  const usuario = await usuarioDaSessao();
  if (!usuario) return Response.json({ erro: "Não autenticado." }, { status: 401 });

  let dados: Record<string, unknown>;
  try {
    dados = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const estado = dados.estado;
  if (!estado || typeof estado !== "object" || Array.isArray(estado)) {
    return Response.json({ erro: "Estado inválido." }, { status: 400 });
  }

  const serializado = JSON.stringify(estado);
  if (serializado.length > LIMITE) {
    return Response.json({ erro: "Estado grande demais." }, { status: 413 });
  }

  await prisma.usuarioPregao.update({
    where: { id: usuario.id },
    data: {
      estado: estado as Prisma.InputJsonValue,
      nome: nomeDoEstado(estado as Record<string, unknown>, usuario.nome),
    },
  });

  return Response.json({ ok: true });
}
