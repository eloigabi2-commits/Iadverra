"use client";

import { useEffect, useMemo, useState } from "react";

interface Cnae {
  codigo: string;
  descricao: string;
}

interface OwnerRow {
  nomeSocio: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnaeCodigo: string | null;
  cnaeDescricao: string | null;
  uf: string | null;
  municipio: string | null;
  telefone: string | null;
  email: string | null;
}

interface CnaeSummary {
  codigo: string;
  descricao: string;
  totalDonos: number;
}

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const PAGE_SIZE = 25;

export default function CnaeFilterDashboard() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Cnae[]>([]);
  const [selected, setSelected] = useState<Cnae[]>([]);
  const [uf, setUf] = useState<string>("");

  const [page, setPage] = useState(1);
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<CnaeSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const cnaesParam = useMemo(() => selected.map((c) => c.codigo).join(","), [selected]);

  useEffect(() => {
    const q = query.trim();
    const handle = setTimeout(async () => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      const res = await fetch(`/api/cnaes?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.cnaes ?? []);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;

      if (cnaesParam.length === 0) {
        setOwners([]);
        setTotal(0);
        setSummary([]);
        return;
      }

      setLoading(true);
      const params = new URLSearchParams({ cnaes: cnaesParam, page: String(page) });
      if (uf) params.set("uf", uf);

      const summaryParams = new URLSearchParams({ cnaes: cnaesParam });
      if (uf) summaryParams.set("uf", uf);

      const [ownersData, summaryData] = await Promise.all([
        fetch(`/api/owners?${params}`).then((r) => r.json()),
        fetch(`/api/owners/summary?${summaryParams}`).then((r) => r.json()),
      ]);
      if (cancelled) return;

      setOwners(ownersData.owners ?? []);
      setTotal(ownersData.total ?? 0);
      setSummary(summaryData.summary ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [cnaesParam, uf, page]);

  function addCnae(cnae: Cnae) {
    if (!selected.some((c) => c.codigo === cnae.codigo)) {
      setSelected((prev) => [...prev, cnae]);
      setPage(1);
    }
    setQuery("");
    setSuggestions([]);
  }

  function removeCnae(codigo: string) {
    setSelected((prev) => prev.filter((c) => c.codigo !== codigo));
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportUrl = (() => {
    const params = new URLSearchParams({ cnaes: cnaesParam });
    if (uf) params.set("uf", uf);
    return `/api/owners/export?${params}`;
  })();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Filtro de donos de empresas por CNAE
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Busque CNAEs, filtre por UF e veja quantos sócios (donos) existem nas empresas
          correspondentes, com dados de contato quando disponíveis.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar CNAE por código ou descrição..."
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {suggestions.map((cnae) => (
                  <li key={cnae.codigo}>
                    <button
                      type="button"
                      onClick={() => addCnae(cnae)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <span className="font-mono text-xs text-zinc-500">{cnae.codigo}</span>{" "}
                      {cnae.descricao}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <select
            value={uf}
            onChange={(e) => {
              setUf(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">Todos os estados</option>
            {UFS.map((sigla) => (
              <option key={sigla} value={sigla}>
                {sigla}
              </option>
            ))}
          </select>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((cnae) => (
              <span
                key={cnae.codigo}
                className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <span className="font-mono">{cnae.codigo}</span>
                <span className="max-w-[220px] truncate">{cnae.descricao}</span>
                <button
                  type="button"
                  onClick={() => removeCnae(cnae.codigo)}
                  aria-label={`Remover ${cnae.codigo}`}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {selected.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Selecione ao menos um CNAE acima para ver os resultados.
        </p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total de donos encontrados</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{total}</p>
            </div>
            {summary.map((item) => (
              <div
                key={item.codigo}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono">{item.codigo}</span> · {item.descricao}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {item.totalDonos}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Donos ({total})
              </h2>
              <a
                href={exportUrl}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Exportar CSV
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2">Nome do sócio</th>
                    <th className="px-4 py-2">Empresa</th>
                    <th className="px-4 py-2">CNPJ</th>
                    <th className="px-4 py-2">CNAE</th>
                    <th className="px-4 py-2">UF/Município</th>
                    <th className="px-4 py-2">Telefone</th>
                    <th className="px-4 py-2">E-mail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                        Carregando...
                      </td>
                    </tr>
                  ) : owners.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                        Nenhum resultado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    owners.map((owner) => (
                      <tr key={`${owner.cnpj}-${owner.nomeSocio}`}>
                        <td className="px-4 py-2">{owner.nomeSocio}</td>
                        <td className="px-4 py-2">{owner.nomeFantasia ?? owner.razaoSocial}</td>
                        <td className="px-4 py-2 font-mono text-xs">{owner.cnpj}</td>
                        <td className="px-4 py-2 font-mono text-xs">{owner.cnaeCodigo}</td>
                        <td className="px-4 py-2">
                          {[owner.municipio, owner.uf].filter(Boolean).join(" / ")}
                        </td>
                        <td className="px-4 py-2">{owner.telefone ?? "—"}</td>
                        <td className="px-4 py-2">{owner.email ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-4 text-sm text-zinc-600 dark:text-zinc-400">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
                >
                  Próxima
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
