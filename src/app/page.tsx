import Link from "next/link";
import SearchForm from "@/components/SearchForm";
import ListingCard from "@/components/ListingCard";
import { searchListings } from "@/lib/listings";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}) {
  const params = await searchParams;
  const listings = await searchListings(params);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col gap-8">
      <section className="rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white px-6 py-10 flex flex-col gap-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold">
          Compre e venda cartas e pacotes Pokémon
        </h1>
        <p className="text-white/90 max-w-2xl">
          Um marketplace de colecionador para colecionador: anuncie suas
          cartas avulsas ou pacotes lacrados com foto e preço, organize tudo
          em pastas e encontre o que procura direto com outros vendedores.
        </p>
        <Link
          href="/cadastro"
          className="mt-2 inline-block w-fit rounded-md bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-white/90"
        >
          Comece a vender
        </Link>
      </section>

      <SearchForm {...params} />

      {listings.length === 0 ? (
        <p className="text-center text-black/50 dark:text-white/50 py-16">
          Nenhum anúncio encontrado com esses filtros.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
