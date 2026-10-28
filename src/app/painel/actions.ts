"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarSolicitacao, gerarChaveAtendente, isTipoFoto, SEM_ATENDENTE } from "@/lib/documentos";
import { criarCobranca } from "@/lib/cobrancas";
import {
  COOKIE_PAINEL,
  opcoesDoCookie,
  podeVer,
  senhaConfere,
  sessaoAtual,
  sessaoDoGestor,
  type Sessao,
  veTudo,
} from "@/lib/painel-auth";

// Volta para a lista geral filtrada pela atendente do cliente
function painelDa(sessao: Sessao, atendente: string | null | undefined): string {
  if (!veTudo(sessao)) return "/painel";
  return `/painel?atendente=${encodeURIComponent(atendente || SEM_ATENDENTE)}`;
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
    atendente: sessao.gestor || sessao.atendente.veTodos ? formData.get("atendente") : sessao.atendente.nome,
  }, { soDaAtendente: !veTudo(sessao) });
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

// --- Cobranças (Pix e cartão pelo Asaas) ---

export async function gerarCobranca(formData: FormData) {
  const sessao = await exigirLogin();
  const solicitacaoId = String(formData.get("solicitacaoId") ?? "").trim() || null;

  if (solicitacaoId) {
    const cliente = await prisma.solicitacaoDocumento.findUnique({
      where: { id: solicitacaoId },
      select: { atendente: true },
    });
    if (!cliente || !podeVer(sessao, cliente.atendente)) notFound();
  }

  const atendente =
    sessao.gestor || sessao.atendente.veTodos
      ? String(formData.get("atendente") ?? "").trim() || null
      : sessao.atendente.nome;

  const resultado = await criarCobranca(
    {
      nome: formData.get("nome"),
      cpfCnpj: formData.get("cpfCnpj"),
      email: formData.get("email"),
      telefone: formData.get("telefone"),
      descricao: formData.get("descricao"),
      valor: formData.get("valor"),
      solicitacaoId,
    },
    { atendente },
  );

  const volta = solicitacaoId ? `&solicitacao=${encodeURIComponent(solicitacaoId)}` : "";
  if (!resultado.ok) redirect(`/painel/cobrancas?erro=${encodeURIComponent(resultado.erro)}${volta}`);
  redirect(`/painel/cobrancas?criada=${encodeURIComponent(resultado.cobranca.codigo)}${volta}`);
}

async function cobrancaDaSessao(formData: FormData) {
  const sessao = await exigirLogin();
  const id = String(formData.get("id") ?? "");
  const cobranca = await prisma.cobranca.findUnique({ where: { id } });
  if (!cobranca || !podeVer(sessao, cobranca.atendente)) notFound();
  return cobranca;
}

export async function cancelarCobranca(formData: FormData) {
  const cobranca = await cobrancaDaSessao(formData);
  const aberta = cobranca.status === "pendente" || cobranca.status === "vencida";
  if (aberta) {
    if (cobranca.asaasPaymentId) {
      const { excluirPagamento } = await import("@/lib/asaas");
      await excluirPagamento(cobranca.asaasPaymentId);
    }
    await prisma.cobranca.update({
      where: { id: cobranca.id },
      data: {
        status: "cancelada",
        pixPayload: null,
        pixImagem: null,
        pixExpiraEm: null,
      },
    });
    await prisma.pedidoCredito.updateMany({
      where: { cobrancaId: cobranca.id },
      data: { status: "cancelado" },
    });
  }
  redirect("/painel/cobrancas");
}

// Pix ou dinheiro recebido fora do site: só o painel confirma esse caso
export async function marcarCobrancaPaga(formData: FormData) {
  const cobranca = await cobrancaDaSessao(formData);
  if (cobranca.status === "pendente" || cobranca.status === "vencida" || cobranca.status === "analise") {
    await prisma.cobranca.update({
      where: { id: cobranca.id },
      data: { status: "paga", pagoEm: cobranca.pagoEm ?? new Date() },
    });
    await prisma.pedidoCredito.updateMany({
      where: { cobrancaId: cobranca.id },
      data: { status: "pago" },
    });
  }
  redirect("/painel/cobrancas");
}

// --- Atendentes (só o gestor) ---

export async function cadastrarAtendente(formData: FormData) {
  await exigirGestor();
  const nome = String(formData.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const veTodos = formData.get("veTodos") === "sim";
  if (nome) {
    await prisma.atendente.upsert({
      where: { nome },
      update: {},
      create: { nome, chave: gerarChaveAtendente(nome), veTodos },
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
