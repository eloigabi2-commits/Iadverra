import { NextRequest, NextResponse } from "next/server";
import { LancamentoStatus } from "@/generated/prisma/client";
import { deleteLancamento, updateLancamento } from "@/lib/finance";

type Params = { params: Promise<{ id: string }> };

function isStatus(value: unknown): value is LancamentoStatus {
  return value === "CONFIRMADO" || value === "PENDENTE";
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  try {
    const lancamento = await updateLancamento(Number(id), {
      categoriaId: typeof body.categoriaId === "number" ? body.categoriaId : undefined,
      data: typeof body.data === "string" ? body.data : undefined,
      descricao: typeof body.descricao === "string" ? body.descricao : undefined,
      valor: typeof body.valor === "number" ? body.valor : undefined,
      status: isStatus(body.status) ? body.status : undefined,
    });
    return NextResponse.json(lancamento);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteLancamento(Number(id));
  return NextResponse.json({ ok: true });
}
