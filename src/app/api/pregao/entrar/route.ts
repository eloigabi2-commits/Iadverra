import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { conferirSenha } from "@/lib/senha";
import {
  COOKIE_PREGAO,
  opcoesDoCookiePregao,
  pregaoConfigurado,
  sessaoDoUsuario,
} from "@/lib/pregao-auth";

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

  const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase().slice(0, 160) : "";
  const senha = typeof dados.senha === "string" ? dados.senha : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 8 || senha.length > 128) {
    await new Promise((ok) => setTimeout(ok, 700));
    return Response.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const usuario = await prisma.usuarioPregao.findUnique({ where: { email } });
  if (!usuario || !(await conferirSenha(senha, usuario.senhaHash))) {
    await new Promise((ok) => setTimeout(ok, 700));
    return Response.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const sessao = sessaoDoUsuario(usuario.id);
  (await cookies()).set(COOKIE_PREGAO, sessao.valor, opcoesDoCookiePregao(sessao.maxAge));

  return Response.json({
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, criadoEm: usuario.criadoEm },
    estado: usuario.estado,
  });
}
