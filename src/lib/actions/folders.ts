"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";

export type FolderActionState = { error?: string };

export async function createFolderAction(
  _prevState: FolderActionState,
  formData: FormData
): Promise<FolderActionState> {
  const user = await requireCurrentUser();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    return { error: "Dê um nome para a pasta." };
  }

  const existing = await prisma.folder.findUnique({
    where: { userId_name: { userId: user.id, name } },
  });
  if (existing) {
    return { error: "Você já tem uma pasta com esse nome." };
  }

  const folder = await prisma.folder.create({
    data: { userId: user.id, name, description: description || null },
  });

  revalidatePath("/painel");
  redirect(`/pastas/${folder.id}`);
}

export async function deleteFolderAction(folderId: string) {
  const user = await requireCurrentUser();

  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== user.id) {
    throw new Error("Pasta não encontrada.");
  }

  await prisma.folder.delete({ where: { id: folderId } });
  revalidatePath("/painel");
}
