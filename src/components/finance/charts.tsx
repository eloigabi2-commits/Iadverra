"use client";

import { formatBRL } from "@/lib/format";

interface BarItem {
  nome: string;
  valor: number;
}

export function CategoryBars({
  items,
  accent,
}: {
  items: BarItem[];
  accent: "emerald" | "rose";
}) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  const barClass = accent === "emerald" ? "bg-emerald-500" : "bg-rose-500";

  if (items.length === 0) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">Sem categorias.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.nome} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-zinc-600 dark:text-zinc-400" title={item.nome}>
            {item.nome}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full ${barClass}`}
              style={{ width: `${(item.valor / max) * 100}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right font-mono text-zinc-700 dark:text-zinc-300">
            {formatBRL(item.valor)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ points, height = 120 }: { points: number[]; height?: number }) {
  if (points.length === 0) return null;
  const width = 600;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const range = max - min || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;

  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const zeroY = height - ((0 - min) / range) * height;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-28 w-full text-emerald-500"
      preserveAspectRatio="none"
      role="img"
      aria-label="Saldo acumulado ao longo do período"
    >
      <line
        x1={0}
        y1={zeroY}
        x2={width}
        y2={zeroY}
        className="stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth={1}
      />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface MonthBar {
  label: string;
  receitas: number;
  despesas: number;
}

interface QuinzenaBar {
  label: string;
  quinzena1: number;
  quinzena2: number;
}

export function QuinzenaBarChart({ months }: { months: QuinzenaBar[] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.quinzena1, m.quinzena2]));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> 1ª quinzena (dias 1-15)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-700" /> 2ª quinzena (dias 16+)
        </span>
      </div>
      <div className="flex h-40 items-end gap-1.5 sm:gap-2">
        {months.map((m) => (
          <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-0.5">
              <div
                className="w-2 rounded-t bg-amber-400 sm:w-2.5"
                style={{ height: `${(m.quinzena1 / max) * 100}%` }}
                title={`1ª quinzena de ${m.label}: ${formatBRL(m.quinzena1)}`}
              />
              <div
                className="w-2 rounded-t bg-amber-700 sm:w-2.5"
                style={{ height: `${(m.quinzena2 / max) * 100}%` }}
                title={`2ª quinzena de ${m.label}: ${formatBRL(m.quinzena2)}`}
              />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthlyBarChart({ months }: { months: MonthBar[] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.receitas, m.despesas]));

  return (
    <div className="flex h-40 items-end gap-1.5 sm:gap-2">
      {months.map((m) => (
        <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-32 w-full items-end justify-center gap-0.5">
            <div
              className="w-2 rounded-t bg-emerald-500 sm:w-2.5"
              style={{ height: `${(m.receitas / max) * 100}%` }}
              title={`Receitas ${m.label}: ${formatBRL(m.receitas)}`}
            />
            <div
              className="w-2 rounded-t bg-rose-500 sm:w-2.5"
              style={{ height: `${(m.despesas / max) * 100}%` }}
              title={`Despesas ${m.label}: ${formatBRL(m.despesas)}`}
            />
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{m.label}</span>
        </div>
      ))}
    </div>
  );
}
