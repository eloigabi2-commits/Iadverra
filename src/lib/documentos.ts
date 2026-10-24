import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Ordem em que o cliente tira as fotos
export const TIPOS_FOTO = ["rg_frente", "rg_verso", "comprovante"] as const;
export type TipoFoto = (typeof TIPOS_FOTO)[number];

export const ROTULO_FOTO: Record<TipoFoto, string> = {
  rg_frente: "RG (frente)",
  rg_verso: "RG (verso)",
  comprovante: "Comprovante de endereço",
};

export const TAMANHO_MAXIMO_FOTO = 4 * 1024 * 1024;
export const MIMES_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function isTipoFoto(valor: unknown): valor is TipoFoto {
  return typeof valor === "string" && (TIPOS_FOTO as readonly string[]).includes(valor);
}

export function nomeEscritorio(): string {
  return process.env.NOME_ESCRITORIO?.trim() || "Esclarece Assessoria";
}

export function urlBase(req?: Request): string {
  const configurada = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configurada) return configurada;
  if (req) return new URL(req.url).origin;
  return "";
}

// Link que vai para o cliente: curto e com o nome dele (/d/maria-k7p2xq).
// Links antigos, sem código, continuam no formato /documentos/<token>.
export function linkDaSolicitacao(s: { token: string; codigo: string | null }, base: string): string {
  return s.codigo ? `${base}/d/${s.codigo}` : `${base}/documentos/${s.token}`;
}

const LETRAS_DO_CODIGO = "abcdefghjkmnpqrstuvwxyz23456789"; // sem 0/o, 1/l/i, que se confundem

// "Maria Aparecida" vira "maria-k7p2xq": o nome ajuda o cliente a confiar no link e
// os 6 caracteres aleatórios impedem que alguém adivinhe o link de outra pessoa.
export function gerarCodigo(nome: string | null): string {
  const primeiro = (nome ?? "")
    .split(/\s+/)[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 12);
  let sufixo = "";
  for (let i = 0; i < 6; i++) sufixo += LETRAS_DO_CODIGO[randomInt(LETRAS_DO_CODIGO.length)];
  return primeiro ? `${primeiro}-${sufixo}` : sufixo;
}

// Dá um código curto para links criados antes dessa mudança
export async function garantirCodigo<T extends { id: string; nome: string | null; codigo: string | null }>(s: T): Promise<T> {
  if (s.codigo) return s;
  const atualizado = await prisma.solicitacaoDocumento.update({
    where: { id: s.id },
    data: { codigo: gerarCodigo(s.nome) },
  });
  return { ...s, codigo: atualizado.codigo };
}

function limpar(valor: unknown, max = 120): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim().slice(0, max);
  return texto || null;
}

export function limparTelefone(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const digitos = valor.replace(/\D/g, "").slice(0, 15);
  // guarda sempre com o 55 na frente, para "11 99999-8888" e o chat_number do ChatGuru serem o mesmo lead
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos || null;
}

// Cria um link novo, ou devolve o que já está aguardando para o mesmo lead,
// para a IA poder pedir o link de novo sem gerar duplicatas. O lead é
// reconhecido pelo telefone; a referência só vale quando não há telefone.
export async function criarSolicitacao(dados: {
  nome?: unknown;
  telefone?: unknown;
  referencia?: unknown;
  atendente?: unknown;
}) {
  const nome = limpar(dados.nome);
  const telefone = limparTelefone(dados.telefone);
  const referencia = limpar(dados.referencia);
  const atendente = limpar(dados.atendente, 60)?.replace(/\s+/g, " ") ?? null;

  if (telefone || referencia) {
    const existente = await prisma.solicitacaoDocumento.findFirst({
      where: { status: "aguardando", ...(telefone ? { telefone } : { referencia }) },
      orderBy: { criadoEm: "desc" },
    });
    if (existente) {
      // a distribuição pode ter mudado de atendente desde o primeiro link
      if (atendente && existente.atendente !== atendente) {
        return garantirCodigo(
          await prisma.solicitacaoDocumento.update({ where: { id: existente.id }, data: { atendente } }),
        );
      }
      return garantirCodigo(existente);
    }
  }

  return prisma.solicitacaoDocumento.create({
    data: {
      token: randomBytes(18).toString("base64url"),
      codigo: gerarCodigo(nome),
      nome,
      telefone,
      referencia,
      atendente,
    },
  });
}

// Filtro do painel por atendente: "Vitoria Vechetin" e "vitoria  vechetin" são a mesma pessoa
export function filtroDaAtendente(nome: string | null) {
  if (!nome) return {};
  return { atendente: { equals: nome.trim().replace(/\s+/g, " "), mode: "insensitive" as const } };
}

// Nomes das atendentes que já têm clientes, para os atalhos do painel.
// Junta grafias diferentes do mesmo nome e mostra a mais usada.
export async function listarAtendentes(): Promise<{ nome: string; paraConferir: number }[]> {
  const grupos = await prisma.solicitacaoDocumento.groupBy({
    by: ["atendente", "status"],
    where: { atendente: { not: null } },
    _count: true,
  });
  const mapa = new Map<string, { grafias: Map<string, number>; paraConferir: number }>();
  for (const g of grupos) {
    if (!g.atendente) continue;
    const chave = g.atendente.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
    const item = mapa.get(chave) ?? { grafias: new Map(), paraConferir: 0 };
    item.grafias.set(g.atendente, (item.grafias.get(g.atendente) ?? 0) + g._count);
    if (g.status === "enviado") item.paraConferir += g._count;
    mapa.set(chave, item);
  }
  return [...mapa.values()]
    .map((item) => ({
      nome: [...item.grafias.entries()].sort((a, b) => b[1] - a[1])[0][0],
      paraConferir: item.paraConferir,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function buscarPorCodigo(codigo: string) {
  if (!/^[a-z0-9-]{6,24}$/.test(codigo)) return null;
  return prisma.solicitacaoDocumento.findUnique({
    where: { codigo },
    include: { fotos: { select: { tipo: true } } },
  });
}

export async function buscarPorToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  return prisma.solicitacaoDocumento.findUnique({
    where: { token },
    include: { fotos: { select: { tipo: true } } },
  });
}

// Mensagem que acompanha o link no WhatsApp: curta (o áudio da transferência já
// explica tudo) e com o aviso de privacidade em uma linha.
export function mensagemWhatsApp(
  nome: string | null,
  url: string,
  opcoes: { refazer?: boolean; atendente?: string | null } = {},
): string {
  const primeiroNome = nome?.split(" ")[0];
  if (opcoes.refazer) {
    const inicio = primeiroNome ? `${primeiroNome}, uma` : "Uma";
    return `${inicio} das fotos ficou difícil de ler. Toque no link e tire só ela de novo 👇\n${url}`;
  }
  const inicio = primeiroNome ? `${primeiroNome}, aqui` : "Aqui";
  const politica = `${new URL(url).origin}/privacidade`;
  return (
    `${inicio} está o seu link para enviar os documentos 👇\n${url}\n\n` +
    // o endereço fica fora do itálico: o WhatsApp junta o "_" final ao link e ele quebra
    `🔒 _Seus dados são usados só para o seu atendimento. Ao continuar, você concorda com a nossa Política de Privacidade:_\n${politica}`
  );
}

export function formatarData(data: Date | null): string {
  if (!data) return "—";
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

// Abre o WhatsApp da atendente já com a conversa do cliente e a mensagem pronta
export function linkWhatsApp(telefone: string | null, mensagem: string): string {
  let numero = telefone?.replace(/\D/g, "") ?? "";
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
