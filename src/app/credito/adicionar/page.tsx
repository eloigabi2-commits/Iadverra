import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteAtual } from "@/lib/credito-auth";
import { PRAZOS } from "@/lib/credito";
import { formatarValor } from "@/lib/cobrancas";
import BotaoEnviar from "@/components/BotaoEnviar";
import { adicionarFundos } from "../actions";

export const metadata: Metadata = {
  title: "Adicionar fundos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function Page(props: PageProps<"/credito/adicionar">) {
  const cliente = await clienteAtual();
  if (!cliente) redirect("/credito");

  const busca = await props.searchParams;
  const erro = typeof busca.erro === "string" ? busca.erro : null;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8 text-tinta">
      <Link href="/credito" className="text-sm text-tinta/60 underline">
        â† Voltar
      </Link>
      <h1 className="mt-4 font-marca text-3xl font-bold text-vinho">Adicionar fundos</h1>
      <p className="mt-1 text-sm text-tinta/60">
        {cliente.nome} Â· {cliente.email}
      </p>

      {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{erro}</p>}

      <form action={adicionarFundos} className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium">Quanto vocÃª quer adicionar?</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-marfim bg-white px-3">
            <span className="text-lg text-tinta/50">R$</span>
            <input
              name="valor"
              required
              autoFocus
              inputMode="decimal"
              placeholder="1.000,00"
              className="w-full bg-transparent py-3 text-lg outline-none"
            />
          </div>
          <span className="mt-1 block text-xs text-tinta/50">
            Valor mÃ­nimo de {formatarValor(5)}. O valor escolhido Ã© o valor cobrado no Pix ou no cartÃ£o.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">CPF do titular</span>
          <input
            name="cpfCnpj"
            required
            inputMode="numeric"
            maxLength={18}
            placeholder="000.000.000-00"
            className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
          />
          <span className="mt-1 block text-xs text-tinta/50">
            O CPF Ã© exigido pelo Asaas para emitir a cobranÃ§a. Ele nÃ£o fica salvo no portal.
          </span>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">Como vocÃª quer pagar?</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-marfim p-3 has-[:checked]:border-vinho has-[:checked]:bg-creme">
              <input type="radio" name="forma" value="pix" defaultChecked />
              <span className="font-medium">Pix</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-marfim p-3 has-[:checked]:border-vinho has-[:checked]:bg-creme">
              <input type="radio" name="forma" value="cartao" />
              <span className="font-medium">CartÃ£o de crÃ©dito</span>
            </label>
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium">Quando você pretende pagar?</span>
          <input
            name="prazo"
            list="prazos"
            defaultValue={PRAZOS[0]}
            maxLength={60}
            className="mt-1 w-full rounded-lg border border-marfim bg-white px-3 py-3 text-lg"
          />
          <datalist id="prazos">
            {PRAZOS.map((prazo) => (
              <option key={prazo} value={prazo} />
            ))}
          </datalist>
          <span className="mt-1 block text-xs text-tinta/50">Você pode escrever outro prazo, se precisar.</span>
        </label>

        <BotaoEnviar
          className="w-full rounded-lg bg-vinho px-4 py-3 text-lg font-semibold text-white disabled:opacity-60"
          enviando="Enviando pedido..."
        >
          Continuar para o pagamento
        </BotaoEnviar>
        <p className="text-center text-xs text-tinta/50">
          No prÃ³ximo passo vocÃª paga com Pix na hora ou informa os dados do cartÃ£o.
        </p>
      </form>
    </main>
  );
}

