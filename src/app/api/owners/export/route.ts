import { NextRequest } from "next/server";
import { parseCnaesParam, parseUfParam } from "@/lib/filters";
import { findOwners, OwnerRow } from "@/lib/owners";

const BATCH_SIZE = 500;
const MAX_ROWS = 10_000;

function csvEscape(value: string | null): string {
  if (value === null) return "";
  if (/[";\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsvLine(row: OwnerRow): string {
  return [
    row.nomeSocio,
    row.cnpj,
    row.razaoSocial,
    row.nomeFantasia,
    row.cnaeCodigo,
    row.cnaeDescricao,
    row.uf,
    row.municipio,
    row.telefone,
    row.email,
  ]
    .map(csvEscape)
    .join(";");
}

const HEADER = [
  "nome_socio",
  "cnpj",
  "razao_social",
  "nome_fantasia",
  "cnae_codigo",
  "cnae_descricao",
  "uf",
  "municipio",
  "telefone",
  "email",
].join(";");

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const cnaes = parseCnaesParam(params.get("cnaes"));
  const uf = parseUfParam(params.get("uf"));
  const filter = { cnaes, uf };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`${HEADER}\n`));

      if (cnaes.length > 0) {
        let skip = 0;
        while (skip < MAX_ROWS) {
          const owners = await findOwners(filter, { skip, take: BATCH_SIZE });
          if (owners.length === 0) break;
          const lines = owners.map(toCsvLine).join("\n");
          controller.enqueue(encoder.encode(`${lines}\n`));
          skip += owners.length;
          if (owners.length < BATCH_SIZE) break;
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="donos-por-cnae.csv"`,
    },
  });
}
