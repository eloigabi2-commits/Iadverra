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
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => copiar(mensagem, "mensagem")}
        className="rounded-lg border border-marfim bg-white px-3 py-2 text-sm font-semibold"
      >
        {copiado === "mensagem" ? "Mensagem copiada!" : "Copiar mensagem"}
      </button>
      <button onClick={() => copiar(url, "link")} className="rounded-lg border border-marfim bg-white px-3 py-2 text-sm font-semibold">
        {copiado === "link" ? "Link copiado!" : "Copiar só o link"}
      </button>
    </div>
  );
}
