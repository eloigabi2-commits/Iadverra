import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // mensagens já enviadas levavam a política em itálico e o WhatsApp abria ".../privacidade_"
      { source: "/privacidade_", destination: "/privacidade", permanent: true },
    ];
  },
};

export default nextConfig;
