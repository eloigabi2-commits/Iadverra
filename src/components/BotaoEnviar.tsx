"use client";

import { useFormStatus } from "react-dom";

export default function BotaoEnviar({
  className,
  children,
  enviando = "Enviando...",
}: {
  className?: string;
  children: React.ReactNode;
  enviando?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? enviando : children}
    </button>
  );
}
