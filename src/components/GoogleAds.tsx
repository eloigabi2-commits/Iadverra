import Script from "next/script";
import { getGoogleAdsId } from "@/lib/google-ads";

/** Carrega a tag global do Google Ads (gtag.js) quando NEXT_PUBLIC_GOOGLE_ADS_ID está definido. */
export default function GoogleAds() {
  const adsId = getGoogleAdsId();
  if (!adsId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${adsId}');`}
      </Script>
    </>
  );
}
