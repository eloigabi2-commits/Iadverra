import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Entrar — PokeTroca" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Entrar</h1>
      <LoginForm next={next} />
      <p className="mt-6 text-sm text-black/60 dark:text-white/60">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-red-600 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
