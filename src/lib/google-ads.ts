// Configuração do Google Ads (gtag.js). Tudo vem de variáveis de ambiente
// públicas: sem NEXT_PUBLIC_GOOGLE_ADS_ID a tag simplesmente não é carregada.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const ADS_ID_PATTERN = /^AW-\d+$/;

/** ID da conta do Google Ads (ex: "AW-123456789"), ou null se não configurado/inválido. */
export function getGoogleAdsId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
  return id && ADS_ID_PATTERN.test(id) ? id : null;
}

/**
 * `send_to` da ação de conversão de exportação de CSV
 * (ex: "AW-123456789/AbC-D_efG-h12_34-567"), ou null se não configurado.
 */
export function getExportConversionSendTo(): string | null {
  const adsId = getGoogleAdsId();
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_EXPORT_CONVERSION_LABEL?.trim();
  return adsId && label ? `${adsId}/${label}` : null;
}

/** Dispara a conversão de exportação de CSV, se a tag e o rótulo estiverem configurados. */
export function trackExportConversion(): void {
  const sendTo = getExportConversionSendTo();
  if (!sendTo || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "conversion", { send_to: sendTo });
}
