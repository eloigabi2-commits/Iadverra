import ListingForm from "@/components/ListingForm";
import { createListingAction } from "@/lib/actions/listings";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Novo anúncio — PokeTroca" };

export default async function NovoAnuncioPage() {
  const user = await requireCurrentUser();
  const folders = await prisma.folder.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Novo anúncio</h1>
      <ListingForm
        action={createListingAction}
        folders={folders}
        submitLabel="Publicar anúncio"
      />
    </div>
  );
}
