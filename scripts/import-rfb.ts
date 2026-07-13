// Importa os Dados Abertos do CNPJ (Receita Federal) para o Postgres.
//
// Uso:
//   npm run db:import-rfb                       # baixa o período mais recente e importa tudo
//   RFB_PERIOD=2026-06 npm run db:import-rfb     # força um período específico
//   RFB_CNAE_FILTER=6201500,6202300 npm run db:import-rfb   # importa só empresas desses CNAEs
//
// Este script precisa de acesso de rede a https://dadosabertos.rfb.gov.br e de
// espaço em disco suficiente (os dumps completos somam dezenas de GB
// descompactados). Rode fora de ambientes com rede restrita/efêmera.
import "dotenv/config";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";
import { parse } from "csv-parse";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import {
  mapEmpresaRow,
  mapEstabelecimentoRow,
  mapLookupRow,
  mapSocioRow,
} from "./lib/rfb-parse";

const BASE_URL = "https://dadosabertos.rfb.gov.br/CNPJ/";
const DATA_DIR = path.resolve(process.cwd(), "data", "rfb");
const BATCH_SIZE = 2000;

const CNAE_FILTER = new Set(
  (process.env.RFB_CNAE_FILTER ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function log(msg: string) {
  console.log(`[import-rfb] ${msg}`);
}

async function discoverLatestPeriod(): Promise<string> {
  if (process.env.RFB_PERIOD) return process.env.RFB_PERIOD;
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error(`Falha ao listar ${BASE_URL}: HTTP ${res.status}`);
  const html = await res.text();
  const periods = Array.from(html.matchAll(/href="(\d{4}-\d{2})\/"/g)).map((m) => m[1]);
  if (periods.length === 0) throw new Error("Não foi possível identificar o período mais recente.");
  periods.sort();
  return periods[periods.length - 1];
}

interface RemoteFile {
  name: string;
  category: "lookup" | "empresas" | "estabelecimentos" | "socios";
}

function buildFileList(): RemoteFile[] {
  const files: RemoteFile[] = [
    { name: "Cnaes.zip", category: "lookup" },
    { name: "Naturezas.zip", category: "lookup" },
    { name: "Municipios.zip", category: "lookup" },
  ];
  for (let i = 0; i < 10; i++) files.push({ name: `Empresas${i}.zip`, category: "empresas" });
  for (let i = 0; i < 10; i++) files.push({ name: `Estabelecimentos${i}.zip`, category: "estabelecimentos" });
  for (let i = 0; i < 10; i++) files.push({ name: `Socios${i}.zip`, category: "socios" });
  return files;
}

async function downloadFile(url: string, dest: string) {
  if (existsSync(dest) && statSync(dest).size > 0) {
    log(`já baixado: ${path.basename(dest)}`);
    return;
  }
  log(`baixando ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Falha ao baixar ${url}: HTTP ${res.status}`);
  const tmp = `${dest}.part`;
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(tmp));
  const fs = await import("node:fs/promises");
  await fs.rename(tmp, dest);
}

// Os arquivos dentro dos zips da Receita Federal têm nomes internos
// "crípticos" (ex.: K3241.K03200Y0.D60613.ESTABELE) que não correspondem ao
// nome do zip. Por isso extraímos sempre para um nome de saída determinístico
// baseado no nome do zip de origem (ex.: Estabelecimentos0.zip -> .../Estabelecimentos0.csv),
// e assumimos um único arquivo de dados relevante por zip (o maior).
async function extractZip(zipPath: string, outCsvPath: string) {
  if (existsSync(outCsvPath) && statSync(outCsvPath).size > 0) {
    log(`já extraído: ${path.basename(outCsvPath)}`);
    return;
  }
  const directory = await unzipper.Open.file(zipPath);
  const entry = directory.files
    .filter((f) => f.type === "File")
    .sort((a, b) => b.uncompressedSize - a.uncompressedSize)[0];
  if (!entry) throw new Error(`Nenhum arquivo encontrado em ${zipPath}`);
  log(`extraindo ${path.basename(zipPath)} -> ${path.basename(outCsvPath)}`);
  await pipeline(entry.stream(), createWriteStream(outCsvPath));
}

function csvStream(filePath: string) {
  return createReadStream(filePath, { encoding: "latin1" }).pipe(
    parse({
      delimiter: ";",
      quote: '"',
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
    }),
  );
}

async function loadLookups(csvDir: string) {
  log("carregando tabela de CNAEs...");
  await forEachFileMatching(csvDir, /^Cnaes/, async (file) => {
    const rows: { codigo: string; descricao: string }[] = [];
    for await (const cols of csvStream(file) as AsyncIterable<string[]>) {
      const row = mapLookupRow(cols);
      rows.push({ codigo: row.codigo.padStart(7, "0"), descricao: row.descricao });
    }
    await prisma.cnae.createMany({ data: rows, skipDuplicates: true });
  });

  log("carregando naturezas jurídicas...");
  await forEachFileMatching(csvDir, /^Naturezas/, async (file) => {
    const rows: { codigo: string; descricao: string }[] = [];
    for await (const cols of csvStream(file) as AsyncIterable<string[]>) {
      const row = mapLookupRow(cols);
      rows.push({ codigo: row.codigo.padStart(4, "0"), descricao: row.descricao });
    }
    await prisma.naturezaJuridica.createMany({ data: rows, skipDuplicates: true });
  });

  log("carregando municípios...");
  await forEachFileMatching(csvDir, /^Municipios/, async (file) => {
    const rows: { codigo: string; descricao: string }[] = [];
    for await (const cols of csvStream(file) as AsyncIterable<string[]>) {
      const row = mapLookupRow(cols);
      rows.push({ codigo: row.codigo.padStart(4, "0"), descricao: row.descricao });
    }
    await prisma.municipio.createMany({ data: rows, skipDuplicates: true });
  });
}

async function forEachFileMatching(dir: string, pattern: RegExp, fn: (filePath: string) => Promise<void>) {
  const entries = readdirSync(dir).filter((f) => pattern.test(f));
  for (const entry of entries) {
    await fn(path.join(dir, entry));
  }
}

// Pré-varredura local dos Estabelecimentos para descobrir quais cnpj_basico
// batem no filtro de CNAE (quando RFB_CNAE_FILTER está definido). Evita
// carregar empresas fora do interesse do usuário quando a base completa é
// grande demais para o disco/tempo disponíveis.
async function buildCnpjAllowSet(csvDir: string): Promise<Set<string> | null> {
  if (CNAE_FILTER.size === 0) return null;
  log(`filtrando por CNAEs: ${Array.from(CNAE_FILTER).join(", ")}`);
  const allow = new Set<string>();
  await forEachFileMatching(csvDir, /^Estabelecimentos/, async (file) => {
    for await (const cols of csvStream(file) as AsyncIterable<string[]>) {
      const row = mapEstabelecimentoRow(cols);
      if (row.cnaeFiscalPrincipal && CNAE_FILTER.has(row.cnaeFiscalPrincipal)) {
        allow.add(row.cnpjBasico);
      }
    }
  });
  log(`${allow.size} empresas encontradas nos CNAEs filtrados.`);
  return allow;
}

async function loadEmpresas(csvDir: string, allow: Set<string> | null) {
  log("carregando empresas...");
  await forEachFileMatching(csvDir, /^Empresas/, async (file) => {
    let batch: Prisma.EmpresaCreateManyInput[] = [];
    for await (const cols of csvStream(file) as AsyncIterable<string[]>) {
      const row = mapEmpresaRow(cols);
      if (allow && !allow.has(row.cnpjBasico)) continue;
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        await prisma.empresa.createMany({ data: batch, skipDuplicates: true });
        batch = [];
      }
    }
    if (batch.length) await prisma.empresa.createMany({ data: batch, skipDuplicates: true });
  });
}

async function loadEstabelecimentos(csvDir: string, allow: Set<string> | null) {
  log("carregando estabelecimentos...");
  await forEachFileMatching(csvDir, /^Estabelecimentos/, async (file) => {
    let batch: Prisma.EstabelecimentoCreateManyInput[] = [];
    for await (const cols of csvStream(file) as AsyncIterable<string[]>) {
      const row = mapEstabelecimentoRow(cols);
      if (allow && !allow.has(row.cnpjBasico)) continue;
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        await prisma.estabelecimento.createMany({ data: batch, skipDuplicates: true });
        batch = [];
      }
    }
    if (batch.length) await prisma.estabelecimento.createMany({ data: batch, skipDuplicates: true });
  });
}

async function loadSocios(csvDir: string, allow: Set<string> | null) {
  log("carregando sócios...");
  await forEachFileMatching(csvDir, /^Socios/, async (file) => {
    let batch: Prisma.SocioCreateManyInput[] = [];
    for await (const cols of csvStream(file) as AsyncIterable<string[]>) {
      const row = mapSocioRow(cols);
      if (allow && !allow.has(row.cnpjBasico)) continue;
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        await prisma.socio.createMany({ data: batch });
        batch = [];
      }
    }
    if (batch.length) await prisma.socio.createMany({ data: batch });
  });
}

async function main() {
  const period = await discoverLatestPeriod();
  log(`período: ${period}`);

  const zipDir = path.join(DATA_DIR, period, "zips");
  const csvDir = path.join(DATA_DIR, period, "csv");
  mkdirSync(zipDir, { recursive: true });
  mkdirSync(csvDir, { recursive: true });

  const files = buildFileList();
  for (const file of files) {
    const url = `${BASE_URL}${period}/${file.name}`;
    const dest = path.join(zipDir, file.name);
    const outCsvPath = path.join(csvDir, file.name.replace(/\.zip$/, ".csv"));
    await downloadFile(url, dest);
    await extractZip(dest, outCsvPath);
  }

  await loadLookups(csvDir);
  const allow = await buildCnpjAllowSet(csvDir);
  await loadEmpresas(csvDir, allow);
  await loadEstabelecimentos(csvDir, allow);
  await loadSocios(csvDir, allow);

  log("importação concluída.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
