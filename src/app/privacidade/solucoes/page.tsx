import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade – Esclarece Soluções" };

// Política da Esclarece Soluções (limpa nome), com as cores da marca: azul e branco.
const AZUL = "#2d34a8";

export default function PrivacidadeSolucoes() {
  const titulo = "font-marca text-2xl font-bold";
  return (
    <main className="min-h-screen bg-white text-tinta">
      <header className="flex justify-center px-5 py-2" style={{ backgroundColor: AZUL }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/esclarece-solucoes-logo.png" alt="Esclarece Soluções" className="h-20 w-auto" />
      </header>
      <article className="mx-auto max-w-2xl space-y-5 px-5 py-10 text-lg leading-relaxed">
        <h1 className="font-marca text-3xl font-bold" style={{ color: AZUL }}>
          Política de privacidade
        </h1>

        <h2 className={titulo} style={{ color: AZUL }}>1. Quem somos</h2>
        <p>
          A Esclarece Soluções presta serviços de regularização de crédito e reabilitação de nome, com atendimento
          pelo WhatsApp.
        </p>

        <h2 className={titulo} style={{ color: AZUL }}>2. Dados que coletamos</h2>
        <p>
          Seu nome, telefone e CPF, as fotos da frente e do verso do seu documento de identidade (RG ou CNH), o seu
          comprovante de endereço e as informações das suas restrições junto aos órgãos de proteção ao crédito.
        </p>
        <p>
          Ao falar com nossa equipe, você pode informar nome, CPF ou CNPJ e e-mail. Esses dados são usados
          exclusivamente para iniciar a conversa de atendimento no WhatsApp e realizar a análise da sua situação.
          Para a elaboração do contrato, solicitaremos as fotos da frente e do verso dos seus documentos e o
          comprovante de endereço. Este site não usa cookies de rastreamento nem ferramentas de análise de navegação.
        </p>

        <h2 className={titulo} style={{ color: AZUL }}>3. Como usamos</h2>
        <p>
          Os dados informados são tratados para responder ao seu contato, analisar a viabilidade do seu caso e,
          havendo contratação, executar o serviço. Não enviamos comunicações de marketing sem o seu consentimento.
        </p>

        <h2 className={titulo} style={{ color: AZUL }}>4. Compartilhamento</h2>
        <p>
          Os dados ficam restritos ao time responsável pelo atendimento e pelo processo, incluindo, quando aplicável,
          a associação de defesa do consumidor parceira, na medida necessária ao serviço. Não vendemos nem cedemos
          dados a terceiros para fins comerciais.
        </p>

        <h2 className={titulo} style={{ color: AZUL }}>5. Seus direitos (LGPD)</h2>
        <p>
          Nos termos da Lei nº 13.709/2018, você pode solicitar acesso, correção ou exclusão dos seus dados, bem como
          informações sobre o tratamento, pelo nosso canal de atendimento no WhatsApp.
        </p>

        <h2 className={titulo} style={{ color: AZUL }}>6. Contato</h2>
        <p>
          Dúvidas sobre esta política podem ser enviadas ao nosso atendimento no WhatsApp, disponível na página
          principal.
        </p>
      </article>
    </main>
  );
}
