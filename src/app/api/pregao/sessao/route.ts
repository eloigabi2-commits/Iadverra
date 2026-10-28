import { pregaoConfigurado, usuarioAtual } from "@/lib/pregao-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!pregaoConfigurado()) {
    return Response.json({ erro: "O simulador está sendo configurado." }, { status: 503 });
  }

  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: "Não autenticado." }, { status: 401 });

  return Response.json({ usuario, estado: usuario.estado });
}
