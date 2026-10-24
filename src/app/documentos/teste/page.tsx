import type { Metadata } from "next";
import EnvioDocumentos from "@/components/EnvioDocumentos";
import { nomeEscritorio } from "@/lib/documentos";

export const metadata: Metadata = {
  title: "Envio de documentos (teste)",
  robots: { index: false, follow: false },
};

// Mesma tela que o cliente recebe, para a equipe testar no celular sem gravar nada
export default function Teste() {
  return (
    <EnvioDocumentos
      token="teste"
      primeiroNome={null}
      escritorio={nomeEscritorio()}
      jaAceitou
      concluido={false}
      fotosEnviadas={[]}
      teste
    />
  );
}
