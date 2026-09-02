import type { Metadata } from "next";
import FinanceDashboard from "@/components/finance/FinanceDashboard";

export const metadata: Metadata = {
  title: "Contabilidade Conforme",
  description: "Fluxo de caixa simples, com assistente de IA para dúvidas de contabilidade.",
};

export default function FinancasPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <FinanceDashboard />
    </div>
  );
}
