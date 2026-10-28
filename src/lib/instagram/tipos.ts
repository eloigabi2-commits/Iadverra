// Contrato entre a extensão "Instagram Ponte" e o servidor.
// A extensão manda apenas perfis públicos (id, @, nome, foto); nada de cookie.

export const MAX_PESSOAS = 20000;
export const MAX_PROBES = 300;

export interface PessoaIg {
  // chave canônica: @ em minúsculas. É o que permite cruzar a extensão com o
  // arquivo exportado pelo Instagram, que não traz o id numérico.
  id: string;
  // id numérico do Instagram, quando conhecido (só a extensão fornece)
  igId: string | null;
  username: string;
  nome: string | null;
  foto: string | null;
  privado: boolean;
  verificado: boolean;
}

export interface PayloadImportacao {
  codigo: string;
  perfil: PessoaIg;
  seguidores: PessoaIg[];
  seguindo: PessoaIg[];
  // ids numéricos que a ponte abriu no navegador e continuam acessíveis
  acessiveis?: string[];
  // ids numéricos que a ponte abriu e o Instagram respondeu "não encontrado"
  inacessiveis?: string[];
  // a lista de seguidores veio incompleta (limite de leitura); não dá para
  // concluir que quem não apareceu deixou de seguir
  seguidoresTruncado?: boolean;
}

export function normalizarCodigo(valor: string): string {
  return valor.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function codigoValido(valor: unknown): valor is string {
  return typeof valor === "string" && normalizarCodigo(valor).length >= 8;
}

function texto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().slice(0, max);
  return limpo ? limpo : null;
}

export function normalizarPessoa(valor: unknown): PessoaIg | null {
  if (!valor || typeof valor !== "object") return null;
  const bruto = valor as Record<string, unknown>;
  const username = texto(bruto.username, 60)?.replace(/^@/, "").toLowerCase();
  if (!username || !/^[a-z0-9._]{1,60}$/.test(username)) return null;

  const idBruto = texto(bruto.igId ?? bruto.id ?? bruto.pk, 32);
  const igId = idBruto && /^\d{1,32}$/.test(idBruto) ? idBruto : null;

  return {
    id: username,
    igId,
    username,
    nome: texto(bruto.nome ?? bruto.full_name, 120),
    foto: texto(bruto.foto ?? bruto.profile_pic_url, 600),
    privado: bruto.privado === true || bruto.is_private === true,
    verificado: bruto.verificado === true || bruto.is_verified === true,
  };
}

export function normalizarLista(valor: unknown): PessoaIg[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  const saida: PessoaIg[] = [];
  for (const item of valor) {
    if (saida.length >= MAX_PESSOAS) break;
    const pessoa = normalizarPessoa(item);
    if (!pessoa || vistos.has(pessoa.id)) continue;
    vistos.add(pessoa.id);
    saida.push(pessoa);
  }
  return saida;
}

export function normalizarIds(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const saida = new Set<string>();
  for (const item of valor) {
    const id = texto(item, 32);
    if (id && /^\d{1,32}$/.test(id) && saida.size < MAX_PROBES) saida.add(id);
  }
  return [...saida];
}
