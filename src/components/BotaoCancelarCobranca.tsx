"use client";

export default function BotaoCancelarCobranca() {
  return (
    <button
      onClick={(e) => {
        if (!confirm("Cancelar esta cobrança? O link do cliente para de funcionar.")) e.preventDefault();
      }}
      className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700"
    >
      Cancelar
    </button>
  );
}
