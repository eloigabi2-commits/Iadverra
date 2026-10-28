import type { Metadata, Viewport } from "next";
import InstagramPainel from "@/components/InstagramPainel";

export const metadata: Metadata = {
  title: "Espelho",
  description: "Quem não te segue de volta, quem você não segue, quem saiu e prováveis bloqueios.",
  applicationName: "Espelho",
  manifest: "/espelho/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/espelho/icon.svg", type: "image/svg+xml" },
      { url: "/espelho/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/espelho/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Espelho",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function Instagram() {
  return (
    <main className="min-h-screen bg-white px-4 text-neutral-900">
      <InstagramPainel />
    </main>
  );
}
