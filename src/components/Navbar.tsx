import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-500 text-white font-bold text-sm">
            PT
          </span>
          <span className="font-bold text-lg tracking-tight">PokeTroca</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link
                href="/painel"
                className="rounded-md px-3 py-1.5 font-medium hover:bg-black/5 dark:hover:bg-white/10"
              >
                Meu painel
              </Link>
              <span className="hidden sm:inline text-black/50 dark:text-white/50">
                {user.name}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/entrar"
                className="rounded-md px-3 py-1.5 font-medium hover:bg-black/5 dark:hover:bg-white/10"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
