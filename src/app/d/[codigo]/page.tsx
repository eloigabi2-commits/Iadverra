import type { Metadata } from "next";
import TelaDocumentos from "@/components/TelaDocumentos";
import { buscarPorCodigo } from "@/lib/documentos";

export const metadata: Metadata = {
  title: "Envio de documentos",
  robots: { index: false, follow: false },
};

// Link curto que vai para o cliente: /d/maria-k7p2xq
export default async function Page(props: PageProps<"/d/[codigo]">) {
  const { codigo } = await props.params;
  return <TelaDocumentos solicitacao={await buscarPorCodigo(codigo.toLowerCase())} />;
}
