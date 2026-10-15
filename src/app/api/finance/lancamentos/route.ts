import { NextRequest, NextResponse } from "next/server";
import { LancamentoStatus } from "@/generated/prisma/client";
import { createLancamento, listLancamentos } from "@/lib/finance";

function isStatus(value: unknown): value is LancamentoStatus {
  return value === "CONFIRMADO" || value === "PENDENTE";
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const year = Number(params.get("year"));
  if (!year) {
    return NextResponse.json({ error: "year é obrigatório." }, { status: 400 });
  }
  const monthParam = params.get("month");
  const categoriaIdParam = params.get("categoriaId");

  const lancamentos = await listLancamentos({
    year,
    month: monthParam ? Number(monthParam) : undefined,
    categoriaId: categoriaIdParam ? Number(categoriaIdParam) : undefined,
  });
  return NextResponse.json({ lancamentos });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (
    typeof body.categoriaId !== "number" ||
    typeof body.data !== "string" ||
    typeof body.valor !== "number"
  ) {
    return NextResponse.json(
      { error: "categoriaId, data e valor são obrigatórios." },
      { status: 400 },
    );
  }
  try {
    const lancamento = await createLancamento({
      categoriaId: body.categoriaId,
      data: body.data,
      descricao: typeof body.descricao === "string" ? body.descricao : undefined,
      valor: body.valor,
      status: isStatus(body.status) ? body.status : undefined,
    });
    return NextResponse.json(lancamento, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
