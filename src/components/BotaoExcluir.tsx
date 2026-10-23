"use client";

export default function BotaoExcluir() {
  return (
    <button
      onClick={(e) => {
        if (!confirm("Apagar este cliente e todas as fotos? Não dá para desfazer.")) e.preventDefault();
      }}
      className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700"
    >
      Apagar cliente e fotos
    </button>
  );
}
