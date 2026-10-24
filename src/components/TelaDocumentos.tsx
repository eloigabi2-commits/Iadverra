import EnvioDocumentos from "@/components/EnvioDocumentos";
import { nomeEscritorio } from "@/lib/documentos";

type Solicitacao = {
  token: string;
  nome: string | null;
  consentimentoEm: Date | null;
  status: string;
  fotos: { tipo: string }[];
};

// Tela do cliente, aberta pelo link curto (/d/<codigo>) ou pelo antigo (/documentos/<token>)
export default function TelaDocumentos({ solicitacao }: { solicitacao: Solicitacao | null }) {
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
      token={solicitacao.token}
      primeiroNome={solicitacao.nome?.split(" ")[0] ?? null}
      escritorio={nomeEscritorio()}
      jaAceitou={!!solicitacao.consentimentoEm}
      concluido={solicitacao.status !== "aguardando"}
      fotosEnviadas={solicitacao.fotos.map((f) => f.tipo)}
    />
  );
}
