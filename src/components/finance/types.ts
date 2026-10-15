export type CategoriaTipo = "RECEITA" | "DESPESA";
export type LancamentoStatus = "CONFIRMADO" | "PENDENTE";
export type AjusteTipo = "RETIRADA" | "DISTRIBUICAO";

export interface Categoria {
  id: number;
  tipo: CategoriaTipo;
  nome: string;
  ordem: number;
  ativa: boolean;
}

export interface Lancamento {
  id: number;
  categoriaId: number;
  categoriaNome: string;
  tipo: CategoriaTipo;
  data: string;
  descricao: string;
  valor: number;
  status: LancamentoStatus;
}

export interface Ajuste {
  id: number;
  tipo: AjusteTipo;
  data: string;
  descricao: string;
  valor: number;
}

export interface CategoriaResumo {
  categoriaId: number;
  nome: string;
  valor: number;
}

export interface FluxoDiario {
  dia: number;
  receitas: number;
  despesas: number;
  saldoDia: number;
  saldoAcumulado: number;
}

export interface ResumoMensal {
  month: number;
  year: number;
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
  pendentesReceitas: number;
  pendentesDespesas: number;
  fluxoDiario: FluxoDiario[];
  lancamentos: Lancamento[];
  ajustes: Ajuste[];
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

export interface CategoriaAnual {
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
  categorias: CategoriaAnual[];
}

export interface Configuracao {
  nomeEmpresa: string;
  anoReferencia: number;
  saldoInicial: number;
}

export interface QuinzenaMes {
  month: number;
  quinzena1: number;
  quinzena2: number;
}
