import { NextRequest, NextResponse } from "next/server";
import { deleteCategoria, updateCategoria } from "@/lib/finance";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  try {
    const categoria = await updateCategoria(Number(id), {
      nome: typeof body.nome === "string" ? body.nome : undefined,
      ativa: typeof body.ativa === "boolean" ? body.ativa : undefined,
      ordem: typeof body.ordem === "number" ? body.ordem : undefined,
    });
    return NextResponse.json(categoria);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const result = await deleteCategoria(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
