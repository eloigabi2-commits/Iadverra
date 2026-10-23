import Link from "next/link";
import CnaeFilterDashboard from "@/components/CnaeFilterDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="mx-auto flex w-full max-w-5xl justify-end px-6 pt-6">
        <Link
          href="/efeitos"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Estúdio de efeitos TikTok →
        </Link>
      </nav>
      <CnaeFilterDashboard />
    </div>
  );
}
