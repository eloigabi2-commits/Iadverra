import Link from "next/link";
import CnaeFilterDashboard from "@/components/CnaeFilterDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-5xl justify-end px-6 pt-6">
        <Link
          href="/financas"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Fluxo de Caixa →
        </Link>
      </div>
      <CnaeFilterDashboard />
    </div>
  );
}
