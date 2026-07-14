import { NextRequest, NextResponse } from "next/server";
import { parseCnaesParam, parseUfParam } from "@/lib/filters";
import { countOwners, findOwners } from "@/lib/owners";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const cnaes = parseCnaesParam(params.get("cnaes"));
  const uf = parseUfParam(params.get("uf"));

  if (cnaes.length === 0) {
    return NextResponse.json({ owners: [], total: 0, page: 1, pageSize: PAGE_SIZE });
  }

  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const filter = { cnaes, uf };

  const [total, owners] = await Promise.all([
    countOwners(filter),
    findOwners(filter, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return NextResponse.json({ owners, total, page, pageSize: PAGE_SIZE });
}
