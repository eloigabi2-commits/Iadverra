import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ListingCard from "@/components/ListingCard";

export default async function VendedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const seller = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, city: true, state: true, createdAt: true },
  });
  if (!seller) notFound();

  const [folders, looseListings] = await Promise.all([
    prisma.folder.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { listings: true } } },
    }),
    prisma.listing.findMany({
      where: { userId: id, folderId: null, status: "DISPONIVEL" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, city: true, state: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{seller.name}</h1>
        {seller.city && (
          <p className="text-sm text-black/60 dark:text-white/60">
            {seller.city}/{seller.state}
          </p>
        )}
        <p className="text-xs text-black/50 dark:text-white/50">
          Vendedor desde{" "}
          {seller.createdAt.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {folders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Pastas</h2>
          <ul className="grid sm:grid-cols-3 gap-3">
            {folders.map((folder) => (
              <li key={folder.id}>
                <Link
                  href={`/pastas/${folder.id}`}
                  className="block rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 hover:shadow-md transition-shadow"
                >
                  <p className="font-medium">{folder.name}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {folder._count.listings} anúncio(s)
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Anúncios avulsos</h2>
        {looseListings.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Nenhum anúncio fora de pastas.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {looseListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
