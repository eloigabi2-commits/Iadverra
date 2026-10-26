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
    <main className="min-h-screen bg-creme text-tinta">
      <header className="flex justify-center bg-vinho px-5 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/esclarece-logo.png" alt="Esclarece Assessoria" className="h-14 w-auto" />
      </header>
      <article className="mx-auto max-w-2xl space-y-5 px-5 py-10 text-lg leading-relaxed">
        <h1 className="font-marca text-3xl font-bold text-vinho">Política de privacidade</h1>
        <p>
          Esta página explica como {escritorio} trata os documentos que você envia pelo link de envio de
          documentos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>

        <h2 className="font-marca text-2xl font-bold text-vinho">Quais dados coletamos</h2>
        <p>
          Seu nome, telefone e CPF, as fotos da frente e do verso do seu documento de identidade (RG ou CNH), o
          seu comprovante de endereço e as informações do seu benefício e dos seus empréstimos que você nos passar
          no atendimento.
        </p>

        <h2 className="font-marca text-2xl font-bold text-vinho">Para que usamos</h2>
        <p>
          Exclusivamente para analisar o seu caso, preparar a procuração e os documentos do seu processo e tomar as
          medidas necessárias em seu nome. Não vendemos nem repassamos seus dados para fins de propaganda.
        </p>

        <h2 className="font-marca text-2xl font-bold text-vinho">Base legal</h2>
        <p>
          O tratamento é necessário para a prestação do serviço que você contratou ou pediu (art. 7º, V, da
          LGPD) e para o exercício de direitos em processo judicial ou administrativo (art. 7º, VI).
        </p>

        <h2 className="font-marca text-2xl font-bold text-vinho">Quem tem acesso</h2>
        <p>
          Apenas a pessoa da equipe responsável pelo seu atendimento, por um painel de acesso individual e restrito.
          Os documentos podem ser apresentados a bancos, órgãos públicos e ao Poder Judiciário quando isso for
          necessário para o seu caso.
        </p>

        <h2 className="font-marca text-2xl font-bold text-vinho">Por quanto tempo guardamos</h2>
        <p>
          Pelo tempo necessário ao seu atendimento e ao cumprimento de obrigações legais e profissionais.
          Depois disso, os arquivos são apagados.
        </p>

        <h2 className="font-marca text-2xl font-bold text-vinho">Ao continuar o atendimento</h2>
        <p>
          Ao continuar o atendimento e enviar seus documentos, você declara que está ciente e concorda com o uso dos
          seus dados para essa finalidade, nos termos desta política.
        </p>

        <h2 className="font-marca text-2xl font-bold text-vinho">Seus direitos</h2>
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
