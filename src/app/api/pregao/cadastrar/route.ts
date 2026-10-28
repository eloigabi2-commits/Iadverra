import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { criarHashSenha } from "@/lib/senha";
import {
  COOKIE_PREGAO,
  opcoesDoCookiePregao,
  pregaoConfigurado,
  sessaoDoUsuario,
} from "@/lib/pregao-auth";

function texto(valor: unknown, limite: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
}

export async function POST(request: Request) {
  if (!pregaoConfigurado()) {
    return Response.json({ erro: "O simulador está sendo configurado. Tente novamente mais tarde." }, { status: 503 });
  }

  let dados: Record<string, unknown>;
  try {
    dados = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const nome = texto(dados.nome, 120);
  const email = texto(dados.email, 160).toLowerCase();
  const senha = typeof dados.senha === "string" ? dados.senha : "";

  if (nome.length < 2) return Response.json({ erro: "Informe seu nome." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ erro: "Informe um e-mail válido." }, { status: 400 });
  }
  if (senha.length < 8) {
    return Response.json({ erro: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  }
  if (senha.length > 128) {
    return Response.json({ erro: "A senha pode ter no máximo 128 caracteres." }, { status: 400 });
  }

  const senhaHash = await criarHashSenha(senha);

  try {
    const usuario = await prisma.usuarioPregao.create({
      data: { nome, email, senhaHash },
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
    const sessao = sessaoDoUsuario(usuario.id);
    (await cookies()).set(COOKIE_PREGAO, sessao.valor, opcoesDoCookiePregao(sessao.maxAge));
    return Response.json({ usuario, estado: null }, { status: 201 });
  } catch (erro) {
    if ((erro as { code?: string }).code === "P2002") {
      return Response.json({ erro: "Este e-mail já está cadastrado. Entre com a sua senha." }, { status: 409 });
    }
    throw erro;
  }
}
