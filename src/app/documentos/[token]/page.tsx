import type { Metadata } from "next";
import TelaDocumentos from "@/components/TelaDocumentos";
import { buscarPorToken } from "@/lib/documentos";

export const metadata: Metadata = {
  title: "Envio de documentos",
  robots: { index: false, follow: false },
};

export default async function Page(props: PageProps<"/documentos/[token]">) {
  const { token } = await props.params;
  return <TelaDocumentos solicitacao={await buscarPorToken(token)} />;
}
