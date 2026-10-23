"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarSolicitacao } from "@/lib/documentos";
import { COOKIE_PAINEL, estaLogado, novaSessao, senhaConfere } from "@/lib/painel-auth";

export async function entrar(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  if (!senhaConfere(senha)) {
    // atrasa a resposta para dificultar tentativas em sequência
    await new Promise((ok) => setTimeout(ok, 1000));
    redirect("/painel/login?erro=1");
  }
  const sessao = novaSessao();
  (await cookies()).set(COOKIE_PAINEL, sessao.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessao.maxAge,
  });
  redirect("/painel");
}

export async function sair() {
  (await cookies()).delete(COOKIE_PAINEL);
  redirect("/painel/login");
}

async function exigirLogin() {
  if (!(await estaLogado())) redirect("/painel/login");
}

export async function gerarLink(formData: FormData) {
  await exigirLogin();
  const solicitacao = await criarSolicitacao({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  });
  redirect(`/painel/${solicitacao.id}`);
}

export async function excluir(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id") ?? "");
  await prisma.solicitacaoDocumento.deleteMany({ where: { id } });
  redirect("/painel");
}
