import { NextRequest, NextResponse } from "next/server";
import { getConfiguracao, updateConfiguracao } from "@/lib/finance";

export async function GET() {
  const config = await getConfiguracao();
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  try {
    const config = await updateConfiguracao({
      nomeEmpresa: typeof body.nomeEmpresa === "string" ? body.nomeEmpresa : undefined,
      anoReferencia: typeof body.anoReferencia === "number" ? body.anoReferencia : undefined,
      saldoInicial: typeof body.saldoInicial === "number" ? body.saldoInicial : undefined,
    });
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
