"use client";

import { useActionState } from "react";
import { registerAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

const inputClass =
  "rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 px-3 py-2 text-sm";

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nome
        <input type="text" name="name" required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        E-mail
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Senha
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Confirmar senha
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Telefone / WhatsApp (opcional)
        <input type="tel" name="phone" className={inputClass} />
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Cidade (opcional)
          <input type="text" name="city" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          UF
          <input
            type="text"
            name="state"
            maxLength={2}
            placeholder="SP"
            className={`${inputClass} w-16 uppercase`}
          />
        </label>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}
