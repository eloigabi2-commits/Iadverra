import { Composition } from "remotion";
import { AllureAd, AD_DURATION } from "./AllureAd";
import { NfcAd, NFC_DURATION } from "./NfcAd";
import { LimpamosAd, LIMPAMOS_DURATION } from "./LimpamosAd";
import { EsclareceAd, ESCLARECE_DURATION } from "./EsclareceAd";
import { LegendaAd, LEGENDA_DURATION, Legenda2Ad, LEGENDA2_DURATION } from "./LegendaAd";

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="LimpamosAd"
      component={LimpamosAd}
      defaultProps={{ versao: "solucoes" as const }}
      durationInFrames={LIMPAMOS_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="AssessoriaAd"
      component={LimpamosAd}
      defaultProps={{ versao: "assessoria" as const }}
      durationInFrames={LIMPAMOS_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="MamaeAd"
      component={LimpamosAd}
      defaultProps={{ versao: "mamae" as const }}
      durationInFrames={LIMPAMOS_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Legenda2Ad"
      component={Legenda2Ad}
      durationInFrames={LEGENDA2_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LegendaAd"
      component={LegendaAd}
      durationInFrames={LEGENDA_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="EsclareceAd"
      component={EsclareceAd}
      durationInFrames={ESCLARECE_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="NfcAd"
      component={NfcAd}
      defaultProps={{ voz: "" }}
      durationInFrames={NFC_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="AllureAd"
      component={AllureAd}
      durationInFrames={AD_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    </>
  );
};
