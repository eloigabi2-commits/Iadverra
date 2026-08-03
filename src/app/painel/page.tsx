import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFolderAction } from "@/lib/actions/folders";
import { deleteListingAction } from "@/lib/actions/listings";
import { formatPriceCents, LISTING_STATUS_LABELS } from "@/lib/format";

export const metadata = { title: "Meu painel — PokeTroca" };

export default async function PainelPage() {
  const user = await requireCurrentUser();

  const [folders, looseListings] = await Promise.all([
    prisma.folder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { listings: true } } },
    }),
    prisma.listing.findMany({
      where: { userId: user.id, folderId: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 flex flex-col gap-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meu painel</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Olá, {user.name}. Gerencie suas pastas e anúncios.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/pastas/nova"
            className="rounded-md border border-black/15 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Nova pasta
          </Link>
          <Link
            href="/painel/anuncios/novo"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Novo anúncio
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Minhas pastas</h2>
        {folders.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Você ainda não criou nenhuma pasta.
          </p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {folders.map((folder) => (
              <li
                key={folder.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4"
              >
                <Link href={`/pastas/${folder.id}`} className="min-w-0">
                  <p className="font-medium truncate">{folder.name}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {folder._count.listings} anúncio(s)
                  </p>
                </Link>
                <form action={deleteFolderAction.bind(null, folder.id)}>
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:underline cursor-pointer shrink-0"
                  >
                    Excluir
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Anúncios sem pasta</h2>
        {looseListings.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Nenhum anúncio avulso.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {looseListings.map((listing) => (
              <li
                key={listing.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4"
              >
                <Link href={`/anuncios/${listing.id}`} className="min-w-0">
                  <p className="font-medium truncate">{listing.title}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {formatPriceCents(listing.priceCents)} ·{" "}
                    {LISTING_STATUS_LABELS[listing.status]}
                  </p>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/painel/anuncios/${listing.id}/editar`}
                    className="text-xs font-medium hover:underline"
                  >
                    Editar
                  </Link>
                  <form action={deleteListingAction.bind(null, listing.id)}>
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
