import { prisma } from "@/lib/prisma";
import {
  AjusteTipo,
  CategoriaTipo,
  LancamentoStatus,
  Prisma,
} from "@/generated/prisma/client";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
  return date;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

export interface ConfiguracaoDTO {
  nomeEmpresa: string;
  anoReferencia: number;
  saldoInicial: number;
}

function toConfiguracaoDTO(config: {
  nomeEmpresa: string;
  anoReferencia: number;
  saldoInicial: Prisma.Decimal;
}): ConfiguracaoDTO {
  return {
    nomeEmpresa: config.nomeEmpresa,
    anoReferencia: config.anoReferencia,
    saldoInicial: round2(Number(config.saldoInicial)),
  };
}

export async function getConfiguracao(): Promise<ConfiguracaoDTO> {
  const config = await prisma.configuracao.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return toConfiguracaoDTO(config);
}

export async function updateConfiguracao(input: {
  nomeEmpresa?: string;
  anoReferencia?: number;
  saldoInicial?: number;
}): Promise<ConfiguracaoDTO> {
  const data: Prisma.ConfiguracaoUpdateInput = {};
  if (input.nomeEmpresa !== undefined) data.nomeEmpresa = input.nomeEmpresa.trim();
  if (input.anoReferencia !== undefined) data.anoReferencia = input.anoReferencia;
  if (input.saldoInicial !== undefined) data.saldoInicial = input.saldoInicial;

  const config = await prisma.configuracao.upsert({
    where: { id: 1 },
    update: data,
    create: {
      id: 1,
      nomeEmpresa: input.nomeEmpresa?.trim() ?? "",
      anoReferencia: input.anoReferencia ?? new Date().getFullYear(),
      saldoInicial: input.saldoInicial ?? 0,
    },
  });
  return toConfiguracaoDTO(config);
}

// ---------------------------------------------------------------------------
// Categorias (plano de contas)
// ---------------------------------------------------------------------------

export interface CategoriaDTO {
  id: number;
  tipo: CategoriaTipo;
  nome: string;
  ordem: number;
  ativa: boolean;
}

function toCategoriaDTO(categoria: {
  id: number;
  tipo: CategoriaTipo;
  nome: string;
  ordem: number;
  ativa: boolean;
}): CategoriaDTO {
  return categoria;
}

export async function listCategorias(opts?: {
  tipo?: CategoriaTipo;
  onlyActive?: boolean;
}): Promise<CategoriaDTO[]> {
  const categorias = await prisma.categoria.findMany({
    where: {
      ...(opts?.tipo ? { tipo: opts.tipo } : {}),
      ...(opts?.onlyActive ? { ativa: true } : {}),
    },
    orderBy: [{ tipo: "asc" }, { ordem: "asc" }, { id: "asc" }],
  });
  return categorias.map(toCategoriaDTO);
}

export async function createCategoria(input: {
  tipo: CategoriaTipo;
  nome: string;
}): Promise<CategoriaDTO> {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Nome da categoria é obrigatório.");

  const last = await prisma.categoria.findFirst({
    where: { tipo: input.tipo },
    orderBy: { ordem: "desc" },
  });

  const categoria = await prisma.categoria.create({
    data: { tipo: input.tipo, nome, ordem: (last?.ordem ?? -1) + 1 },
  });
  return toCategoriaDTO(categoria);
}

export async function updateCategoria(
  id: number,
  input: { nome?: string; ativa?: boolean; ordem?: number },
): Promise<CategoriaDTO> {
  const data: Prisma.CategoriaUpdateInput = {};
  if (input.nome !== undefined) {
    const nome = input.nome.trim();
    if (!nome) throw new Error("Nome da categoria é obrigatório.");
    data.nome = nome;
  }
  if (input.ativa !== undefined) data.ativa = input.ativa;
  if (input.ordem !== undefined) data.ordem = input.ordem;

  const categoria = await prisma.categoria.update({ where: { id }, data });
  return toCategoriaDTO(categoria);
}

// Remove a categoria se ela nunca foi usada; caso contrário apenas arquiva
// (ativa=false), preservando o histórico dos lançamentos já lançados.
export async function deleteCategoria(id: number): Promise<{ archived: boolean }> {
  const emUso = await prisma.lancamento.count({ where: { categoriaId: id } });
  if (emUso > 0) {
    await prisma.categoria.update({ where: { id }, data: { ativa: false } });
    return { archived: true };
  }
  await prisma.categoria.delete({ where: { id } });
  return { archived: false };
}

// ---------------------------------------------------------------------------
// Lançamentos (receitas e despesas do dia a dia)
// ---------------------------------------------------------------------------

export interface LancamentoDTO {
  id: number;
  categoriaId: number;
  categoriaNome: string;
  tipo: CategoriaTipo;
  data: string;
  descricao: string;
  valor: number;
  status: LancamentoStatus;
}

type LancamentoComCategoria = Prisma.LancamentoGetPayload<{ include: { categoria: true } }>;

function toLancamentoDTO(lancamento: LancamentoComCategoria): LancamentoDTO {
  return {
    id: lancamento.id,
    categoriaId: lancamento.categoriaId,
    categoriaNome: lancamento.categoria.nome,
    tipo: lancamento.categoria.tipo,
    data: toDateOnly(lancamento.data),
    descricao: lancamento.descricao,
    valor: round2(Number(lancamento.valor)),
    status: lancamento.status,
  };
}

function monthRange(year: number, month?: number): { start: Date; end: Date } {
  if (month) {
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export async function listLancamentos(filter: {
  year: number;
  month?: number;
  categoriaId?: number;
}): Promise<LancamentoDTO[]> {
  const { start, end } = monthRange(filter.year, filter.month);
  const lancamentos = await prisma.lancamento.findMany({
    where: {
      data: { gte: start, lt: end },
      ...(filter.categoriaId ? { categoriaId: filter.categoriaId } : {}),
    },
    include: { categoria: true },
    orderBy: [{ data: "asc" }, { id: "asc" }],
  });
  return lancamentos.map(toLancamentoDTO);
}

export interface LancamentoInput {
  categoriaId: number;
  data: string;
  descricao?: string;
  valor: number;
  status?: LancamentoStatus;
}

export async function createLancamento(input: LancamentoInput): Promise<LancamentoDTO> {
  if (!(input.valor > 0)) throw new Error("Valor deve ser maior que zero.");
  const lancamento = await prisma.lancamento.create({
    data: {
      categoriaId: input.categoriaId,
      data: parseDateOnly(input.data),
      descricao: input.descricao?.trim() ?? "",
      valor: input.valor,
      status: input.status ?? "CONFIRMADO",
    },
    include: { categoria: true },
  });
  return toLancamentoDTO(lancamento);
}

export async function updateLancamento(
  id: number,
  input: Partial<LancamentoInput>,
): Promise<LancamentoDTO> {
  const data: Prisma.LancamentoUpdateInput = {};
  if (input.categoriaId !== undefined) data.categoria = { connect: { id: input.categoriaId } };
  if (input.data !== undefined) data.data = parseDateOnly(input.data);
  if (input.descricao !== undefined) data.descricao = input.descricao.trim();
  if (input.valor !== undefined) {
    if (!(input.valor > 0)) throw new Error("Valor deve ser maior que zero.");
    data.valor = input.valor;
  }
  if (input.status !== undefined) data.status = input.status;

  const lancamento = await prisma.lancamento.update({
    where: { id },
    data,
    include: { categoria: true },
  });
  return toLancamentoDTO(lancamento);
}

export async function deleteLancamento(id: number): Promise<void> {
  await prisma.lancamento.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Ajustes (retiradas para aplicações / distribuições de lucros)
// ---------------------------------------------------------------------------

export interface AjusteDTO {
  id: number;
  tipo: AjusteTipo;
  data: string;
  descricao: string;
  valor: number;
}

function toAjusteDTO(ajuste: {
  id: number;
  tipo: AjusteTipo;
  data: Date;
  descricao: string;
  valor: Prisma.Decimal;
}): AjusteDTO {
  return {
    id: ajuste.id,
    tipo: ajuste.tipo,
    data: toDateOnly(ajuste.data),
    descricao: ajuste.descricao,
    valor: round2(Number(ajuste.valor)),
  };
}

export async function listAjustes(filter: { year: number; month?: number }): Promise<AjusteDTO[]> {
  const { start, end } = monthRange(filter.year, filter.month);
  const ajustes = await prisma.ajuste.findMany({
    where: { data: { gte: start, lt: end } },
    orderBy: [{ data: "asc" }, { id: "asc" }],
  });
  return ajustes.map(toAjusteDTO);
}

export interface AjusteInput {
  tipo: AjusteTipo;
  data: string;
  descricao?: string;
  valor: number;
}

export async function createAjuste(input: AjusteInput): Promise<AjusteDTO> {
  if (!(input.valor > 0)) throw new Error("Valor deve ser maior que zero.");
  const ajuste = await prisma.ajuste.create({
    data: {
      tipo: input.tipo,
      data: parseDateOnly(input.data),
      descricao: input.descricao?.trim() ?? "",
      valor: input.valor,
    },
  });
  return toAjusteDTO(ajuste);
}

export async function deleteAjuste(id: number): Promise<void> {
  await prisma.ajuste.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Resumos: substituem as fórmulas da planilha (FC Anual / abas mensais)
// ---------------------------------------------------------------------------

export interface CategoriaResumo {
  categoriaId: number;
  nome: string;
  valor: number;
}

interface MonthTotals {
  month: number;
  saldoInicial: number;
  receitas: number;
  receitasPorCategoria: CategoriaResumo[];
  despesas: number;
  despesasPorCategoria: CategoriaResumo[];
  lucroLiquido: number;
  margem: number;
  retiradas: number;
  distribuicoes: number;
  saldoFinal: number;
}

async function computeMonthTotals(year: number): Promise<MonthTotals[]> {
  const [config, categorias] = await Promise.all([getConfiguracao(), listCategorias()]);
  const { start, end } = monthRange(year);

  const [lancamentos, ajustes] = await Promise.all([
    prisma.lancamento.findMany({
      where: { data: { gte: start, lt: end }, status: "CONFIRMADO" },
      select: { data: true, valor: true, categoriaId: true },
    }),
    prisma.ajuste.findMany({
      where: { data: { gte: start, lt: end } },
      select: { data: true, valor: true, tipo: true },
    }),
  ]);

  const perMonthCategoria = new Map<number, Map<number, number>>();
  for (let m = 1; m <= 12; m++) perMonthCategoria.set(m, new Map());
  for (const lancamento of lancamentos) {
    const month = lancamento.data.getUTCMonth() + 1;
    const bucket = perMonthCategoria.get(month)!;
    bucket.set(
      lancamento.categoriaId,
      (bucket.get(lancamento.categoriaId) ?? 0) + Number(lancamento.valor),
    );
  }

  const perMonthAjuste = new Map<number, { retiradas: number; distribuicoes: number }>();
  for (let m = 1; m <= 12; m++) perMonthAjuste.set(m, { retiradas: 0, distribuicoes: 0 });
  for (const ajuste of ajustes) {
    const month = ajuste.data.getUTCMonth() + 1;
    const bucket = perMonthAjuste.get(month)!;
    if (ajuste.tipo === "RETIRADA") bucket.retiradas += Number(ajuste.valor);
    else bucket.distribuicoes += Number(ajuste.valor);
  }

  const results: MonthTotals[] = [];
  let saldoInicial = config.saldoInicial;

  for (let m = 1; m <= 12; m++) {
    const catMap = perMonthCategoria.get(m)!;
    const receitasPorCategoria: CategoriaResumo[] = [];
    const despesasPorCategoria: CategoriaResumo[] = [];
    let receitas = 0;
    let despesas = 0;

    for (const categoria of categorias) {
      const valor = round2(catMap.get(categoria.id) ?? 0);
      if (!categoria.ativa && valor === 0) continue;

      if (categoria.tipo === "RECEITA") {
        receitas += valor;
        receitasPorCategoria.push({ categoriaId: categoria.id, nome: categoria.nome, valor });
      } else {
        despesas += valor;
        despesasPorCategoria.push({ categoriaId: categoria.id, nome: categoria.nome, valor });
      }
    }
    receitas = round2(receitas);
    despesas = round2(despesas);

    const { retiradas, distribuicoes } = perMonthAjuste.get(m)!;
    const lucroLiquido = round2(receitas - despesas);
    const margem = receitas > 0 ? lucroLiquido / receitas : 0;
    const saldoFinal = round2(saldoInicial + receitas - despesas - retiradas - distribuicoes);

    results.push({
      month: m,
      saldoInicial: round2(saldoInicial),
      receitas,
      receitasPorCategoria,
      despesas,
      despesasPorCategoria,
      lucroLiquido,
      margem,
      retiradas: round2(retiradas),
      distribuicoes: round2(distribuicoes),
      saldoFinal,
    });

    saldoInicial = saldoFinal;
  }

  return results;
}

export interface FluxoDiario {
  dia: number;
  receitas: number;
  despesas: number;
  saldoDia: number;
  saldoAcumulado: number;
}

export interface ResumoMensal extends MonthTotals {
  year: number;
  pendentesReceitas: number;
  pendentesDespesas: number;
  fluxoDiario: FluxoDiario[];
  lancamentos: LancamentoDTO[];
  ajustes: AjusteDTO[];
}

export async function getMonthlySummary(year: number, month: number): Promise<ResumoMensal> {
  const meses = await computeMonthTotals(year);
  const totals = meses[month - 1];

  const { start, end } = monthRange(year, month);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const [lancamentos, ajustes] = await Promise.all([
    prisma.lancamento.findMany({
      where: { data: { gte: start, lt: end } },
      include: { categoria: true },
      orderBy: [{ data: "asc" }, { id: "asc" }],
    }),
    prisma.ajuste.findMany({
      where: { data: { gte: start, lt: end } },
      orderBy: [{ data: "asc" }, { id: "asc" }],
    }),
  ]);

  let pendentesReceitas = 0;
  let pendentesDespesas = 0;
  const dailyReceitas = new Array(daysInMonth + 1).fill(0);
  const dailyDespesas = new Array(daysInMonth + 1).fill(0);

  for (const lancamento of lancamentos) {
    if (lancamento.status !== "CONFIRMADO") {
      if (lancamento.categoria.tipo === "RECEITA") pendentesReceitas += Number(lancamento.valor);
      else pendentesDespesas += Number(lancamento.valor);
      continue;
    }
    const day = lancamento.data.getUTCDate();
    if (lancamento.categoria.tipo === "RECEITA") dailyReceitas[day] += Number(lancamento.valor);
    else dailyDespesas[day] += Number(lancamento.valor);
  }

  const fluxoDiario: FluxoDiario[] = [];
  let saldoAcumulado = totals.saldoInicial;
  for (let dia = 1; dia <= daysInMonth; dia++) {
    const receitas = round2(dailyReceitas[dia]);
    const despesas = round2(dailyDespesas[dia]);
    const saldoDia = round2(receitas - despesas);
    saldoAcumulado = round2(saldoAcumulado + saldoDia);
    fluxoDiario.push({ dia, receitas, despesas, saldoDia, saldoAcumulado });
  }

  return {
    ...totals,
    year,
    pendentesReceitas: round2(pendentesReceitas),
    pendentesDespesas: round2(pendentesDespesas),
    fluxoDiario,
    lancamentos: lancamentos.map(toLancamentoDTO),
    ajustes: ajustes.map(toAjusteDTO),
  };
}

export interface CategoriaAnualDTO {
  categoriaId: number;
  nome: string;
  tipo: CategoriaTipo;
  porMes: number[];
  total: number;
}

export interface ResumoAnual {
  year: number;
  meses: MonthTotals[];
  totalReceitas: number;
  totalDespesas: number;
  totalLucroLiquido: number;
  margemAnual: number;
  totalRetiradas: number;
  totalDistribuicoes: number;
  saldoInicialAno: number;
  saldoFinalAno: number;
  categorias: CategoriaAnualDTO[];
}

export async function getAnnualSummary(year: number): Promise<ResumoAnual> {
  const [meses, categorias] = await Promise.all([computeMonthTotals(year), listCategorias()]);

  const totalReceitas = round2(meses.reduce((s, m) => s + m.receitas, 0));
  const totalDespesas = round2(meses.reduce((s, m) => s + m.despesas, 0));
  const totalLucroLiquido = round2(totalReceitas - totalDespesas);
  const totalRetiradas = round2(meses.reduce((s, m) => s + m.retiradas, 0));
  const totalDistribuicoes = round2(meses.reduce((s, m) => s + m.distribuicoes, 0));

  const categoriaLinhas: CategoriaAnualDTO[] = categorias
    .map((categoria) => {
      const porMes = meses.map((m) => {
        const lista = categoria.tipo === "RECEITA" ? m.receitasPorCategoria : m.despesasPorCategoria;
        return lista.find((c) => c.categoriaId === categoria.id)?.valor ?? 0;
      });
      const total = round2(porMes.reduce((s, v) => s + v, 0));
      return { categoriaId: categoria.id, nome: categoria.nome, tipo: categoria.tipo, porMes, total };
    })
    .filter((linha) => {
      const categoria = categorias.find((c) => c.id === linha.categoriaId);
      return categoria?.ativa || linha.total > 0;
    });

  return {
    year,
    meses,
    totalReceitas,
    totalDespesas,
    totalLucroLiquido,
    margemAnual: totalReceitas > 0 ? totalLucroLiquido / totalReceitas : 0,
    totalRetiradas,
    totalDistribuicoes,
    saldoInicialAno: meses[0].saldoInicial,
    saldoFinalAno: meses[11].saldoFinal,
    categorias: categoriaLinhas,
  };
}

// ---------------------------------------------------------------------------
// Gastos por quinzena: compara a 1ª metade (dias 1-15) com a 2ª metade
// (dias 16 em diante) de cada mês, pra ver se o gasto se concentra no
// começo ou no fim do mês.
// ---------------------------------------------------------------------------

export interface QuinzenaMes {
  month: number;
  quinzena1: number;
  quinzena2: number;
}

export async function getGastosQuinzenais(year: number): Promise<QuinzenaMes[]> {
  const { start, end } = monthRange(year);
  const despesas = await prisma.lancamento.findMany({
    where: {
      data: { gte: start, lt: end },
      status: "CONFIRMADO",
      categoria: { tipo: "DESPESA" },
    },
    select: { data: true, valor: true },
  });

  const meses: QuinzenaMes[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    quinzena1: 0,
    quinzena2: 0,
  }));

  for (const despesa of despesas) {
    const mes = meses[despesa.data.getUTCMonth()];
    if (despesa.data.getUTCDate() <= 15) mes.quinzena1 += Number(despesa.valor);
    else mes.quinzena2 += Number(despesa.valor);
  }

  return meses.map((m) => ({
    month: m.month,
    quinzena1: round2(m.quinzena1),
    quinzena2: round2(m.quinzena2),
  }));
}
