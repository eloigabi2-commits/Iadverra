import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { formatTelefone } from "@/lib/filters";

export interface OwnerFilter {
  cnaes: string[];
  uf: string | null;
}

export interface OwnerRow {
  nomeSocio: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnaeCodigo: string | null;
  cnaeDescricao: string | null;
  uf: string | null;
  municipio: string | null;
  telefone: string | null;
  email: string | null;
}

function estabelecimentoWhere(filter: OwnerFilter): Prisma.EstabelecimentoWhereInput {
  return {
    ...(filter.cnaes.length ? { cnaeFiscalPrincipal: { in: filter.cnaes } } : {}),
    ...(filter.uf ? { uf: filter.uf } : {}),
  };
}

export function socioWhere(filter: OwnerFilter): Prisma.SocioWhereInput {
  return {
    empresa: {
      estabelecimentos: {
        some: estabelecimentoWhere(filter),
      },
    },
  };
}

export async function countOwners(filter: OwnerFilter): Promise<number> {
  return prisma.socio.count({ where: socioWhere(filter) });
}

export async function findOwners(
  filter: OwnerFilter,
  { skip, take }: { skip: number; take: number },
): Promise<OwnerRow[]> {
  const socios = await prisma.socio.findMany({
    where: socioWhere(filter),
    include: {
      empresa: {
        include: {
          estabelecimentos: {
            where: estabelecimentoWhere(filter),
            include: { cnae: true, municipio: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { nomeSocio: "asc" },
    skip,
    take,
  });

  return socios.map((socio) => {
    const estabelecimento = socio.empresa.estabelecimentos[0];
    return {
      nomeSocio: socio.nomeSocio,
      cnpj: estabelecimento?.cnpjCompleto ?? "",
      razaoSocial: socio.empresa.razaoSocial,
      nomeFantasia: estabelecimento?.nomeFantasia ?? null,
      cnaeCodigo: estabelecimento?.cnae?.codigo ?? null,
      cnaeDescricao: estabelecimento?.cnae?.descricao ?? null,
      uf: estabelecimento?.uf ?? null,
      municipio: estabelecimento?.municipio?.descricao ?? null,
      telefone: formatTelefone(estabelecimento?.ddd1 ?? null, estabelecimento?.telefone1 ?? null),
      email: estabelecimento?.correioEletronico ?? null,
    };
  });
}

export interface CnaeSummary {
  codigo: string;
  descricao: string;
  totalDonos: number;
}

export async function summarizeByCnae(filter: OwnerFilter): Promise<CnaeSummary[]> {
  if (filter.cnaes.length === 0) return [];

  const cnaes = await prisma.cnae.findMany({ where: { codigo: { in: filter.cnaes } } });

  const counts = await Promise.all(
    cnaes.map((cnae) =>
      prisma.socio.count({
        where: socioWhere({ cnaes: [cnae.codigo], uf: filter.uf }),
      }),
    ),
  );

  return cnaes
    .map((cnae, i) => ({ codigo: cnae.codigo, descricao: cnae.descricao, totalDonos: counts[i] }))
    .sort((a, b) => b.totalDonos - a.totalDonos);
}
