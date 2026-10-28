import type { Metadata } from "next";
import TelaCobranca from "@/components/TelaCobranca";
import { nomeEscritorio } from "@/lib/documentos";
import { buscarCobrancaPorCodigo, dadosPublicos } from "@/lib/cobrancas";

export const metadata: Metadata = {
  title: "Pagamento",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Link de pagamento que vai para o cliente: /pagar/maria-k7p2xq
export default async function Page(props: PageProps<"/pagar/[codigo]">) {
  const { codigo } = await props.params;
  const encontrada = await buscarCobrancaPorCodigo(codigo.toLowerCase());
  const cobranca = encontrada ? dadosPublicos(encontrada) : null;
  return <TelaCobranca cobranca={cobranca} escritorio={nomeEscritorio()} />;
}
