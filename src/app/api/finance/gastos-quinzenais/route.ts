import { NextRequest, NextResponse } from "next/server";
import { getGastosQuinzenais } from "@/lib/finance";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year"));
  if (!year) {
    return NextResponse.json({ error: "year é obrigatório." }, { status: 400 });
  }
  const meses = await getGastosQuinzenais(year);
  return NextResponse.json({ meses });
}
