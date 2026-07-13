// Helpers de parsing para o layout dos Dados Abertos CNPJ da Receita Federal.
// Referência do layout: https://dadosabertos.rfb.gov.br/CNPJ/regras_de_negocio_cnpj.pdf

export function cleanString(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function parseRfbDate(value: string | undefined): Date | null {
  const v = cleanString(value);
  if (!v || v === "00000000" || v.length !== 8) return null;
  const year = Number(v.slice(0, 4));
  const month = Number(v.slice(4, 6));
  const day = Number(v.slice(6, 8));
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseRfbDecimal(value: string | undefined): number | null {
  const v = cleanString(value);
  if (!v) return null;
  const normalized = v.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isNaN(n) ? null : n;
}

export interface EmpresaRow {
  cnpjBasico: string;
  razaoSocial: string;
  naturezaJuridicaCod: string | null;
  qualificacaoResponsavel: string | null;
  capitalSocial: number | null;
  porteEmpresa: string | null;
}

export function mapEmpresaRow(cols: string[]): EmpresaRow {
  return {
    cnpjBasico: cols[0],
    razaoSocial: cleanString(cols[1]) ?? "",
    naturezaJuridicaCod: cleanString(cols[2]),
    qualificacaoResponsavel: cleanString(cols[3]),
    capitalSocial: parseRfbDecimal(cols[4]),
    porteEmpresa: cleanString(cols[5]),
  };
}

export interface EstabelecimentoRow {
  cnpjBasico: string;
  cnpjOrdem: string;
  cnpjDv: string;
  cnpjCompleto: string;
  identificadorMatrizFilial: string | null;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  dataInicioAtividade: Date | null;
  cnaeFiscalPrincipal: string | null;
  cnaeFiscalSecundaria: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  municipioCod: string | null;
  ddd1: string | null;
  telefone1: string | null;
  ddd2: string | null;
  telefone2: string | null;
  correioEletronico: string | null;
}

export function mapEstabelecimentoRow(cols: string[]): EstabelecimentoRow {
  const cnpjBasico = cols[0];
  const cnpjOrdem = cols[1];
  const cnpjDv = cols[2];
  return {
    cnpjBasico,
    cnpjOrdem,
    cnpjDv,
    cnpjCompleto: `${cnpjBasico}${cnpjOrdem}${cnpjDv}`,
    identificadorMatrizFilial: cleanString(cols[3]),
    nomeFantasia: cleanString(cols[4]),
    situacaoCadastral: cleanString(cols[5]),
    dataInicioAtividade: parseRfbDate(cols[10]),
    cnaeFiscalPrincipal: cleanString(cols[11]),
    cnaeFiscalSecundaria: cleanString(cols[12]),
    logradouro: cleanString(cols[14]),
    numero: cleanString(cols[15]),
    complemento: cleanString(cols[16]),
    bairro: cleanString(cols[17]),
    cep: cleanString(cols[18]),
    uf: cleanString(cols[19]),
    municipioCod: cleanString(cols[20]),
    ddd1: cleanString(cols[21]),
    telefone1: cleanString(cols[22]),
    ddd2: cleanString(cols[23]),
    telefone2: cleanString(cols[24]),
    correioEletronico: cleanString(cols[27]),
  };
}

export interface SocioRow {
  cnpjBasico: string;
  identificadorSocio: string | null;
  nomeSocio: string;
  cpfCnpjSocio: string | null;
  qualificacaoSocio: string | null;
  dataEntradaSociedade: Date | null;
  faixaEtaria: string | null;
}

export function mapSocioRow(cols: string[]): SocioRow {
  return {
    cnpjBasico: cols[0],
    identificadorSocio: cleanString(cols[1]),
    nomeSocio: cleanString(cols[2]) ?? "",
    cpfCnpjSocio: cleanString(cols[3]),
    qualificacaoSocio: cleanString(cols[4]),
    dataEntradaSociedade: parseRfbDate(cols[5]),
    faixaEtaria: cleanString(cols[10]),
  };
}

export interface LookupRow {
  codigo: string;
  descricao: string;
}

export function mapLookupRow(cols: string[]): LookupRow {
  return {
    codigo: cols[0],
    descricao: cleanString(cols[1]) ?? "",
  };
}
