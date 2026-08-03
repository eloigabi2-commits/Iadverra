import Link from "next/link";
import Image from "next/image";
import type { searchListings } from "@/lib/listings";
import { formatPriceCents, LISTING_TYPE_LABELS } from "@/lib/format";

type Listing = Awaited<ReturnType<typeof searchListings>>[number];

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/anuncios/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
        {listing.imageData ? (
          <Image
            src={listing.imageData}
            alt={listing.title}
            fill
            unoptimized
            className="object-contain group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-black/30 dark:text-white/30 text-sm">
            Sem imagem
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-full bg-black/70 text-white text-[11px] px-2 py-0.5">
          {LISTING_TYPE_LABELS[listing.type]}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <h3 className="font-medium text-sm line-clamp-2">{listing.title}</h3>
        <p className="text-lg font-bold text-red-600">
          {formatPriceCents(listing.priceCents)}
        </p>
        <p className="text-xs text-black/50 dark:text-white/50">
          {listing.user.name}
          {listing.user.city ? ` · ${listing.user.city}/${listing.user.state ?? ""}` : ""}
        </p>
      </div>
    </Link>
  );
}
