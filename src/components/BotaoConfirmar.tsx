"use client";

export default function BotaoConfirmar({ pergunta, className, children }: { pergunta: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        if (!confirm(pergunta)) e.preventDefault();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
