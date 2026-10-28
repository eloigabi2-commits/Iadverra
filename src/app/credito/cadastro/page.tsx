import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import BotaoEnviar from "@/components/BotaoEnviar";
import { nomeEscritorio } from "@/lib/documentos";
import { clienteAtual, creditoConfigurado } from "@/lib/credito-auth";
import { cadastrar } from "../actions";

export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page(props: PageProps<"/credito/cadastro">) {
  const busca = await props.searchParams;
  const erro = typeof busca.erro === "string" ? busca.erro : null;

  if (await clienteAtual()) redirect("/credito");

  return (
    <main className="flex flex-1 items-center justify-center bg-creme px-5 py-10 text-tinta">
      <div className="w-full max-w-md">
        <p className="font-marca text-2xl font-bold text-vinho">{nomeEscritorio()}</p>
        <h1 className="mt-6 font-marca text-3xl font-bold text-vinho">Criar conta</h1>
        <p className="mt-2 text-tinta/70">
          Cadastre o seu e-mail e uma senha. Os seus pedidos e valores ficam separados dos outros clientes.
        </p>

        {!creditoConfigurado() && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-amber-900">
            O portal está sendo configurado. Tente novamente mais tarde.
          </p>
        )}
        {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{erro}</p>}

        <form action={cadastrar} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium">Nome completo</span>
            <input
              name="nome"
              required
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">WhatsApp com DDD</span>
            <input
              name="telefone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Senha</span>
            <input
              name="senha"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Confirmar senha</span>
            <input
              name="confirmacao"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
            />
          </label>
          <BotaoEnviar
            className="w-full rounded-lg bg-vinho px-4 py-3 text-lg font-semibold text-white disabled:opacity-60"
            enviando="Criando conta..."
          >
            Criar conta
          </BotaoEnviar>
          <p className="text-center text-sm text-tinta/60">
            Já tem conta?{" "}
            <Link href="/credito" className="font-semibold text-vinho underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
