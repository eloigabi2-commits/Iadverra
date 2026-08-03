import type {
  ListingCondition,
  ListingStatus,
  ListingType,
} from "@/generated/prisma/client";

export function formatPriceCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parsePriceToCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  CARTA: "Carta avulsa",
  PACOTE: "Pacote/Booster",
};

export const LISTING_CONDITION_LABELS: Record<ListingCondition, string> = {
  LACRADO: "Lacrado",
  NOVA: "Nova",
  EXCELENTE: "Excelente",
  BOA: "Boa",
  DANIFICADA: "Danificada",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
};
