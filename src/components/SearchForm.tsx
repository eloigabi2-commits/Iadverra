const inputClass =
  "rounded-md border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 px-3 py-2 text-sm";

export default function SearchForm({
  q,
  type,
  minPrice,
  maxPrice,
}: {
  q?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
}) {
  return (
    <form
      action="/"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium flex-1 min-w-[200px]">
        Buscar
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Ex: Charizard, Base Set, booster..."
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Tipo
        <select name="type" defaultValue={type ?? ""} className={inputClass}>
          <option value="">Todos</option>
          <option value="CARTA">Carta avulsa</option>
          <option value="PACOTE">Pacote/Booster</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium w-28">
        Mín. R$
        <input
          type="number"
          name="minPrice"
          min={0}
          step="0.01"
          defaultValue={minPrice}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium w-28">
        Máx. R$
        <input
          type="number"
          name="maxPrice"
          min={0}
          step="0.01"
          defaultValue={maxPrice}
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 cursor-pointer"
      >
        Buscar
      </button>
    </form>
  );
}
