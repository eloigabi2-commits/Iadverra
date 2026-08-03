import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { deleteFolderAction } from "@/lib/actions/folders";
import ListingCard from "@/components/ListingCard";

export default async function PastaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [folder, viewer] = await Promise.all([
    prisma.folder.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        listings: {
          where: { status: "DISPONIVEL" },
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, city: true, state: true } },
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!folder) notFound();
  const isOwner = viewer?.id === folder.user.id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{folder.name}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            de{" "}
            <Link
              href={`/vendedores/${folder.user.id}`}
              className="font-medium text-red-600 hover:underline"
            >
              {folder.user.name}
            </Link>
          </p>
          {folder.description && (
            <p className="text-sm mt-2 max-w-xl whitespace-pre-wrap">
              {folder.description}
            </p>
          )}
        </div>
        {isOwner && (
          <form action={deleteFolderAction.bind(null, folder.id)}>
            <button
              type="submit"
              className="rounded-md border border-red-600 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
            >
              Excluir pasta
            </button>
          </form>
        )}
      </div>

      {folder.listings.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          Nenhum anúncio disponível nesta pasta.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {folder.listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
