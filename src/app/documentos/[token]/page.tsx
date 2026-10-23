import type { Metadata } from "next";
import EnvioDocumentos from "@/components/EnvioDocumentos";
import { buscarPorToken, nomeEscritorio } from "@/lib/documentos";

export const metadata: Metadata = {
  title: "Envio de documentos",
  robots: { index: false, follow: false },
};

export default async function Page(props: PageProps<"/documentos/[token]">) {
  const { token } = await props.params;
  const solicitacao = await buscarPorToken(token);

  if (!solicitacao) {
    return (
      <main className="min-h-screen bg-creme text-tinta">
        <header className="flex justify-center bg-vinho px-5 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/esclarece-logo.png" alt="Esclarece Assessoria" className="h-14 w-auto" />
        </header>
        <div className="mx-auto max-w-md px-5 py-12 text-center">
          <h1 className="font-marca text-3xl font-bold text-vinho">Link inválido</h1>
          <p className="mt-4 text-xl leading-relaxed">
            Este link não existe ou foi digitado errado. Peça um novo link pelo WhatsApp.
          </p>
        </div>
      </main>
    );
  }

  return (
    <EnvioDocumentos
      token={token}
      primeiroNome={solicitacao.nome?.split(" ")[0] ?? null}
      escritorio={nomeEscritorio()}
      jaAceitou={!!solicitacao.consentimentoEm}
      concluido={solicitacao.status !== "aguardando"}
      fotosEnviadas={solicitacao.fotos.map((f) => f.tipo)}
    />
  );
}
