import { NextRequest, NextResponse } from "next/server";
import { CategoriaTipo } from "@/generated/prisma/client";
import { createCategoria, listCategorias } from "@/lib/finance";

function isTipo(value: unknown): value is CategoriaTipo {
  return value === "RECEITA" || value === "DESPESA";
}

export async function GET(req: NextRequest) {
  const tipoParam = req.nextUrl.searchParams.get("tipo");
  const onlyActive = req.nextUrl.searchParams.get("onlyActive") === "true";
  const categorias = await listCategorias({
    tipo: isTipo(tipoParam) ? tipoParam : undefined,
    onlyActive,
  });
  return NextResponse.json({ categorias });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!isTipo(body.tipo) || typeof body.nome !== "string") {
    return NextResponse.json({ error: "tipo e nome são obrigatórios." }, { status: 400 });
  }
  try {
    const categoria = await createCategoria({ tipo: body.tipo, nome: body.nome });
    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
