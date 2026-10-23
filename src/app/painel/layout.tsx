import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel de documentos – Esclarece",
  robots: { index: false, follow: false },
};

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-creme text-tinta">
      <header className="bg-vinho">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/esclarece-brasao.png" alt="" className="h-11 w-auto" />
          <div className="leading-tight text-marfim">
            <p className="font-marca text-xl font-bold tracking-wide">ESCLARECE</p>
            <p className="text-xs tracking-[0.3em]">PAINEL DE DOCUMENTOS</p>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
