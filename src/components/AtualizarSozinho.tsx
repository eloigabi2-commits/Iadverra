"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recarrega a lista de tempos em tempos para os envios novos aparecerem sem F5
export default function AtualizarSozinho({ segundos = 20 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);
  return null;
}
