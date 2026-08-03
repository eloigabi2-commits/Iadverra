"use client";

import { useActionState, useState } from "react";
import type { ListingActionState } from "@/lib/actions/listings";

const inputClass =
  "rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 px-3 py-2 text-sm";

type Folder = { id: string; name: string };

type DefaultValues = {
  type?: string;
  title?: string;
  description?: string;
  setName?: string;
  cardNumber?: string;
  rarity?: string;
  language?: string;
  condition?: string;
  quantity?: number;
  price?: string;
  folderId?: string | null;
  status?: string;
  imageData?: string | null;
};

export default function ListingForm({
  action,
  folders,
  defaultValues,
  submitLabel,
  isEditing = false,
}: {
  action: (
    prevState: ListingActionState,
    formData: FormData
  ) => Promise<ListingActionState>;
  folders: Folder[];
  defaultValues?: DefaultValues;
  submitLabel: string;
  isEditing?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [preview, setPreview] = useState<string | null>(
    defaultValues?.imageData ?? null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
      <fieldset className="flex gap-4">
        <legend className="text-sm font-medium mb-1">Tipo de anúncio</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="type"
            value="CARTA"
            defaultChecked={(defaultValues?.type ?? "CARTA") === "CARTA"}
          />
          Carta avulsa
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="type"
            value="PACOTE"
            defaultChecked={defaultValues?.type === "PACOTE"}
          />
          Pacote/Booster
        </label>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Título
        <input
          type="text"
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder="Ex: Charizard Base Set 4/102 Holo"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Especificações / descrição
        <textarea
          name="description"
          rows={4}
          defaultValue={defaultValues?.description}
          placeholder="Estado detalhado, edição, detalhes de envio, etc."
          className={inputClass}
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Coleção/Expansão
          <input
            type="text"
            name="setName"
            defaultValue={defaultValues?.setName}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Número da carta
          <input
            type="text"
            name="cardNumber"
            defaultValue={defaultValues?.cardNumber}
            placeholder="Ex: 4/102"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Raridade
          <input
            type="text"
            name="rarity"
            defaultValue={defaultValues?.rarity}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Idioma
          <input
            type="text"
            name="language"
            defaultValue={defaultValues?.language}
            placeholder="Português, Inglês, Japonês..."
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Estado de conservação
          <select
            name="condition"
            defaultValue={defaultValues?.condition ?? ""}
            className={inputClass}
          >
            <option value="">Não informado</option>
            <option value="LACRADO">Lacrado</option>
            <option value="NOVA">Nova</option>
            <option value="EXCELENTE">Excelente</option>
            <option value="BOA">Boa</option>
            <option value="DANIFICADA">Danificada</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Quantidade
          <input
            type="number"
            name="quantity"
            min={1}
            defaultValue={defaultValues?.quantity ?? 1}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Preço (R$)
          <input
            type="text"
            name="price"
            required
            inputMode="decimal"
            defaultValue={defaultValues?.price}
            placeholder="Ex: 150,00"
            className={inputClass}
          />
        </label>

        {folders.length > 0 && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Pasta (opcional)
            <select
              name="folderId"
              defaultValue={defaultValues?.folderId ?? ""}
              className={inputClass}
            >
              <option value="">Sem pasta</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isEditing && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={defaultValues?.status ?? "DISPONIVEL"}
            className={inputClass}
          >
            <option value="DISPONIVEL">Disponível</option>
            <option value="RESERVADO">Reservado</option>
            <option value="VENDIDO">Vendido</option>
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Foto {isEditing ? "(envie apenas para trocar)" : ""}
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
          }}
          className="text-sm"
        />
        <span className="text-xs text-black/50 dark:text-white/50">
          JPEG, PNG ou WebP, até 2MB.
        </span>
      </label>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Pré-visualização"
          className="h-40 w-40 object-contain rounded-md border border-black/10 dark:border-white/10"
        />
      )}

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
        {pending ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}
