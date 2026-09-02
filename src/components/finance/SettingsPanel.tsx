"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import type { Categoria, CategoriaTipo, Configuracao } from "./types";

interface Props {
  config: Configuracao;
  categorias: Categoria[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

function CategoriaRow({
  categoria,
  onRename,
  onToggleAtiva,
  onRemove,
}: {
  categoria: Categoria;
  onRename: (categoria: Categoria, nome: string) => void;
  onToggleAtiva: (categoria: Categoria) => void;
  onRemove: (categoria: Categoria) => void;
}) {
  const [nome, setNome] = useState(categoria.nome);
  return (
    <li className="flex items-center gap-2 py-1.5">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => onRename(categoria, nome)}
        disabled={!categoria.ativa}
        className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <button
        type="button"
        onClick={() => onToggleAtiva(categoria)}
        className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        {categoria.ativa ? "Ocultar" : "Mostrar"}
      </button>
      <button
        type="button"
        onClick={() => onRemove(categoria)}
        aria-label={`Remover ${categoria.nome}`}
        className="shrink-0 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
      >
        ×
      </button>
    </li>
  );
}

export default function SettingsPanel({ config, categorias, onClose, onChanged }: Props) {
  const [nomeEmpresa, setNomeEmpresa] = useState(config.nomeEmpresa);
  const [saldoInicial, setSaldoInicial] = useState(String(config.saldoInicial));
  const [savingConfig, setSavingConfig] = useState(false);

  const [novoTipo, setNovoTipo] = useState<CategoriaTipo>("RECEITA");
  const [novoNome, setNovoNome] = useState("");
  const [addingCategoria, setAddingCategoria] = useState(false);

  const receitas = categorias.filter((c) => c.tipo === "RECEITA");
  const despesas = categorias.filter((c) => c.tipo === "DESPESA");

  async function saveConfig() {
    setSavingConfig(true);
    await fetch("/api/finance/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeEmpresa,
        saldoInicial: Number(saldoInicial.replace(",", ".")) || 0,
      }),
    });
    setSavingConfig(false);
    await onChanged();
  }

  async function addCategoria() {
    const nome = novoNome.trim();
    if (!nome) return;
    setAddingCategoria(true);
    const res = await fetch("/api/finance/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: novoTipo, nome }),
    });
    setAddingCategoria(false);
    if (res.ok) {
      setNovoNome("");
      await onChanged();
    }
  }

  async function renameCategoria(categoria: Categoria, nome: string) {
    if (!nome.trim() || nome === categoria.nome) return;
    await fetch(`/api/finance/categorias/${categoria.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    await onChanged();
  }

  async function toggleAtiva(categoria: Categoria) {
    await fetch(`/api/finance/categorias/${categoria.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativa: !categoria.ativa }),
    });
    await onChanged();
  }

  async function removeCategoria(categoria: Categoria) {
    if (!confirm(`Remover categoria "${categoria.nome}"?`)) return;
    await fetch(`/api/finance/categorias/${categoria.id}`, { method: "DELETE" });
    await onChanged();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-6 p-4">
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Empresa
            </h3>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-1 min-w-[200px] flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                Nome da empresa
                <input
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="flex w-40 flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                Saldo inicial (caixa)
                <input
                  inputMode="decimal"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Saldo inicial atual: {formatBRL(config.saldoInicial)} — vale para janeiro; os demais
              meses puxam o saldo final do mês anterior automaticamente.
            </p>
            <button
              type="button"
              onClick={saveConfig}
              disabled={savingConfig}
              className="w-fit rounded-md bg-[#1B4D2E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163D25] disabled:opacity-50 dark:bg-[#2F7A4D] dark:hover:bg-[#28683F]"
            >
              {savingConfig ? "Salvando..." : "Salvar"}
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Plano de contas
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Categorias de receita
                </p>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {receitas.map((categoria) => (
                    <CategoriaRow
                      key={categoria.id}
                      categoria={categoria}
                      onRename={renameCategoria}
                      onToggleAtiva={toggleAtiva}
                      onRemove={removeCategoria}
                    />
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-rose-700 dark:text-rose-400">
                  Categorias de despesa
                </p>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {despesas.map((categoria) => (
                    <CategoriaRow
                      key={categoria.id}
                      categoria={categoria}
                      onRename={renameCategoria}
                      onToggleAtiva={toggleAtiva}
                      onRemove={removeCategoria}
                    />
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                Tipo
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as CategoriaTipo)}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="RECEITA">Receita</option>
                  <option value="DESPESA">Despesa</option>
                </select>
              </label>
              <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                Nova categoria
                <input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome da categoria"
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <button
                type="button"
                onClick={addCategoria}
                disabled={addingCategoria || !novoNome.trim()}
                className="rounded-md bg-[#1B4D2E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163D25] disabled:opacity-50 dark:bg-[#2F7A4D] dark:hover:bg-[#28683F]"
              >
                Adicionar
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
