// Seed com dados FICTÍCIOS para desenvolvimento local, sem depender do
// download dos dumps completos da Receita Federal (veja scripts/import-rfb.ts
// para a importação dos dados reais).
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomInt } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CNAES = [
  { codigo: "6201500", descricao: "Desenvolvimento de programas de computador sob encomenda" },
  { codigo: "6202300", descricao: "Desenvolvimento e licenciamento de programas de computador customizáveis" },
  { codigo: "4711302", descricao: "Comércio varejista de mercadorias em geral - supermercados" },
  { codigo: "5611203", descricao: "Lanchonetes, casas de chá, de sucos e similares" },
  { codigo: "8630501", descricao: "Atividade médica ambulatorial com recursos para realização de exames complementares" },
  { codigo: "4120400", descricao: "Construção de edifícios" },
  { codigo: "6920601", descricao: "Atividades de contabilidade" },
  { codigo: "4530703", descricao: "Comércio a varejo de peças e acessórios novos para veículos automotores" },
];

const MUNICIPIOS = [
  { codigo: "7107", descricao: "SAO PAULO" },
  { codigo: "6001", descricao: "RIO DE JANEIRO" },
  { codigo: "4123", descricao: "BELO HORIZONTE" },
  { codigo: "8905", descricao: "CURITIBA" },
];

const UFS = ["SP", "RJ", "MG", "PR"];

const NATUREZAS = [
  { codigo: "2062", descricao: "Sociedade Empresária Limitada" },
  { codigo: "2135", descricao: "Empresário Individual" },
];

const NOMES = [
  "Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Alves", "Elaine Costa",
  "Fabio Ribeiro", "Gabriela Rocha", "Hugo Martins", "Isabela Freitas", "Joao Pereira",
  "Karina Duarte", "Lucas Barbosa", "Mariana Teixeira", "Nelson Cardoso", "Olivia Nunes",
  "Paulo Henrique", "Queila Santos", "Rafael Correia", "Sabrina Gomes", "Tiago Moreira",
];

const RAZOES = [
  "Comercial", "Servicos", "Solucoes", "Tecnologia", "Alimentos", "Construtora",
  "Contabil", "Auto Pecas", "Clinica", "Sistemas",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

// Atendentes do painel de documentos: cada uma ganha o link pessoal dela (/a/<chave>).
// Só cria quem falta; não mexe no link de quem já tem.
const ATENDENTES = [
  "Vitoria Vechetin", "Beatriz", "Jaqueline", "Layla", "Thalia",
  "Solange", "Bruna", "Karen", "Giovana", "Laryssa",
];

const semAcento = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

function chaveDe(nome: string): string {
  const letras = "abcdefghjkmnpqrstuvwxyz23456789";
  let sufixo = "";
  for (let i = 0; i < 12; i++) sufixo += letras[randomInt(letras.length)];
  const primeiro = semAcento(nome).split(" ")[0].replace(/[^a-z]/g, "");
  return primeiro ? `${primeiro}-${sufixo}` : sufixo;
}

async function seedAtendentes() {
  const existentes = await prisma.atendente.findMany();
  for (const nome of ATENDENTES) {
    if (existentes.some((a) => semAcento(a.nome) === semAcento(nome))) continue;
    await prisma.atendente.create({ data: { nome, chave: chaveDe(nome) } });
    console.log(`Atendente cadastrada: ${nome}`);
  }
  // clientes gravados com outra grafia ("vitoria vechetin") passam a usar o nome cadastrado,
  // para aparecerem no painel da atendente
  const cadastradas = await prisma.atendente.findMany({ select: { nome: true } });
  const grafias = await prisma.solicitacaoDocumento.groupBy({ by: ["atendente"], where: { atendente: { not: null } } });
  for (const { atendente } of grafias) {
    const oficial = cadastradas.find((a) => semAcento(a.nome) === semAcento(atendente!));
    if (oficial && oficial.nome !== atendente) {
      await prisma.solicitacaoDocumento.updateMany({ where: { atendente }, data: { atendente: oficial.nome } });
    }
  }
}

async function main() {
  await seedAtendentes();

  const existing = await prisma.empresa.count();
  if (existing > 0) {
    console.log(`Banco já populado (${existing} empresas) — pulando seed.`);
    return;
  }

  console.log("Seeding CNAEs, municípios e naturezas jurídicas...");
  await prisma.cnae.createMany({ data: CNAES, skipDuplicates: true });
  await prisma.municipio.createMany({ data: MUNICIPIOS, skipDuplicates: true });
  await prisma.naturezaJuridica.createMany({ data: NATUREZAS, skipDuplicates: true });

  console.log("Seeding empresas, estabelecimentos e sócios fictícios...");
  const total = 60;
  for (let i = 0; i < total; i++) {
    const cnpjBasico = String(10000000 + i).padStart(8, "0");
    const cnae = pick(CNAES, i);
    const municipio = pick(MUNICIPIOS, i);
    const uf = pick(UFS, i);
    const natureza = pick(NATUREZAS, i);
    const razaoSocial = `${pick(RAZOES, i)} ${pick(RAZOES, i + 3)} ${i + 1} LTDA`;

    await prisma.empresa.create({
      data: {
        cnpjBasico,
        razaoSocial,
        naturezaJuridicaCod: natureza.codigo,
        porteEmpresa: i % 5 === 0 ? "05" : "03",
        capitalSocial: 10000 + i * 1000,
        estabelecimentos: {
          create: {
            cnpjOrdem: "0001",
            cnpjDv: "00",
            cnpjCompleto: `${cnpjBasico}000100`.slice(0, 14),
            identificadorMatrizFilial: "1",
            nomeFantasia: razaoSocial.split(" ").slice(0, 2).join(" "),
            situacaoCadastral: "02",
            dataInicioAtividade: new Date(2015 + (i % 8), i % 12, 1),
            cnaeFiscalPrincipal: cnae.codigo,
            uf,
            municipioCod: municipio.codigo,
            bairro: "Centro",
            ddd1: "11",
            telefone1: String(30000000 + i).padStart(8, "0"),
            correioEletronico: `contato${i}@empresa${i}.com.br`,
          },
        },
        socios: {
          create: [
            {
              identificadorSocio: "2",
              nomeSocio: pick(NOMES, i),
              cpfCnpjSocio: `***${String(100000 + i).padStart(6, "0")}**`,
              qualificacaoSocio: "49",
              dataEntradaSociedade: new Date(2015 + (i % 8), i % 12, 1),
              faixaEtaria: String(4 + (i % 5)),
            },
          ],
        },
      },
    });
  }

  console.log(`Seed concluído: ${total} empresas fictícias criadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
