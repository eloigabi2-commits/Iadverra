import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { deleteListingAction } from "@/lib/actions/listings";
import {
  formatPriceCents,
  LISTING_CONDITION_LABELS,
  LISTING_STATUS_LABELS,
  LISTING_TYPE_LABELS,
} from "@/lib/format";

export default async function AnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [listing, viewer] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, city: true, state: true, phone: true },
        },
        folder: { select: { id: true, name: true } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!listing) notFound();

  const isOwner = viewer?.id === listing.user.id;
  const whatsappDigits = listing.user.phone?.replace(/\D/g, "");

  const specs: [string, string | null][] = [
    ["Coleção/Expansão", listing.setName],
    ["Número da carta", listing.cardNumber],
    ["Raridade", listing.rarity],
    ["Idioma", listing.language],
    [
      "Estado de conservação",
      listing.condition ? LISTING_CONDITION_LABELS[listing.condition] : null,
    ],
    ["Quantidade", String(listing.quantity)],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 grid sm:grid-cols-2 gap-8">
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg relative overflow-hidden">
        {listing.imageData ? (
          <Image
            src={listing.imageData}
            alt={listing.title}
            fill
            unoptimized
            className="object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-black/30 dark:text-white/30 text-sm">
            Sem imagem
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <span className="inline-block rounded-full bg-black/70 text-white text-xs px-2 py-0.5 mb-2">
            {LISTING_TYPE_LABELS[listing.type]}
          </span>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="text-3xl font-extrabold text-red-600 mt-1">
            {formatPriceCents(listing.priceCents)}
          </p>
          <p className="text-sm text-black/50 dark:text-white/50 mt-1">
            {LISTING_STATUS_LABELS[listing.status]}
          </p>
        </div>

        {listing.description && (
          <p className="text-sm whitespace-pre-wrap">{listing.description}</p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {specs
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-black/50 dark:text-white/50">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
        </dl>

        {listing.folder && (
          <p className="text-sm">
            Pasta:{" "}
            <Link
              href={`/pastas/${listing.folder.id}`}
              className="font-medium text-red-600 hover:underline"
            >
              {listing.folder.name}
            </Link>
          </p>
        )}

        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 flex flex-col gap-2">
          <p className="text-sm text-black/50 dark:text-white/50">Vendedor</p>
          <Link
            href={`/vendedores/${listing.user.id}`}
            className="font-medium text-red-600 hover:underline"
          >
            {listing.user.name}
          </Link>
          {listing.user.city && (
            <p className="text-sm">
              {listing.user.city}/{listing.user.state}
            </p>
          )}
          {whatsappDigits ? (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Falar no WhatsApp
            </a>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">
              Vendedor não informou contato direto.
            </p>
          )}
        </div>

        {isOwner && (
          <div className="flex gap-3">
            <Link
              href={`/painel/anuncios/${listing.id}/editar`}
              className="rounded-md border border-black/15 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
            >
              Editar
            </Link>
            <form action={deleteListingAction.bind(null, listing.id)}>
              <button
                type="submit"
                className="rounded-md border border-red-600 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
              >
                Excluir
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
