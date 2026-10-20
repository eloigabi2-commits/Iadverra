import { Composition } from "remotion";
import { AllureAd, AD_DURATION } from "./AllureAd";
import { NfcAd, NFC_DURATION } from "./NfcAd";

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="NfcAd"
      component={NfcAd}
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
