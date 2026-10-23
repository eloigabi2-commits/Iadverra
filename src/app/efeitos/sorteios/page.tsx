import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import SorteiosStudio from "@/components/SorteiosStudio";

// Fonte das cartas: arredondada, bem legível em tela de celular e com acentos.
const baloo = Baloo_2({ subsets: ["latin"], weight: "800" });

export const metadata: Metadata = {
  title: "Sorteios para TikTok",
  description: "Pacotes de sorteio prontos para o modelo Randomizer 2D do Effect House.",
};

export default function SorteiosPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Só para o navegador carregar a fonte, que as cartas usam no canvas. */}
      <span className={`${baloo.className} sr-only`} aria-hidden>
        Sorteio
      </span>
      <SorteiosStudio font={baloo.style.fontFamily} />
    </div>
  );
}
