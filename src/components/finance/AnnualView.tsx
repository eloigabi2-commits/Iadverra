"use client";

import { useEffect, useState } from "react";
import { MONTHS_SHORT, formatBRL, formatPct } from "@/lib/format";
import { LineChart, MonthlyBarChart } from "./charts";
import type { ResumoAnual } from "./types";

export default function AnnualView({ year }: { year: number }) {
  const [resumo, setResumo] = useState<ResumoAnual | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      const data: ResumoAnual = await fetch(`/api/finance/resumo-anual?year=${year}`).then((r) =>
        r.json(),
      );
      if (cancelled) return;
      setResumo(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  if (loading && !resumo) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>;
  }
  if (!resumo) return null;

  const receitaCategorias = resumo.categorias.filter((c) => c.tipo === "RECEITA");
  const despesaCategorias = resumo.categorias.filter((c) => c.tipo === "DESPESA");

  const barMonths = resumo.meses.map((m, i) => ({
    label: MONTHS_SHORT[i],
    receitas: m.receitas,
    despesas: m.despesas,
  }));

  const saldoPontos = resumo.meses.map((m) => m.saldoFinal);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card label="Saldo inicial" value={formatBRL(resumo.saldoInicialAno)} />
        <Card label="Receitas no ano" value={formatBRL(resumo.totalReceitas)} tone="emerald" />
        <Card label="Despesas no ano" value={formatBRL(resumo.totalDespesas)} tone="rose" />
        <Card
          label="Lucro líquido"
          value={formatBRL(resumo.totalLucroLiquido)}
          sub={formatPct(resumo.margemAnual)}
        />
        <Card label="Retiradas + distribuições" value={formatBRL(resumo.totalRetiradas + resumo.totalDistribuicoes)} />
        <Card label="Saldo final do ano" value={formatBRL(resumo.saldoFinalAno)} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
            Receitas x despesas por mês
          </h3>
          <MonthlyBarChart months={barMonths} />
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
            Saldo em caixa ao final de cada mês
          </h3>
          <LineChart points={saldoPontos} />
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Categoria</th>
              {MONTHS_SHORT.map((m) => (
                <th key={m} className="px-2 py-2 text-right">
                  {m}
                </th>
              ))}
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr className="bg-emerald-50/50 font-medium text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
              <td className="px-3 py-1.5">( + ) Receitas</td>
              {resumo.meses.map((m) => (
                <td key={m.month} className="px-2 py-1.5 text-right font-mono">
                  {formatBRL(m.receitas)}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono">{formatBRL(resumo.totalReceitas)}</td>
            </tr>
            {receitaCategorias.map((c) => (
              <tr key={c.categoriaId} className="text-zinc-600 dark:text-zinc-400">
                <td className="px-3 py-1 pl-6">{c.nome}</td>
                {c.porMes.map((v, i) => (
                  <td key={i} className="px-2 py-1 text-right font-mono">
                    {v === 0 ? "—" : formatBRL(v)}
                  </td>
                ))}
                <td className="px-3 py-1 text-right font-mono">{formatBRL(c.total)}</td>
              </tr>
            ))}

            <tr className="bg-rose-50/50 font-medium text-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
              <td className="px-3 py-1.5">( - ) Despesas</td>
              {resumo.meses.map((m) => (
                <td key={m.month} className="px-2 py-1.5 text-right font-mono">
                  {formatBRL(m.despesas)}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono">{formatBRL(resumo.totalDespesas)}</td>
            </tr>
            {despesaCategorias.map((c) => (
              <tr key={c.categoriaId} className="text-zinc-600 dark:text-zinc-400">
                <td className="px-3 py-1 pl-6">{c.nome}</td>
                {c.porMes.map((v, i) => (
                  <td key={i} className="px-2 py-1 text-right font-mono">
                    {v === 0 ? "—" : formatBRL(v)}
                  </td>
                ))}
                <td className="px-3 py-1 text-right font-mono">{formatBRL(c.total)}</td>
              </tr>
            ))}

            <tr className="font-semibold text-zinc-900 dark:text-zinc-50">
              <td className="px-3 py-1.5">( = ) Lucro líquido</td>
              {resumo.meses.map((m) => (
                <td key={m.month} className="px-2 py-1.5 text-right font-mono">
                  {formatBRL(m.lucroLiquido)}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono">{formatBRL(resumo.totalLucroLiquido)}</td>
            </tr>
            <tr className="text-zinc-500 dark:text-zinc-400">
              <td className="px-3 py-1">Margem %</td>
              {resumo.meses.map((m) => (
                <td key={m.month} className="px-2 py-1 text-right font-mono">
                  {formatPct(m.margem)}
                </td>
              ))}
              <td className="px-3 py-1 text-right font-mono">{formatPct(resumo.margemAnual)}</td>
            </tr>
            <tr className="text-zinc-500 dark:text-zinc-400">
              <td className="px-3 py-1">Saldo final (caixa)</td>
              {resumo.meses.map((m) => (
                <td key={m.month} className="px-2 py-1 text-right font-mono">
                  {formatBRL(m.saldoFinal)}
                </td>
              ))}
              <td className="px-3 py-1 text-right font-mono">{formatBRL(resumo.saldoFinalAno)}</td>
            </tr>
          </tbody>
        </table>
      </section>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-base font-semibold ${toneClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </div>
  );
}
