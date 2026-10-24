"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarSolicitacao, isTipoFoto } from "@/lib/documentos";
import { COOKIE_PAINEL, estaLogado, novaSessao, senhaConfere } from "@/lib/painel-auth";

// Volta para o painel da atendente quando ela entrou pelo link dela
function painelDa(atendente: unknown): string {
  const nome = typeof atendente === "string" ? atendente.trim() : "";
  return nome ? `/painel?atendente=${encodeURIComponent(nome)}` : "/painel";
}

export async function entrar(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  const atendente = formData.get("atendente");
  if (!senhaConfere(senha)) {
    // atrasa a resposta para dificultar tentativas em sequência
    await new Promise((ok) => setTimeout(ok, 1000));
    const volta = typeof atendente === "string" && atendente ? `&atendente=${encodeURIComponent(atendente)}` : "";
    redirect(`/painel/login?erro=1${volta}`);
  }
  const sessao = novaSessao();
  (await cookies()).set(COOKIE_PAINEL, sessao.valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessao.maxAge,
  });
  redirect(painelDa(atendente));
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
    atendente: formData.get("atendente"),
  });
  redirect(`/painel/${solicitacao.id}`);
}

export async function excluir(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id") ?? "");
  const atual = await prisma.solicitacaoDocumento.findUnique({ where: { id }, select: { atendente: true } });
  await prisma.solicitacaoDocumento.deleteMany({ where: { id } });
  redirect(painelDa(atual?.atendente));
}

// Foto ruim: apaga só ela e reabre o link; o cliente volta direto nesse passo
export async function pedirDeNovo(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id") ?? "");
  const tipo = formData.get("tipo");
  if (!isTipoFoto(tipo)) redirect(`/painel/${id}`);
  await prisma.$transaction([
    prisma.fotoDocumento.deleteMany({ where: { solicitacaoId: id, tipo } }),
    prisma.solicitacaoDocumento.updateMany({
      where: { id },
      data: { status: "aguardando", enviadoEm: null },
    }),
  ]);
  redirect(`/painel/${id}?refazer=${tipo}`);
}

export async function marcarConferido(formData: FormData) {
  await exigirLogin();
  const id = String(formData.get("id") ?? "");
  const atual = await prisma.solicitacaoDocumento.findUnique({ where: { id }, select: { atendente: true } });
  await prisma.solicitacaoDocumento.updateMany({
    where: { id, status: "enviado" },
    data: { status: "conferido" },
  });
  redirect(painelDa(atual?.atendente));
}
