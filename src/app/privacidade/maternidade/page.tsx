import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade – Salário-maternidade" };

export const dynamic = "force-dynamic";

// Política do atendimento de salário-maternidade (auxílio-maternidade). O atendimento é com
// gestantes: o texto fala só dos dados dela, sem citar bebê. Os dados da gestação são dados
// de saúde, que a LGPD protege de forma especial (art. 11). Revise com a equipe jurídica.
// Cores do Esclarece Mamãe: rosa e branco, no lugar do vinho do bancário.
const ROSA = "#d6407f";
const ROSA_ESCURO = "#b02a66";
export default function PrivacidadeMaternidade() {
  const contato = process.env.CONTATO_PRIVACIDADE?.trim();

  return (
    <main className="min-h-screen bg-white text-tinta">
      <header className="flex justify-center px-5 py-3" style={{ backgroundColor: ROSA }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/esclarece-logo.png" alt="Esclarece Assessoria" className="h-14 w-auto" />
      </header>
      <article className="mx-auto max-w-2xl space-y-5 px-5 py-10 text-lg leading-relaxed">
        <h1 className="font-marca text-3xl font-bold" style={{ color: ROSA_ESCURO }}>Política de privacidade</h1>
        <p>
          <span className="inline-block rounded-full px-4 py-1 font-semibold text-white" style={{ backgroundColor: ROSA }}>
            Esclarece Mamãe
          </span>
        </p>
        <p>
          Esta página garante como a Esclarece Mamãe trata os seus dados e os documentos que você envia para o nosso
          atendimento do salário-maternidade (auxílio-maternidade), conforme a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018).
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Quais dados coletamos</h2>
        <p>
          Seu nome, telefone, CPF e NIS/PIS, as fotos do seu documento de identidade (RG ou CNH) e do comprovante de
          endereço, sua carteira de trabalho e seu histórico de contribuições ao INSS (CNIS) e, quando necessário para o
          pedido, documentos sobre a sua gestação, como atestados e relatórios médicos, que você enviará durante o seu
          atendimento.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Para que utilizamos os seus documentos</h2>
        <p>
          Exclusivamente para analisar se você tem direito ao salário-maternidade, preparar o contrato, a procuração e
          os documentos do seu pedido, fazer o pedido ao INSS em seu nome e acompanhar o andamento. Não vendemos nem
          repassamos seus dados para fins de propaganda.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Cuidado especial com os seus dados de saúde</h2>
        <p>
          Informações sobre a sua gestação e a sua saúde são dados sensíveis. Por isso pedimos só o que o INSS exige
          para o benefício e usamos esses dados apenas para esse fim.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Base legal</h2>
        <p>
          O tratamento é necessário para a prestação do serviço que você pediu (art. 7º, V, da LGPD) e para o exercício
          dos seus direitos no pedido ao INSS (art. 7º, VI, e art. 11, II, &quot;d&quot;).
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Quem tem acesso</h2>
        <p>
          Apenas o especialista responsável pelo seu atendimento, por um painel de acesso individual e restrito. Os
          documentos são apresentados ao INSS só para o seu pedido.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Por quanto tempo guardamos</h2>
        <p>
          Pelo tempo necessário ao seu atendimento e ao cumprimento de obrigações legais e profissionais. Depois
          disso, os arquivos são apagados.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Ao continuar o atendimento</h2>
        <p>
          Ao continuar o atendimento e enviar seus documentos, você declara que está ciente e concorda com o uso dos
          seus dados para essa finalidade, nos termos desta política.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Seus direitos</h2>
        <p>
          Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados, ou retirar sua autorização
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
