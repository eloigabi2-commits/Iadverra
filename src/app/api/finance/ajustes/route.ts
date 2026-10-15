import { NextRequest, NextResponse } from "next/server";
import { AjusteTipo } from "@/generated/prisma/client";
import { createAjuste, listAjustes } from "@/lib/finance";

function isTipo(value: unknown): value is AjusteTipo {
  return value === "RETIRADA" || value === "DISTRIBUICAO";
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const year = Number(params.get("year"));
  if (!year) {
    return NextResponse.json({ error: "year é obrigatório." }, { status: 400 });
  }
  const monthParam = params.get("month");
  const ajustes = await listAjustes({ year, month: monthParam ? Number(monthParam) : undefined });
  return NextResponse.json({ ajustes });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!isTipo(body.tipo) || typeof body.data !== "string" || typeof body.valor !== "number") {
    return NextResponse.json(
      { error: "tipo, data e valor são obrigatórios." },
      { status: 400 },
    );
  }
  try {
    const ajuste = await createAjuste({
      tipo: body.tipo,
      data: body.data,
      descricao: typeof body.descricao === "string" ? body.descricao : undefined,
      valor: body.valor,
    });
    return NextResponse.json(ajuste, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
