import { notFound, redirect } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { updateListingAction } from "@/lib/actions/listings";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Editar anúncio — PokeTroca" };

export default async function EditarAnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();

  const [listing, folders] = await Promise.all([
    prisma.listing.findUnique({ where: { id } }),
    prisma.folder.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!listing) notFound();
  if (listing.userId !== user.id) redirect("/painel");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Editar anúncio</h1>
      <ListingForm
        action={updateListingAction.bind(null, listing.id)}
        folders={folders}
        submitLabel="Salvar alterações"
        isEditing
        defaultValues={{
          type: listing.type,
          title: listing.title,
          description: listing.description ?? undefined,
          setName: listing.setName ?? undefined,
          cardNumber: listing.cardNumber ?? undefined,
          rarity: listing.rarity ?? undefined,
          language: listing.language ?? undefined,
          condition: listing.condition ?? undefined,
          quantity: listing.quantity,
          price: (listing.priceCents / 100).toFixed(2).replace(".", ","),
          folderId: listing.folderId,
          status: listing.status,
          imageData: listing.imageData,
        }}
      />
    </div>
  );
}
