"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CobrancaPublica } from "@/lib/cobrancas";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Pix = { payload: string; imagem: string; expiraEm: string | null };

const soDigitos = (v: string) => v.replace(/\D/g, "");

function mascaraCpf(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function mascaraTelefone(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function telefoneParaCampo(v: string): string {
  const d = soDigitos(v);
  return mascaraTelefone(d.startsWith("55") && d.length > 11 ? d.slice(2) : d);
}

function mascaraCep(v: string): string {
  return soDigitos(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

function mascaraCartao(v: string): string {
  return soDigitos(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function mascaraValidade(v: string): string {
  const d = soDigitos(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function hora(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function TelaCobranca({
  cobranca,
  escritorio,
  autoPix = false,
  formaInicial,
  emailInicial,
  telefoneInicial,
  cpfInicial,
  linkPublico,
}: {
  cobranca: CobrancaPublica | null;
  escritorio: string;
  autoPix?: boolean;
  formaInicial?: "pix" | "cartao";
  emailInicial?: string;
  telefoneInicial?: string;
  cpfInicial?: string;
  linkPublico?: string;
}) {
  const [status, setStatus] = useState(cobranca?.status ?? "pendente");
  const [forma, setForma] = useState<"pix" | "cartao">(formaInicial ?? "pix");
  const [pix, setPix] = useState<Pix | null>(
    cobranca?.pixPayload && cobranca.pixImagem
      ? { payload: cobranca.pixPayload, imagem: cobranca.pixImagem, expiraEm: cobranca.pixExpiraEm }
      : null,
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [desafioUrl, setDesafioUrl] = useState<string | null>(null);
  const [autoFalhou, setAutoFalhou] = useState(false);
  const [cartao, setCartao] = useState({
    nomeTitular: "",
    numero: "",
    validade: "",
    cvv: "",
    cpfCnpj: cpfInicial ? mascaraCpf(cpfInicial) : "",
    email: emailInicial ?? "",
    telefone: telefoneInicial ? telefoneParaCampo(telefoneInicial) : "",
    cep: "",
    numeroEndereco: "",
    complemento: "",
    parcelas: "1",
  });
  const pixAutomaticoFeito = useRef(false);

  const encerrada = status === "paga" || status === "estornada" || status === "cancelada";
  const valor = cobranca?.valor ?? 0;
  const parcelas = cobranca?.parcelasPermitidas ?? 1;
  const gerandoAuto = autoPix && !pix && !autoFalhou && (status === "pendente" || status === "vencida");

  const gerarPix = useCallback(async () => {
    if (!cobranca) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/cobrancas/${cobranca.codigo}/pix`, { method: "POST" });
      const dados = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; pago?: boolean; pix?: Pix };
      if (!r.ok || !dados.pix) {
        if (dados.pago) {
          setStatus("paga");
          return;
        }
        throw new Error(dados.erro || "não foi possível gerar o Pix");
      }
      setPix(dados.pix);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "não foi possível gerar o Pix");
    } finally {
      setEnviando(false);
    }
  }, [cobranca]);

  useEffect(() => {
    if (!autoPix || !cobranca || pix || pixAutomaticoFeito.current) return;
    if (status !== "pendente" && status !== "vencida") return;
    pixAutomaticoFeito.current = true;
    let ativo = true;

    const gerar = async () => {
      try {
        const r = await fetch(`/api/cobrancas/${cobranca.codigo}/pix`, { method: "POST" });
        const dados = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; pago?: boolean; pix?: Pix };
        if (!ativo) return;
        if (dados.pago) {
          setStatus("paga");
          return;
        }
        if (dados.pix) setPix(dados.pix);
        else {
          setErro(dados.erro || "não foi possível gerar o Pix");
          setAutoFalhou(true);
        }
      } catch {
        if (ativo) {
          setErro("não foi possível gerar o Pix");
          setAutoFalhou(true);
        }
      }
    };

    void gerar();
    return () => {
      ativo = false;
    };
  }, [autoPix, cobranca, pix, status]);

  // Enquanto o pagamento não fecha, a tela pergunta ao servidor se o Pix caiu
  useEffect(() => {
    if (!cobranca || encerrada) return;
    let ativo = true;
    const consultar = async () => {
      try {
        const r = await fetch(`/api/cobrancas/${cobranca.codigo}`, { cache: "no-store" });
        if (!r.ok) return;
        const dados = (await r.json()) as { cobranca?: { status?: string } };
        if (ativo && dados.cobranca?.status) setStatus(dados.cobranca.status);
      } catch {
        // sem rede: tenta de novo no próximo ciclo
      }
    };
    const timer = setInterval(consultar, 6000);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [cobranca, encerrada]);

  if (!cobranca) {
    return (
      <main className="min-h-screen bg-creme text-tinta">
        <Cabecalho />
        <div className="mx-auto max-w-md px-5 py-12 text-center">
          <h1 className="font-marca text-3xl font-bold text-vinho">Link inválido</h1>
          <p className="mt-4 text-xl leading-relaxed">
            Esta cobrança não existe ou foi digitada errado. Peça um novo link pelo WhatsApp.
          </p>
        </div>
      </main>
    );
  }

  const copiar = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setAviso("Selecione o código abaixo e copie.");
    }
  };

  const pagarCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setAviso(null);
    setDesafioUrl(null);
    try {
      const [mes, ano] = cartao.validade.split("/");
      const r = await fetch(`/api/cobrancas/${cobranca.codigo}/cartao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeTitular: cartao.nomeTitular,
          numero: cartao.numero,
          mes,
          ano,
          cvv: cartao.cvv,
          cpfCnpj: cartao.cpfCnpj,
          email: cartao.email,
          telefone: cartao.telefone,
          cep: cartao.cep,
          numeroEndereco: cartao.numeroEndereco,
          complemento: cartao.complemento,
          parcelas: Number(cartao.parcelas),
        }),
      });
      const dados = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        erro?: string;
        pago?: boolean;
        status?: string;
        mensagem?: string;
        requerDesafio?: boolean;
        desafioUrl?: string | null;
      };
      if (!r.ok || !dados.ok) {
        if (dados.pago) {
          setStatus("paga");
          return;
        }
        if (r.status === 409 && dados.erro?.includes("análise")) {
          setStatus("analise");
          setAviso(dados.erro);
          return;
        }
        throw new Error(dados.erro || "não foi possível processar o cartão");
      }
      if (dados.pago) setStatus("paga");
      else if (dados.requerDesafio && dados.desafioUrl) setDesafioUrl(dados.desafioUrl);
      else if (dados.status === "analise") setStatus("analise");
      if (dados.mensagem) setAviso(dados.mensagem);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "não foi possível processar o cartão");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen bg-creme text-tinta">
      <Cabecalho />
      <div className="mx-auto max-w-lg px-5 py-8">
        <div className="rounded-3xl border-2 border-marfim bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-vinho/70">{escritorio}</p>
          <h1 className="mt-1 font-marca text-2xl font-bold text-vinho">
            {status === "paga" ? "Pagamento confirmado" : `Olá, ${cobranca.nome.split(" ")[0]}`}
          </h1>
          <p className="mt-1 text-base leading-relaxed text-tinta/80">{cobranca.descricao}</p>
          <div className="mt-4 flex items-baseline justify-between border-t border-marfim pt-4">
            <span className="text-base text-tinta/70">Valor</span>
            <span className="font-marca text-3xl font-bold text-vinho">{moeda.format(valor)}</span>
          </div>
          {cobranca.parcela > 1 && status !== "paga" && (
            <p className="mt-1 text-right text-sm text-tinta/60">em até {parcelas}x no cartão</p>
          )}
        </div>

        {status === "paga" && (
          <section className="mt-6 flex flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-folha text-white">
              <IconeCerto className="h-16 w-16" />
            </div>
            <p className="text-xl font-semibold">Recebemos o seu pagamento.</p>
            <p className="text-base text-tinta/70">Obrigado, {cobranca.nome.split(" ")[0]}. Você já pode fechar esta página.</p>
          </section>
        )}

        {status === "estornada" && (
          <AvisoFechado
            titulo="Pagamento estornado"
            texto="O valor foi devolvido. Se ficou alguma dúvida, fale com a gente pelo WhatsApp."
          />
        )}

        {status === "cancelada" && (
          <AvisoFechado
            titulo="Cobrança cancelada"
            texto="Esta cobrança não está mais disponível. Peça um novo link para a nossa equipe."
          />
        )}

        {status === "analise" && (
          <section className="mt-6 rounded-3xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marfim text-vinho">
              <IconeRelogio className="h-9 w-9" />
            </div>
            <p className="mt-3 text-xl font-semibold">Pagamento em análise</p>
            <p className="mt-2 text-base leading-relaxed text-tinta/70">
              O banco está confirmando a sua compra. Esta página se atualiza sozinha assim que o pagamento for aprovado.
            </p>
            {desafioUrl && (
              <a
                href={desafioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-2xl bg-vinho px-6 py-3 text-base font-semibold text-white"
              >
                Confirmar com o banco
              </a>
            )}
          </section>
        )}

        {(status === "pendente" || status === "vencida") && (
          <>
            {status === "vencida" && (
              <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-center text-sm text-amber-900">
                Esta cobrança venceu, mas você ainda pode pagar por aqui.
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-marfim p-1">
              <button
                type="button"
                onClick={() => setForma("pix")}
                className={`rounded-xl px-3 py-2 text-base font-semibold ${forma === "pix" ? "bg-white text-vinho shadow-sm" : "text-tinta/70"}`}
              >
                Pix
              </button>
              <button
                type="button"
                onClick={() => setForma("cartao")}
                className={`rounded-xl px-3 py-2 text-base font-semibold ${forma === "cartao" ? "bg-white text-vinho shadow-sm" : "text-tinta/70"}`}
              >
                Cartão de crédito
              </button>
            </div>

            {forma === "pix" && (
              <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
                {!pix ? (
                  <>
                    <p className="text-base leading-relaxed text-tinta/80">
                      Pague na hora com Pix. O código vale por 24 horas.
                    </p>
                    <button
                      type="button"
                      onClick={gerarPix}
                      disabled={enviando || gerandoAuto}
                      className="mt-4 w-full rounded-2xl bg-vinho px-6 py-4 text-lg font-semibold text-white disabled:opacity-60"
                    >
                      {enviando || gerandoAuto ? "Gerando..." : "Gerar código Pix"}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <p className="text-base font-semibold text-vinho">Escaneie o QR Code no app do seu banco</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${pix.imagem}`}
                      alt="QR Code do Pix"
                      className="mt-4 h-56 w-56 rounded-xl border border-marfim bg-white p-2"
                    />
                    <p className="mt-3 text-center text-sm text-tinta/60">
                      Ou copie o código abaixo e cole no Pix Copia e Cola.
                      {pix.expiraEm && ` Válido até ${hora(pix.expiraEm)}.`}
                    </p>
                    <button
                      type="button"
                      onClick={copiar}
                      className="mt-4 w-full rounded-2xl bg-folha px-6 py-4 text-lg font-semibold text-white"
                    >
                      {copiado ? "Código copiado" : "Copiar código Pix"}
                    </button>
                    <details className="mt-3 w-full">
                      <summary className="cursor-pointer text-center text-sm text-tinta/60">Ver código completo</summary>
                      <p className="mt-2 select-all break-all rounded-xl bg-creme p-3 text-xs text-tinta/80">{pix.payload}</p>
                    </details>
                    <button
                      type="button"
                      onClick={() => {
                        setPix(null);
                        void gerarPix();
                      }}
                      disabled={enviando}
                      className="mt-3 text-sm text-vinho underline disabled:opacity-50"
                    >
                      {enviando ? "Gerando..." : "Gerar um novo código Pix"}
                    </button>
                    <p className="mt-4 text-center text-sm text-tinta/60">
                      Assim que o banco confirmar, esta tela mostra o pagamento aprovado.
                    </p>
                    {linkPublico && (
                      <p className="mt-3 w-full break-all text-center text-sm text-tinta/60">
                        Link desta cobrança:{" "}
                        <a href={linkPublico} className="text-vinho underline">
                          {linkPublico}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {forma === "cartao" && (
              <form onSubmit={pagarCartao} className="mt-4 space-y-3 rounded-3xl bg-white p-6 shadow-sm">
                <Campo rotulo="Nome impresso no cartão">
                  <input
                    required
                    value={cartao.nomeTitular}
                    onChange={(e) => setCartao({ ...cartao, nomeTitular: e.target.value })}
                    autoComplete="cc-name"
                    className={entrada}
                    placeholder="Como está no cartão"
                  />
                </Campo>
                <Campo rotulo="Número do cartão">
                  <input
                    required
                    inputMode="numeric"
                    value={cartao.numero}
                    onChange={(e) => setCartao({ ...cartao, numero: mascaraCartao(e.target.value) })}
                    autoComplete="cc-number"
                    className={entrada}
                    placeholder="0000 0000 0000 0000"
                  />
                </Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo rotulo="Validade">
                    <input
                      required
                      inputMode="numeric"
                      value={cartao.validade}
                      onChange={(e) => setCartao({ ...cartao, validade: mascaraValidade(e.target.value) })}
                      autoComplete="cc-exp"
                      className={entrada}
                      placeholder="MM/AA"
                    />
                  </Campo>
                  <Campo rotulo="CVV">
                    <input
                      required
                      inputMode="numeric"
                      value={cartao.cvv}
                      onChange={(e) => setCartao({ ...cartao, cvv: soDigitos(e.target.value).slice(0, 4) })}
                      autoComplete="cc-csc"
                      className={entrada}
                      placeholder="123"
                    />
                  </Campo>
                </div>
                <Campo rotulo="CPF do titular">
                  <input
                    required
                    inputMode="numeric"
                    value={cartao.cpfCnpj}
                    onChange={(e) => setCartao({ ...cartao, cpfCnpj: mascaraCpf(e.target.value) })}
                    className={entrada}
                    placeholder="000.000.000-00"
                  />
                </Campo>
                <Campo rotulo="E-mail">
                  <input
                    required
                    type="email"
                    value={cartao.email}
                    onChange={(e) => setCartao({ ...cartao, email: e.target.value })}
                    autoComplete="email"
                    className={entrada}
                    placeholder="voce@email.com"
                  />
                </Campo>
                <Campo rotulo="Celular com DDD">
                  <input
                    required
                    inputMode="tel"
                    value={cartao.telefone}
                    onChange={(e) => setCartao({ ...cartao, telefone: mascaraTelefone(e.target.value) })}
                    autoComplete="tel"
                    className={entrada}
                    placeholder="(11) 99999-9999"
                  />
                </Campo>
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Campo rotulo="CEP do titular">
                    <input
                      required
                      inputMode="numeric"
                      value={cartao.cep}
                      onChange={(e) => setCartao({ ...cartao, cep: mascaraCep(e.target.value) })}
                      autoComplete="postal-code"
                      className={entrada}
                      placeholder="00000-000"
                    />
                  </Campo>
                  <Campo rotulo="Número">
                    <input
                      required
                      value={cartao.numeroEndereco}
                      onChange={(e) => setCartao({ ...cartao, numeroEndereco: e.target.value })}
                      autoComplete="address-line2"
                      className={entrada}
                      placeholder="123"
                    />
                  </Campo>
                </div>
                <Campo rotulo="Complemento (opcional)">
                  <input
                    value={cartao.complemento}
                    onChange={(e) => setCartao({ ...cartao, complemento: e.target.value })}
                    autoComplete="address-line3"
                    className={entrada}
                    placeholder="Apto, bloco..."
                  />
                </Campo>
                {parcelas > 1 && (
                  <Campo rotulo="Parcelas">
                    <select
                      value={cartao.parcelas}
                      onChange={(e) => setCartao({ ...cartao, parcelas: e.target.value })}
                      className={entrada}
                    >
                      {Array.from({ length: parcelas }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? `À vista – ${moeda.format(valor)}` : `${n}x de ${moeda.format(valor / n)} sem juros`}
                        </option>
                      ))}
                    </select>
                  </Campo>
                )}
                <button
                  type="submit"
                  disabled={enviando}
                  className="mt-2 w-full rounded-2xl bg-vinho px-6 py-4 text-lg font-semibold text-white disabled:opacity-60"
                >
                  {enviando ? "Processando..." : `Pagar ${moeda.format(valor)}`}
                </button>
                <p className="text-center text-xs leading-relaxed text-tinta/50">
                  Os dados do cartão são enviados direto para o Asaas e não ficam guardados aqui.
                </p>
              </form>
            )}
          </>
        )}

        {desafioUrl && status !== "analise" && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-center">
            <p className="text-sm text-amber-900">O banco pediu uma confirmação extra.</p>
            <a
              href={desafioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block rounded-xl bg-vinho px-5 py-2 text-sm font-semibold text-white"
            >
              Confirmar com o banco
            </a>
          </div>
        )}

        {erro && (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-center text-base font-semibold text-red-800">
            {erro}
          </p>
        )}
        {aviso && !erro && (
          <p role="status" className="mt-4 rounded-2xl bg-marfim p-4 text-center text-sm text-tinta/80">
            {aviso}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-tinta/40">
          Pagamento processado por Asaas. Dúvidas? Fale com a {escritorio} pelo WhatsApp.
        </p>
      </div>
    </main>
  );
}

const entrada =
  "w-full rounded-xl border-2 border-marfim bg-creme/60 px-3 py-2.5 text-base text-tinta outline-none focus:border-vinho";

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-tinta/70">{rotulo}</span>
      {children}
    </label>
  );
}

function Cabecalho() {
  return (
    <header className="flex justify-center bg-vinho px-5 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/esclarece-logo.png" alt="Esclarece Assessoria" className="h-14 w-auto" />
    </header>
  );
}

function AvisoFechado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="mt-6 rounded-3xl bg-white p-6 text-center shadow-sm">
      <p className="text-xl font-semibold text-vinho">{titulo}</p>
      <p className="mt-2 text-base leading-relaxed text-tinta/70">{texto}</p>
    </section>
  );
}

const traco = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function IconeCerto({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traco}>
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={2.6} />
    </svg>
  );
}

function IconeRelogio({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...traco}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
