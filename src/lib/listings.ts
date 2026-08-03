import "server-only";
import { Prisma, ListingType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ListingSearchParams = {
  q?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
};

export function parseListingType(value?: string): ListingType | undefined {
  return value === "CARTA" || value === "PACOTE" ? value : undefined;
}

export async function searchListings(params: ListingSearchParams) {
  const type = parseListingType(params.type);
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;

  const where: Prisma.ListingWhereInput = {
    status: "DISPONIVEL",
    ...(type ? { type } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { setName: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          priceCents: {
            ...(minPrice !== undefined ? { gte: Math.round(minPrice * 100) } : {}),
            ...(maxPrice !== undefined ? { lte: Math.round(maxPrice * 100) } : {}),
          },
        }
      : {}),
  };

  return prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, city: true, state: true } } },
    take: 60,
  });
}
