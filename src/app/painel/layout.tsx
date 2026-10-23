import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel de documentos",
  robots: { index: false, follow: false },
};

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-zinc-50 text-zinc-900">{children}</div>;
}
