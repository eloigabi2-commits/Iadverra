"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cpfCnpjValido, criarCobranca, telefoneComPais, valorDoTexto } from "@/lib/cobrancas";
import {
  COOKIE_CREDITO,
  clienteAtual,
  creditoConfigurado,
  opcoesDoCookieCredito,
  sessaoDaConta,
} from "@/lib/credito-auth";
import { enviarPedidoAoWebhook, formaCredito, prazoCredito } from "@/lib/credito";

function texto(valor: FormDataEntryValue | null, limite: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
}

function erroNoPortal(caminho: string, mensagem: string): never {
  redirect(`${caminho}?erro=${encodeURIComponent(mensagem)}`);
}

export async function entrar(formData: FormData) {
  const nome = texto(formData.get("nome"), 120);
  const email = texto(formData.get("email"), 160).toLowerCase();
  const telefone = telefoneComPais(formData.get("telefone"));

  if (!creditoConfigurado()) erroNoPortal("/credito", "O portal está sendo configurado. Tente novamente mais tarde.");
  if (nome.length < 2) erroNoPortal("/credito", "Informe seu nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erroNoPortal("/credito", "Informe um e-mail válido.");
  if (!telefone || !/^55\d{10,11}$/.test(telefone)) erroNoPortal("/credito", "Informe um WhatsApp com DDD.");

  const cliente = await prisma.clienteCredito.create({
    data: { nome, email, telefone },
    select: { id: true },
  });

  const sessao = sessaoDaConta(cliente.id);
  (await cookies()).set(COOKIE_CREDITO, sessao.valor, opcoesDoCookieCredito(sessao.maxAge));
  redirect("/credito");
}

export async function sair() {
  (await cookies()).delete(COOKIE_CREDITO);
  redirect("/credito");
}

export async function adicionarFundos(formData: FormData) {
  const cliente = await clienteAtual();
  if (!cliente) redirect("/credito");

  const valor = valorDoTexto(formData.get("valor"));
  if (valor === null || valor < 5) erroNoPortal("/credito/adicionar", "Informe um valor a partir de R$ 5,00.");

  const cpfCnpj = texto(formData.get("cpfCnpj"), 20);
  if (!cpfCnpjValido(cpfCnpj)) erroNoPortal("/credito/adicionar", "Informe um CPF válido.");

  const forma = formaCredito(formData.get("forma"));
  if (!forma) erroNoPortal("/credito/adicionar", "Escolha Pix ou cartão de crédito.");

  const prazo = prazoCredito(formData.get("prazo"));

  const repetido = await prisma.pedidoCredito.findFirst({
    where: {
      contaId: cliente.id,
      valor,
      formaPagamento: forma,
      prazo,
      status: { not: "cancelado" },
      criadoEm: { gte: new Date(Date.now() - 2 * 60_000) },
    },
    orderBy: { criadoEm: "desc" },
    select: { id: true },
  });
  if (repetido) redirect(`/credito/pedido/${repetido.id}`);

  const recentes = await prisma.pedidoCredito.count({
    where: { contaId: cliente.id, criadoEm: { gte: new Date(Date.now() - 10 * 60_000) } },
  });
  if (recentes >= 5) {
    erroNoPortal("/credito/adicionar", "Você fez vários pedidos seguidos. Aguarde alguns minutos e tente de novo.");
  }

  const criada = await criarCobranca(
    {
      nome: cliente.nome,
      email: cliente.email,
      telefone: cliente.telefone,
      cpfCnpj,
      descricao: "Adição de fundos",
      valor,
    },
    { atendente: "Crédito" },
  );

  if (!criada.ok) erroNoPortal("/credito/adicionar", criada.erro);

  const pedido = await prisma.pedidoCredito.create({
    data: {
      contaId: cliente.id,
      cobrancaId: criada.cobranca.id,
      valor,
      formaPagamento: forma,
      prazo,
    },
    select: { id: true },
  });

  const envio = await enviarPedidoAoWebhook({
    nome: cliente.nome,
    email: cliente.email,
    telefone: cliente.telefone,
    valor,
    formaPagamento: forma,
    prazo,
  });

  await prisma.pedidoCredito.update({
    where: { id: pedido.id },
    data: {
      status: envio.ok ? "aguardando_pagamento" : "erro_webhook",
      webhookStatus: envio.status,
      webhookErro: envio.erro,
    },
  });

  revalidatePath("/credito");
  redirect(`/credito/pedido/${pedido.id}`);
}

export async function reenviarPedido(formData: FormData) {
  const cliente = await clienteAtual();
  if (!cliente) redirect("/credito");

  const id = texto(formData.get("id"), 60);
  const pedido = await prisma.pedidoCredito.findUnique({
    where: { id },
    include: { conta: true, cobranca: { select: { status: true } } },
  });
  if (!pedido || pedido.contaId !== cliente.id) redirect("/credito");
  if (pedido.status === "pago" || pedido.cobranca?.status === "paga") redirect(`/credito/pedido/${pedido.id}`);

  const envio = await enviarPedidoAoWebhook({
    nome: pedido.conta.nome,
    email: pedido.conta.email,
    telefone: pedido.conta.telefone,
    valor: Number(pedido.valor),
    formaPagamento: formaCredito(pedido.formaPagamento) ?? "pix",
    prazo: pedido.prazo,
  });

  await prisma.pedidoCredito.update({
    where: { id: pedido.id },
    data: {
      status: envio.ok ? "aguardando_pagamento" : "erro_webhook",
      webhookStatus: envio.status,
      webhookErro: envio.erro,
    },
  });

  revalidatePath("/credito");
  redirect(`/credito/pedido/${pedido.id}`);
}
