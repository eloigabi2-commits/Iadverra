import type { Metadata } from "next";
import { nomeEscritorio } from "@/lib/documentos";

export const metadata: Metadata = { title: "Política de privacidade" };

export const dynamic = "force-dynamic";

// Modelo de política para o envio de documentos. Revise o texto com a equipe
// jurídica antes de usar; nome e contato vêm de NOME_ESCRITORIO e CONTATO_PRIVACIDADE.
export default function Privacidade() {
  const escritorio = nomeEscritorio();
  const contato = process.env.CONTATO_PRIVACIDADE?.trim();

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-zinc-900">
      <article className="mx-auto max-w-2xl space-y-5 text-lg leading-relaxed">
        <h1 className="text-3xl font-bold">Política de privacidade</h1>
        <p>
          Esta página explica como o {escritorio} trata os documentos que você envia pelo link de envio de
          documentos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>

        <h2 className="text-2xl font-bold">Quais dados coletamos</h2>
        <p>
          Fotos da frente e do verso do seu documento de identidade (RG ou CNH) e do seu comprovante de
          endereço, além do nome e telefone que você já nos informou no atendimento.
        </p>

        <h2 className="text-2xl font-bold">Para que usamos</h2>
        <p>
          Só para analisar o seu caso, preparar a procuração e os documentos do seu processo e entrar com as
          medidas necessárias em seu nome. Não vendemos nem repassamos seus dados para fins de propaganda.
        </p>

        <h2 className="text-2xl font-bold">Base legal</h2>
        <p>
          O tratamento é necessário para a prestação do serviço que você contratou ou pediu (art. 7º, V, da
          LGPD) e para o exercício de direitos em processo judicial ou administrativo (art. 7º, VI).
        </p>

        <h2 className="text-2xl font-bold">Quem tem acesso</h2>
        <p>
          Apenas a equipe do escritório responsável pelo seu atendimento, por um painel protegido por senha.
          Os documentos podem ser apresentados a bancos, órgãos públicos e ao Poder Judiciário quando isso for
          necessário para o seu caso.
        </p>

        <h2 className="text-2xl font-bold">Por quanto tempo guardamos</h2>
        <p>
          Pelo tempo necessário ao seu atendimento e ao cumprimento de obrigações legais e profissionais.
          Depois disso, os arquivos são apagados.
        </p>

        <h2 className="text-2xl font-bold">Seus direitos</h2>
        <p>
          Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados, ou retirar sua
          autorização
          {contato ? (
            <>
              , pelo contato <strong>{contato}</strong>.
            </>
          ) : (
            <>, falando com a gente pelo mesmo WhatsApp do atendimento.</>
          )}
        </p>
      </article>
    </main>
  );
}
