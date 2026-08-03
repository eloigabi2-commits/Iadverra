"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ListingCondition,
  ListingStatus,
  ListingType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { parsePriceToCents } from "@/lib/format";
import { fileToDataUrl, ImageValidationError } from "@/lib/images";

export type ListingActionState = { error?: string };

function parseListingType(value: FormDataEntryValue | null): ListingType | null {
  return value === "CARTA" || value === "PACOTE" ? value : null;
}

function parseCondition(
  value: FormDataEntryValue | null
): ListingCondition | null {
  const allowed: ListingCondition[] = [
    "LACRADO",
    "NOVA",
    "EXCELENTE",
    "BOA",
    "DANIFICADA",
  ];
  return allowed.includes(value as ListingCondition)
    ? (value as ListingCondition)
    : null;
}

async function buildListingData(formData: FormData, userId: string) {
  const type = parseListingType(formData.get("type"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const setName = String(formData.get("setName") ?? "").trim();
  const cardNumber = String(formData.get("cardNumber") ?? "").trim();
  const rarity = String(formData.get("rarity") ?? "").trim();
  const language = String(formData.get("language") ?? "").trim();
  const condition = parseCondition(formData.get("condition"));
  const quantityRaw = String(formData.get("quantity") ?? "1");
  const priceRaw = String(formData.get("price") ?? "");
  const folderId = String(formData.get("folderId") ?? "").trim();
  const image = formData.get("image");

  if (!type) return { error: "Selecione se é carta avulsa ou pacote." } as const;
  if (!title) return { error: "Dê um título ao anúncio." } as const;

  const quantity = Number.parseInt(quantityRaw, 10);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "Quantidade inválida." } as const;
  }

  const priceCents = parsePriceToCents(priceRaw);
  if (priceCents === null) {
    return { error: "Informe um valor válido para o preço." } as const;
  }

  let folderIdToUse: string | null = null;
  if (folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== userId) {
      return { error: "Pasta inválida." } as const;
    }
    folderIdToUse = folder.id;
  }

  let imageData: string | undefined;
  if (image instanceof File) {
    try {
      const dataUrl = await fileToDataUrl(image);
      if (dataUrl) imageData = dataUrl;
    } catch (err) {
      if (err instanceof ImageValidationError) {
        return { error: err.message } as const;
      }
      throw err;
    }
  }

  return {
    data: {
      type,
      title,
      description: description || null,
      setName: setName || null,
      cardNumber: cardNumber || null,
      rarity: rarity || null,
      language: language || null,
      condition,
      quantity,
      priceCents,
      folderId: folderIdToUse,
      ...(imageData ? { imageData } : {}),
    },
  } as const;
}

export async function createListingAction(
  _prevState: ListingActionState,
  formData: FormData
): Promise<ListingActionState> {
  const user = await requireCurrentUser();

  const result = await buildListingData(formData, user.id);
  if ("error" in result) return { error: result.error };

  const listing = await prisma.listing.create({
    data: { ...result.data, userId: user.id },
  });

  revalidatePath("/painel");
  revalidatePath("/");
  redirect(`/anuncios/${listing.id}`);
}

export async function updateListingAction(
  listingId: string,
  _prevState: ListingActionState,
  formData: FormData
): Promise<ListingActionState> {
  const user = await requireCurrentUser();

  const existing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!existing || existing.userId !== user.id) {
    return { error: "Anúncio não encontrado." };
  }

  const result = await buildListingData(formData, user.id);
  if ("error" in result) return { error: result.error };

  const statusRaw = String(formData.get("status") ?? "");
  const status = (
    ["DISPONIVEL", "RESERVADO", "VENDIDO"] as ListingStatus[]
  ).includes(statusRaw as ListingStatus)
    ? (statusRaw as ListingStatus)
    : existing.status;

  await prisma.listing.update({
    where: { id: listingId },
    data: { ...result.data, status },
  });

  revalidatePath("/painel");
  revalidatePath("/");
  revalidatePath(`/anuncios/${listingId}`);
  redirect(`/anuncios/${listingId}`);
}

export async function deleteListingAction(listingId: string) {
  const user = await requireCurrentUser();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.userId !== user.id) {
    throw new Error("Anúncio não encontrado.");
  }

  await prisma.listing.delete({ where: { id: listingId } });
  revalidatePath("/painel");
  revalidatePath("/");
}
