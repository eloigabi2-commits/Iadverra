import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const cnaes = await prisma.cnae.findMany({
    where: q
      ? {
          OR: [
            { codigo: { contains: q } },
            { descricao: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { descricao: "asc" },
    take: 30,
  });

  return NextResponse.json({ cnaes });
}
