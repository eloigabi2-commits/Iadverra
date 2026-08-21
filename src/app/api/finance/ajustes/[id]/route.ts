import { NextRequest, NextResponse } from "next/server";
import { deleteAjuste } from "@/lib/finance";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteAjuste(Number(id));
  return NextResponse.json({ ok: true });
}
