"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { MONTHS, MONTHS_SHORT, formatBRL, formatPct } from "@/lib/format";
import { CategoryBars, LineChart } from "./charts";
import AnnualView from "./AnnualView";
import SettingsPanel from "./SettingsPanel";
import type {
  AjusteTipo,
  Categoria,
  CategoriaTipo,
  Configuracao,
  Lancamento,
  LancamentoStatus,
  ResumoMensal,
} from "./types";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function FinanceDashboard() {
  const now = useMemo(() => new Date(), []);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<number | "ano">(now.getMonth() + 1);
  const [resumo, setResumo] = useState<ResumoMensal | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [baseLoaded, setBaseLoaded] = useState(false);

  const [formTipo, setFormTipo] = useState<CategoriaTipo>("RECEITA");
  const [formCategoriaId, setFormCategoriaId] = useState<number | "">("");
  const [formDia, setFormDia] = useState(1);
  const [formDescricao, setFormDescricao] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formStatus, setFormStatus] = useState<LancamentoStatus>("CONFIRMADO");
  const [submitting, setSubmitting] = useState(false);

  const [ajusteTipo, setAjusteTipo] = useState<AjusteTipo>("RETIRADA");
  const [ajusteDia, setAjusteDia] = useState(1);
  const [ajusteValor, setAjusteValor] = useState("");
  const [ajusteSubmitting, setAjusteSubmitting] = useState(false);

  const loadBase = useCallback(async () => {
    const [configRes, categoriasRes] = await Promise.all([
      fetch("/api/finance/config").then((r) => r.json()),
      fetch("/api/finance/categorias").then((r) => r.json()),
    ]);
    setConfig(configRes);
    setCategorias(categoriasRes.categorias ?? []);
    setBaseLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadBase();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBase]);

  const loadResumo = useCallback(async () => {
    if (tab === "ano") return;
    setLoading(true);
    const data = await fetch(`/api/finance/resumo-mensal?year=${year}&month=${tab}`).then((r) =>
      r.json(),
    );
    setResumo(data);
    setLoading(false);
  }, [year, tab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadResumo();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadResumo]);

  const categoriaOptions = useMemo(
    () => categorias.filter((c) => c.tipo === formTipo && c.ativa),
    [categorias, formTipo],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (categoriaOptions.length === 0) {
        setFormCategoriaId("");
        return;
      }
      if (!categoriaOptions.some((c) => c.id === formCategoriaId)) {
        setFormCategoriaId(categoriaOptions[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoriaOptions, formCategoriaId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (tab !== "ano") setFormDia((d) => Math.min(d, daysInMonth(year, tab)));
    })();
    return () => {
      cancelled = true;
    };
  }, [year, tab]);

  async function handleAddLancamento(e: FormEvent) {
    e.preventDefault();
    if (tab === "ano" || !formCategoriaId || !formValor) return;
    setSubmitting(true);
    const dataStr = `${year}-${pad2(tab)}-${pad2(formDia)}`;
    const res = await fetch("/api/finance/lancamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoriaId: formCategoriaId,
        data: dataStr,
        descricao: formDescricao,
        valor: Number(formValor.replace(",", ".")),
        status: formStatus,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setFormDescricao("");
      setFormValor("");
      await loadResumo();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao adicionar lançamento.");
    }
  }

  async function handleDeleteLancamento(id: number) {
    await fetch(`/api/finance/lancamentos/${id}`, { method: "DELETE" });
    await loadResumo();
  }

  async function handleToggleStatus(lancamento: Lancamento) {
    const next: LancamentoStatus = lancamento.status === "CONFIRMADO" ? "PENDENTE" : "CONFIRMADO";
    await fetch(`/api/finance/lancamentos/${lancamento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await loadResumo();
  }

  async function handleAddAjuste(e: FormEvent) {
    e.preventDefault();
    if (tab === "ano" || !ajusteValor) return;
    setAjusteSubmitting(true);
    const dataStr = `${year}-${pad2(tab)}-${pad2(ajusteDia)}`;
    const res = await fetch("/api/finance/ajustes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: ajusteTipo,
        data: dataStr,
        valor: Number(ajusteValor.replace(",", ".")),
      }),
    });
    setAjusteSubmitting(false);
    if (res.ok) {
      setAjusteValor("");
      await loadResumo();
    }
  }

  async function handleDeleteAjuste(id: number) {
    await fetch(`/api/finance/ajustes/${id}`, { method: "DELETE" });
    await loadResumo();
  }

  const exportUrl =
    tab === "ano" ? `/api/finance/export?year=${year}` : `/api/finance/export?year=${year}&month=${tab}`;

  const receitasLancamentos = resumo?.lancamentos.filter((l) => l.tipo === "RECEITA") ?? [];
  const despesasLancamentos = resumo?.lancamentos.filter((l) => l.tipo === "DESPESA") ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            ← Filtro de sócios por CNAE
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Fluxo de Caixa{config?.nomeEmpresa ? ` · ${config.nomeEmpresa}` : ""}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Lance receitas e despesas do dia a dia — saldo, lucro, margem e gráficos são calculados
            automaticamente, sem fórmulas de planilha para manter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Configurações
          </button>
          <a
            href={exportUrl}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Exportar CSV
          </a>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Ano anterior"
          >
            ‹
          </button>
          <span className="px-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            className="px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Próximo ano"
          >
            ›
          </button>
        </div>
        <nav className="flex flex-wrap gap-1">
          {MONTHS_SHORT.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => setTab(i + 1)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                tab === i + 1
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {m}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTab("ano")}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
              tab === "ano"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Ano
          </button>
        </nav>
      </div>

      {tab === "ano" ? (
        <AnnualView year={year} />
      ) : (
        <>
          {loading && !resumo ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>
          ) : resumo ? (
            <>
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Card label="Saldo inicial" value={formatBRL(resumo.saldoInicial)} />
                <Card label="Receitas" value={formatBRL(resumo.receitas)} tone="emerald" />
                <Card label="Despesas" value={formatBRL(resumo.despesas)} tone="rose" />
                <Card
                  label="Lucro líquido"
                  value={formatBRL(resumo.lucroLiquido)}
                  sub={`Margem ${formatPct(resumo.margem)}`}
                />
                <Card label="Saldo final" value={formatBRL(resumo.saldoFinal)} />
              </section>

              {(resumo.pendentesReceitas > 0 || resumo.pendentesDespesas > 0) && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  Pendente de confirmação: {formatBRL(resumo.pendentesReceitas)} a receber e{" "}
                  {formatBRL(resumo.pendentesDespesas)} a pagar — não entram no saldo até serem
                  confirmados.
                </p>
              )}

              <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Novo lançamento — {MONTHS[tab - 1]}
                </h2>
                <form onSubmit={handleAddLancamento} className="flex flex-wrap items-end gap-2">
                  <div className="flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setFormTipo("RECEITA")}
                      className={`px-3 py-1.5 text-xs font-medium ${
                        formTipo === "RECEITA"
                          ? "bg-emerald-600 text-white"
                          : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTipo("DESPESA")}
                      className={`px-3 py-1.5 text-xs font-medium ${
                        formTipo === "DESPESA"
                          ? "bg-rose-600 text-white"
                          : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      Despesa
                    </button>
                  </div>

                  <select
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(Number(e.target.value))}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {categoriaOptions.length === 0 && <option value="">Sem categorias</option>}
                    {categoriaOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>

                  <label className="flex flex-col gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Dia
                    <input
                      type="number"
                      min={1}
                      max={daysInMonth(year, tab)}
                      value={formDia}
                      onChange={(e) => setFormDia(Number(e.target.value))}
                      className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <input
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    className="min-w-[160px] flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />

                  <label className="flex flex-col gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Valor (R$)
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formValor}
                      onChange={(e) => setFormValor(e.target.value)}
                      className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as LancamentoStatus)}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="PENDENTE">Pendente</option>
                  </select>

                  <button
                    type="submit"
                    disabled={submitting || !formCategoriaId || !formValor}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    Adicionar
                  </button>
                </form>
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <LancamentosTable
                  title={`Receitas do mês (${formatBRL(resumo.receitas)})`}
                  lancamentos={receitasLancamentos}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteLancamento}
                />
                <LancamentosTable
                  title={`Despesas do mês (${formatBRL(resumo.despesas)})`}
                  lancamentos={despesasLancamentos}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteLancamento}
                />
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Retiradas para aplicações / distribuições de lucros
                </h2>
                <form onSubmit={handleAddAjuste} className="mb-3 flex flex-wrap items-end gap-2">
                  <select
                    value={ajusteTipo}
                    onChange={(e) => setAjusteTipo(e.target.value as AjusteTipo)}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="RETIRADA">Retirada p/ aplicações</option>
                    <option value="DISTRIBUICAO">Distribuição de lucros</option>
                  </select>
                  <label className="flex flex-col gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Dia
                    <input
                      type="number"
                      min={1}
                      max={daysInMonth(year, tab)}
                      value={ajusteDia}
                      onChange={(e) => setAjusteDia(Number(e.target.value))}
                      className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Valor (R$)
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={ajusteValor}
                      onChange={(e) => setAjusteValor(e.target.value)}
                      className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={ajusteSubmitting || !ajusteValor}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Adicionar
                  </button>
                </form>
                {resumo.ajustes.length > 0 ? (
                  <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                    {resumo.ajustes.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Dia {a.data.slice(-2)} ·{" "}
                          {a.tipo === "RETIRADA" ? "Retirada p/ aplicações" : "Distribuição de lucros"}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-zinc-900 dark:text-zinc-50">
                            {formatBRL(a.valor)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteAjuste(a.id)}
                            aria-label="Remover"
                            className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                          >
                            ×
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Nenhum ajuste neste mês.</p>
                )}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="mb-3 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Receitas por categoria
                  </h3>
                  <CategoryBars items={resumo.receitasPorCategoria} accent="emerald" />
                  <h3 className="mb-3 mt-4 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Despesas por categoria
                  </h3>
                  <CategoryBars items={resumo.despesasPorCategoria} accent="rose" />
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="mb-3 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Saldo acumulado no mês
                  </h3>
                  <LineChart points={resumo.fluxoDiario.map((f) => f.saldoAcumulado)} />
                </div>
              </section>
            </>
          ) : null}
        </>
      )}

      {settingsOpen && baseLoaded && config && (
        <SettingsPanel
          config={config}
          categorias={categorias}
          onClose={() => setSettingsOpen(false)}
          onChanged={async () => {
            await loadBase();
            await loadResumo();
          }}
        />
      )}
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "emerald" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "rose"
        ? "text-rose-700 dark:text-rose-400"
        : "text-zinc-900 dark:text-zinc-50";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </div>
  );
}

function LancamentosTable({
  title,
  lancamentos,
  onToggleStatus,
  onDelete,
}: {
  title: string;
  lancamentos: Lancamento[];
  onToggleStatus: (lancamento: Lancamento) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</h3>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Dia</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {lancamentos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-xs text-zinc-500">
                  Nenhum lançamento ainda.
                </td>
              </tr>
            ) : (
              lancamentos.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-1.5 font-mono text-xs">{l.data.slice(-2)}</td>
                  <td className="px-3 py-1.5">{l.categoriaNome}</td>
                  <td className="px-3 py-1.5 text-zinc-500 dark:text-zinc-400">
                    {l.descricao || "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatBRL(l.valor)}</td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(l)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        l.status === "CONFIRMADO"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {l.status === "CONFIRMADO" ? "Confirmado" : "Pendente"}
                    </button>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(l.id)}
                      aria-label="Remover lançamento"
                      className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
