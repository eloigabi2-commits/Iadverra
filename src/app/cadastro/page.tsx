import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";

export const metadata = { title: "Criar conta — PokeTroca" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Criar conta</h1>
      <RegisterForm />
      <p className="mt-6 text-sm text-black/60 dark:text-white/60">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-red-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
