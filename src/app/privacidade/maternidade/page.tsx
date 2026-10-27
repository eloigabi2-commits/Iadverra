import type { Metadata } from "next";
import { nomeEscritorio } from "@/lib/documentos";

export const metadata: Metadata = { title: "Política de privacidade – Salário-maternidade" };

export const dynamic = "force-dynamic";

// Política do atendimento de salário-maternidade (auxílio-maternidade). Além dos dados
// de sempre, esse atendimento trata dados de saúde (gestação e parto) e dados da criança,
// que a LGPD protege de forma especial (arts. 11 e 14). Revise com a equipe jurídica.
// Cores do Esclarece Mamãe: rosa e branco, no lugar do vinho do bancário.
const ROSA = "#d6407f";
const ROSA_ESCURO = "#b02a66";
export default function PrivacidadeMaternidade() {
  const escritorio = nomeEscritorio();
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
          Esta página explica como {escritorio} (Esclarece Mamãe) trata os seus dados e os do seu bebê no atendimento
          para pedir o salário-maternidade (auxílio-maternidade), conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Quais dados coletamos</h2>
        <p>
          Seu nome, telefone, CPF e NIS/PIS, as fotos do seu documento de identidade (RG ou CNH) e do comprovante de
          endereço, sua carteira de trabalho e seu histórico de contribuições ao INSS (CNIS). Do bebê, a certidão de
          nascimento ou, se for o caso, o termo de guarda ou de adoção. Quando necessário para o pedido, também
          documentos sobre a gestação e o parto, como atestados e relatórios médicos.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Para que usamos</h2>
        <p>
          Exclusivamente para analisar se você tem direito ao salário-maternidade, fazer o pedido ao INSS em seu nome,
          acompanhar o andamento e, se o pedido for negado, preparar o recurso ou o processo na Justiça. Não vendemos
          nem repassamos seus dados para fins de propaganda.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Cuidado especial com saúde e com o bebê</h2>
        <p>
          Informações sobre gravidez, parto e saúde são dados sensíveis, e os dados do seu filho são de uma criança.
          Por isso pedimos só o que o INSS ou a Justiça exigem para o benefício, usamos esses dados apenas para esse
          fim e sempre no melhor interesse da criança. Os dados do bebê são informados por você, mãe ou responsável.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Base legal</h2>
        <p>
          O tratamento é necessário para a prestação do serviço que você pediu (art. 7º, V, da LGPD) e para o exercício
          de direitos em processo administrativo ou judicial (art. 7º, VI, e art. 11, II, &quot;d&quot;). Os dados da
          criança seguem o art. 14 da LGPD.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Quem tem acesso</h2>
        <p>
          Apenas a pessoa da equipe responsável pelo seu atendimento, por um painel de acesso individual e restrito.
          Os documentos são apresentados ao INSS e, se for preciso, ao Poder Judiciário, só para o seu pedido.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Por quanto tempo guardamos</h2>
        <p>
          Pelo tempo necessário ao seu atendimento e ao cumprimento de obrigações legais e profissionais. Depois
          disso, os arquivos são apagados.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Ao continuar o atendimento</h2>
        <p>
          Ao continuar o atendimento e enviar seus documentos, você declara que está ciente e concorda com o uso dos
          seus dados e dos dados do seu bebê para essa finalidade, nos termos desta política.
        </p>

        <h2 className="font-marca text-2xl font-bold" style={{ color: ROSA_ESCURO }}>Seus direitos</h2>
        <p>
          Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados e os do seu bebê, ou retirar sua
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
