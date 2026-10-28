"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PessoaIg } from "@/lib/instagram/tipos";
import type { ResumoInstagram, SumidoIg } from "@/lib/instagram/analise";

const POR_PAGINA = 200;

type Aba = "naoseguem" | "naosigo" | "sairam" | "bloqueios";
type Tela = "carregando" | "login" | "2fa" | "conectado";

const ABAS: Array<{ chave: Aba; rotulo: string; contar: (d: ResumoInstagram) => number }> = [
  { chave: "naoseguem", rotulo: "Não me seguem", contar: (d) => d.totais.naoSeguemDeVolta },
  { chave: "naosigo", rotulo: "Não sigo", contar: (d) => d.totais.naoSigoDeVolta },
  { chave: "sairam", rotulo: "Saíram", contar: (d) => d.totais.deixaramDeSeguir },
  { chave: "bloqueios", rotulo: "Bloqueios", contar: (d) => d.totais.bloqueiosSuspeitos },
];

type Resposta<T> = T & { erro?: string; etapa?: string; mensagem?: string };

async function pedir<T>(url: string, init?: RequestInit): Promise<{ status: number; corpo: Resposta<T> }> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const corpo = (await res.json().catch(() => ({}))) as Resposta<T>;
  return { status: res.status, corpo };
}

function Avatar({ pessoa }: { pessoa: PessoaIg }) {
  const inicial = (pessoa.nome ?? pessoa.username).slice(0, 1).toUpperCase();
  return pessoa.foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pessoa.foto}
      alt=""
      referrerPolicy="no-referrer"
      className="h-9 w-9 shrink-0 rounded-full bg-neutral-100 object-cover"
    />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-500">
      {inicial}
    </span>
  );
}

function Linha({ pessoa, detalhe }: { pessoa: PessoaIg; detalhe?: string }) {
  return (
    <li className="flex items-center gap-3 border-b border-neutral-100 py-2.5 last:border-0">
      <Avatar pessoa={pessoa} />
      <div className="min-w-0 flex-1 leading-tight">
        <a
          href={`https://www.instagram.com/${pessoa.username}/`}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[15px] font-medium text-neutral-900 hover:underline"
        >
          {pessoa.username}
        </a>
        <span className="block truncate text-[13px] text-neutral-500">{pessoa.nome ?? ""}</span>
        {detalhe && <span className="block text-[12px] text-neutral-400">{detalhe}</span>}
      </div>
      {pessoa.privado && <span className="text-[11px] text-neutral-400">privado</span>}
    </li>
  );
}

function Spinner({ claro = false }: { claro?: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${
        claro ? "border-white/70" : "border-neutral-400"
      }`}
    />
  );
}

function detalheDaOrigem(s: SumidoIg): string {
  const base =
    s.origem === "seguidores"
      ? "te seguia antes"
      : s.origem === "seguindo"
        ? "você seguia antes"
        : "estava nas duas listas";
  if (s.estado === "inacessivel") return `${base} · perfil inacessível`;
  if (s.estado === "sumiu") return `${base} · não verificado`;
  return base;
}

function listaDaAba(aba: Aba, dados: ResumoInstagram): PessoaIg[] {
  if (aba === "naoseguem") return dados.naoSeguemDeVolta;
  if (aba === "naosigo") return dados.naoSigoDeVolta;
  if (aba === "sairam") return dados.deixaramDeSeguir;
  return dados.bloqueiosSuspeitos;
}

function quando(iso: string | null): string {
  if (!iso) return "";
  const data = new Date(iso);
  const minutos = Math.round((Date.now() - data.getTime()) / 60_000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function InstagramPainel() {
  const [tela, setTela] = useState<Tela>("carregando");
  const [dados, setDados] = useState<ResumoInstagram | null>(null);
  const [aba, setAba] = useState<Aba>("naoseguem");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const tentouSync = useRef(false);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    setErro(null);
    try {
      const { status, corpo } = await pedir<{ ok?: boolean; dados?: ResumoInstagram }>(
        "/api/instagram/sincronizar",
        { method: "POST" }
      );
      if (status === 401) {
        setTela("login");
        return;
      }
      if (corpo.dados) setDados(corpo.dados);
      if (corpo.erro) setErro(corpo.erro);
    } catch {
      setErro("Não consegui sincronizar agora.");
    } finally {
      setSincronizando(false);
    }
  }, []);

  const carregar = useCallback(async () => {
    try {
      const { status, corpo } = await pedir<ResumoInstagram>("/api/instagram/dados");
      if (status === 200) {
        setDados(corpo);
        setTela("conectado");
        return;
      }
      setTela("login");
    } catch {
      setTela("login");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 0);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/instagram" }).catch(() => undefined);
    }
    return () => window.clearTimeout(timer);
  }, [carregar]);

  useEffect(() => {
    if (tela !== "conectado") return;
    if (dados?.perfil.ultimaSync) return;
    if (sincronizando || tentouSync.current) return;
    tentouSync.current = true;
    void sincronizar();
  }, [tela, dados?.perfil.ultimaSync, sincronizando, sincronizar]);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      const { corpo } = await pedir<{ ok?: boolean; usuario?: string }>("/api/instagram/entrar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      setSenha("");
      if (corpo.etapa === "2fa") {
        setTela("2fa");
        setAviso(corpo.mensagem ?? "Digite o código de confirmação do Instagram.");
        return;
      }
      if (!corpo.ok) {
        setErro(corpo.erro ?? "Não consegui entrar. Confira o usuário e a senha.");
        return;
      }
      setTela("conectado");
      tentouSync.current = true;
      await sincronizar();
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function verificar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const { corpo } = await pedir<{ ok?: boolean }>("/api/instagram/verificar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      if (!corpo.ok) {
        setErro(corpo.erro ?? "Código incorreto.");
        return;
      }
      setCodigo("");
      setAviso(null);
      setTela("conectado");
      tentouSync.current = true;
      await sincronizar();
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function encerrar() {
    await fetch("/api/instagram/sair", { method: "POST" }).catch(() => undefined);
    setDados(null);
    setUsuario("");
    setSenha("");
    setCodigo("");
    setAviso(null);
    setErro(null);
    tentouSync.current = false;
    setTela("login");
  }

  async function sair() {
    if (!window.confirm("Sair e apagar os dados salvos?")) return;
    await encerrar();
  }

  function voltar() {
    void encerrar();
  }

  const lista = useMemo(() => (dados ? listaDaAba(aba, dados) : []), [aba, dados]);
  const visiveis = lista.slice(0, limite);

  if (tela === "carregando") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (tela === "login" || tela === "2fa") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Espelho</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {tela === "2fa" ? "Confirme o acesso à sua conta." : "Entre com sua conta do Instagram."}
        </p>

        {tela === "login" ? (
          <form onSubmit={entrar} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm text-neutral-700">Usuário</span>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="seu.usuario"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-900"
              />
            </label>
            <label className="block">
              <span className="text-sm text-neutral-700">Senha</span>
              <input
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-900"
              />
            </label>
            <button
              type="submit"
              disabled={ocupado}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white disabled:opacity-60"
            >
              {ocupado ? <Spinner claro /> : null}
              {ocupado ? "Entrando" : "Entrar"}
            </button>
            <p className="text-xs leading-relaxed text-neutral-400">
              A senha é usada uma vez para abrir a sessão e não fica guardada. O Instagram pode pedir confirmação no
              app.
            </p>
          </form>
        ) : (
          <form onSubmit={verificar} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm text-neutral-700">Código</span>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-center text-xl tracking-[0.3em] outline-none focus:border-neutral-900"
              />
            </label>
            <button
              type="submit"
              disabled={ocupado}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white disabled:opacity-60"
            >
              {ocupado ? <Spinner claro /> : null}
              {ocupado ? "Confirmando" : "Confirmar"}
            </button>
            <button type="button" onClick={voltar} className="w-full py-1 text-sm text-neutral-500 underline">
              Voltar
            </button>
          </form>
        )}

        {aviso && <p className="mt-4 text-sm text-neutral-600">{aviso}</p>}
        {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}
      </div>
    );
  }

  const perfil = dados?.perfil;

  return (
    <div className="mx-auto max-w-xl pb-16">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {perfil?.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={perfil.foto}
              alt=""
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-neutral-900">
              {perfil?.username ? `@${perfil.username}` : "Sua conta"}
            </p>
            <p className="truncate text-xs text-neutral-400">
              {sincronizando
                ? "Lendo suas listas…"
                : perfil?.ultimaSync
                  ? `Atualizado ${quando(perfil.ultimaSync)}`
                  : "Ainda não sincronizado"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => void sincronizar()}
            disabled={sincronizando}
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-neutral-700 disabled:opacity-50"
          >
            {sincronizando ? <Spinner /> : null}
            Atualizar
          </button>
          <button type="button" onClick={() => void sair()} className="px-1 py-1.5 text-neutral-400 hover:text-neutral-700">
            Sair
          </button>
        </div>
      </header>

      {dados && (
        <div className="flex gap-5 py-4 text-sm text-neutral-500">
          <span>
            <strong className="font-medium text-neutral-900">{dados.totais.seguidores.toLocaleString("pt-BR")}</strong>{" "}
            seguidores
          </span>
          <span>
            <strong className="font-medium text-neutral-900">{dados.totais.seguindo.toLocaleString("pt-BR")}</strong>{" "}
            seguindo
          </span>
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {ABAS.map((item) => {
          const ativa = item.chave === aba;
          return (
            <button
              key={item.chave}
              type="button"
              onClick={() => {
                setAba(item.chave);
                setLimite(POR_PAGINA);
              }}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm ${
                ativa
                  ? "border-neutral-900 font-medium text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {item.rotulo}
              {dados ? (
                <span className={`ml-1.5 text-xs ${ativa ? "text-neutral-500" : "text-neutral-400"}`}>
                  {item.contar(dados).toLocaleString("pt-BR")}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {aba === "bloqueios" && (
        <p className="py-3 text-xs leading-relaxed text-neutral-500">
          O Instagram não informa bloqueios. Estes perfis sumiram das suas listas e continuam inacessíveis — o que
          também acontece com conta desativada ou excluída.
        </p>
      )}
      {aba === "sairam" && dados && dados.deixaramDeSeguir.length > 0 && (
        <p className="py-3 text-xs text-neutral-500">Deixaram de seguir entre a penúltima e a última sincronização.</p>
      )}

      {erro && <p className="py-3 text-sm text-red-600">{erro}</p>}

      {sincronizando && !dados && (
        <div className="flex items-center gap-2 py-10 text-sm text-neutral-500">
          <Spinner /> Lendo seguidores e seguindo…
        </div>
      )}

      {dados && (
        <>
          <ul>
            {visiveis.map((pessoa) => (
              <Linha
                key={pessoa.id}
                pessoa={pessoa}
                detalhe={
                  aba === "sairam" || aba === "bloqueios" ? detalheDaOrigem(pessoa as SumidoIg) : undefined
                }
              />
            ))}
          </ul>

          {lista.length === 0 && !sincronizando && (
            <p className="py-10 text-center text-sm text-neutral-400">
              {aba === "sairam"
                ? "Nada aqui ainda. A comparação aparece a partir da segunda sincronização."
                : "Nada nesta lista."}
            </p>
          )}

          {lista.length > limite && (
            <button
              type="button"
              onClick={() => setLimite((n) => n + POR_PAGINA)}
              className="mt-4 w-full rounded-md border border-neutral-300 py-2.5 text-sm text-neutral-700"
            >
              Mostrar mais ({lista.length - limite})
            </button>
          )}
        </>
      )}

      {aviso && <p className="mt-4 text-sm text-neutral-600">{aviso}</p>}
    </div>
  );
}
