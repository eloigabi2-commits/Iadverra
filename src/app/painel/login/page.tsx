import { redirect } from "next/navigation";
import { entrar } from "../actions";
import { painelConfigurado, sessaoAtual } from "@/lib/painel-auth";

export default async function Login(props: PageProps<"/painel/login">) {
  const { erro, atendente, link } = await props.searchParams;
  if (await sessaoAtual()) redirect("/painel");

  return (
    <main className="mx-auto max-w-sm px-5 py-16">
      {(atendente || link) && (
        <div className="mb-8 rounded-xl bg-marfim p-4">
          <p className="font-semibold">
            {link ? "Este link não vale mais." : "Atendente: entre pelo seu link pessoal."}
          </p>
          <p className="mt-1 text-sm text-tinta/70">
            Cada atendente tem um link só dela, que abre o painel direto, sem senha. Peça o seu ao gestor.
          </p>
        </div>
      )}
      <h1 className="font-marca text-3xl font-bold text-vinho">Acesso do gestor</h1>
      {!painelConfigurado() ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-amber-900">
          Configure a variável de ambiente <code>PAINEL_SENHA</code> para liberar o acesso.
        </p>
      ) : (
        <form action={entrar} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Senha</span>
            <input
              type="password"
              name="senha"
              required
              autoFocus={!atendente && !link}
              className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
            />
          </label>
          {erro && <p className="text-sm text-red-700">Senha incorreta.</p>}
          <button className="w-full rounded-lg bg-vinho px-4 py-3 text-lg font-semibold text-white">Entrar</button>
        </form>
      )}
    </main>
  );
}
