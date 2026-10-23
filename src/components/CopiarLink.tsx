"use client";

import { useState } from "react";

export default function CopiarLink({ url, mensagem }: { url: string; mensagem: string }) {
  const [copiado, setCopiado] = useState<"link" | "mensagem" | null>(null);

  async function copiar(texto: string, qual: "link" | "mensagem") {
    await navigator.clipboard.writeText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <div className="space-y-2">
      <input readOnly value={url} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm" />
      <div className="flex flex-wrap gap-2">
        <button onClick={() => copiar(url, "link")} className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white">
          {copiado === "link" ? "Copiado!" : "Copiar link"}
        </button>
        <button
          onClick={() => copiar(mensagem, "mensagem")}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          {copiado === "mensagem" ? "Copiada!" : "Copiar mensagem para o WhatsApp"}
        </button>
      </div>
    </div>
  );
}
