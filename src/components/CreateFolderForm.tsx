"use client";

import { useActionState } from "react";
import { createFolderAction, type FolderActionState } from "@/lib/actions/folders";

const initialState: FolderActionState = {};

export default function CreateFolderForm() {
  const [state, formAction, pending] = useActionState(
    createFolderAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nome da pasta
        <input
          type="text"
          name="name"
          required
          placeholder="Ex: Coleção Base Set, Pacotes lacrados..."
          className="rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Descrição (opcional)
        <textarea
          name="description"
          rows={3}
          className="rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        />
      </label>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer w-fit"
      >
        {pending ? "Criando…" : "Criar pasta"}
      </button>
    </form>
  );
}
