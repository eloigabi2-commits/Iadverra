import type { Metadata } from "next";
import TiktokEffectStudio from "@/components/TiktokEffectStudio";

export const metadata: Metadata = {
  title: "Estúdio de efeitos TikTok",
  description: "Crie filtros de câmera para o TikTok e exporte para o Effect House.",
};

export default function EfeitosPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <TiktokEffectStudio />
    </div>
  );
}
