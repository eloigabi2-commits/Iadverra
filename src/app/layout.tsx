import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PokeTroca — Marketplace de cartas e pacotes Pokémon",
  description:
    "Compre e venda cartas avulsas e pacotes de Pokémon direto com outros colecionadores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/10 dark:border-white/10 py-6 text-center text-xs text-black/50 dark:text-white/50">
          PokeTroca é um marketplace de colecionadores, sem vínculo com a
          Pokémon Company ou a Nintendo.
        </footer>
      </body>
    </html>
  );
}
