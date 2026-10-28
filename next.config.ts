import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // áudios dos fluxos de maternidade e bancário (WhatsApp): o DataCrazy baixa daqui e manda como áudio de voz
  async headers() {
    return [
      {
        source: "/audio/maternidade/:arquivo*",
        headers: [{ key: "Content-Type", value: "audio/ogg; codecs=opus" }],
      },
      {
        source: "/audio/bancario/:arquivo*",
        headers: [{ key: "Content-Type", value: "audio/ogg; codecs=opus" }],
      },
    ];
  },
  async redirects() {
    return [
      // mensagens já enviadas levavam a política em itálico e o WhatsApp abria ".../privacidade_"
      { source: "/privacidade_", destination: "/privacidade", permanent: true },
    ];
  },
};

export default nextConfig;
