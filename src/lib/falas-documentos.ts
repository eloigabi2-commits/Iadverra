// O que a tela de envio de documentos fala em cada momento. Depois de mudar
// um texto, rode scripts/gerar-audios.ts para regravar o MP3 correspondente.
type Tipo = "rg_frente" | "rg_verso" | "comprovante";
export type Fala = "inicio" | Tipo | "conferir" | "enviando" | "fim" | "erro";

export const FALAS: Record<Fala, string> = {
  inicio:
    "Olá! Vamos tirar três fotos: o seu RG, dos dois lados, e uma conta de luz ou de água. " +
    "As fotos vão direto para o escritório, só para o seu atendimento. " +
    "Se você concorda, toque no botão verde.",
  rg_frente:
    "Pegue o seu RG e tire do plástico. Deixe em cima da mesa, com o lado da sua foto para cima. " +
    "Agora toque no botão azul e tire a foto.",
  rg_verso: "Muito bem! Agora vire o RG, para o outro lado. Toque no botão azul e tire a foto.",
  comprovante:
    "Falta só uma! Pegue uma conta de luz ou de água, com o seu endereço. " +
    "Toque no botão azul e tire a foto.",
  conferir:
    "Olhe a foto. Se o documento aparece inteiro e sem borrão, toque no verde. " +
    "Se ficou ruim, toque no laranja para tirar de novo.",
  enviando: "Enviando. Espere um pouquinho.",
  fim: "Pronto! Recebemos tudo. Muito obrigado. Pode voltar para o WhatsApp.",
  erro: "Não deu certo. Veja se a internet está ligada e toque no botão de novo.",
};
