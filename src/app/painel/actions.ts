"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarSolicitacao, gerarChaveAtendente, isTipoFoto } from "@/lib/documentos";
import {
  COOKIE_PAINEL,
  opcoesDoCookie,
  podeVer,
  senhaConfere,
  sessaoAtual,
  sessaoDoGestor,
  type Sessao,
} from "@/lib/painel-auth";

// Volta para a lista do gestor filtrada pela atendente do cliente
function painelDa(sessao: Sessao, atendente: string | null | undefined): string {
  if (!sessao.gestor || !atendente) return "/painel";
  return `/painel?atendente=${encodeURIComponent(atendente)}`;
}

export async function entrar(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  if (!senhaConfere(senha)) {
    // atrasa a resposta para dificultar tentativas em sequência
    await new Promise((ok) => setTimeout(ok, 1000));
    redirect("/painel/login?erro=1");
  }
  const sessao = sessaoDoGestor();
  (await cookies()).set(COOKIE_PAINEL, sessao.valor, opcoesDoCookie(sessao.maxAge));
  redirect("/painel");
}

export async function sair() {
  (await cookies()).delete(COOKIE_PAINEL);
  redirect("/painel/login");
}

async function exigirLogin(): Promise<Sessao> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/painel/login");
  return sessao;
}

async function exigirGestor() {
  const sessao = await exigirLogin();
  if (!sessao.gestor) notFound();
}

// Carrega o cliente só se ele for de quem está no painel
async function clienteDaSessao(formData: FormData) {
  const sessao = await exigirLogin();
  const id = String(formData.get("id") ?? "");
  const cliente = await prisma.solicitacaoDocumento.findUnique({ where: { id }, select: { id: true, atendente: true } });
  if (!cliente || !podeVer(sessao, cliente.atendente)) notFound();
  return { sessao, cliente };
}

export async function gerarLink(formData: FormData) {
  const sessao = await exigirLogin();
  const solicitacao = await criarSolicitacao({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    // a atendente sempre cria para ela mesma
    atendente: sessao.gestor ? formData.get("atendente") : sessao.atendente.nome,
  }, { soDaAtendente: !sessao.gestor });
  if (!podeVer(sessao, solicitacao.atendente)) redirect("/painel");
  redirect(`/painel/${solicitacao.id}`);
}

export async function excluir(formData: FormData) {
  const { sessao, cliente } = await clienteDaSessao(formData);
  await prisma.solicitacaoDocumento.deleteMany({ where: { id: cliente.id } });
  redirect(painelDa(sessao, cliente.atendente));
}

// Foto ruim: apaga só ela e reabre o link; o cliente volta direto nesse passo
export async function pedirDeNovo(formData: FormData) {
  const { cliente } = await clienteDaSessao(formData);
  const tipo = formData.get("tipo");
  if (!isTipoFoto(tipo)) redirect(`/painel/${cliente.id}`);
  await prisma.$transaction([
    prisma.fotoDocumento.deleteMany({ where: { solicitacaoId: cliente.id, tipo } }),
    prisma.solicitacaoDocumento.updateMany({
      where: { id: cliente.id },
      data: { status: "aguardando", enviadoEm: null },
    }),
  ]);
  redirect(`/painel/${cliente.id}?refazer=${tipo}`);
}

export async function marcarConferido(formData: FormData) {
  const { sessao, cliente } = await clienteDaSessao(formData);
  await prisma.solicitacaoDocumento.updateMany({
    where: { id: cliente.id, status: "enviado" },
    data: { status: "conferido" },
  });
  redirect(painelDa(sessao, cliente.atendente));
}

// --- Atendentes (só o gestor) ---

export async function cadastrarAtendente(formData: FormData) {
  await exigirGestor();
  const nome = String(formData.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (nome) {
    await prisma.atendente.upsert({
      where: { nome },
      update: {},
      create: { nome, chave: gerarChaveAtendente(nome) },
    });
  }
  redirect("/painel/atendentes");
}

// Link vazou ou a atendente saiu: o link antigo para de funcionar na hora
export async function trocarLinkDaAtendente(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");
  const atendente = await prisma.atendente.findUnique({ where: { id } });
  if (atendente) {
    await prisma.atendente.update({ where: { id }, data: { chave: gerarChaveAtendente(atendente.nome) } });
  }
  redirect("/painel/atendentes");
}

export async function removerAtendente(formData: FormData) {
  await exigirGestor();
  await prisma.atendente.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  redirect("/painel/atendentes");
}
