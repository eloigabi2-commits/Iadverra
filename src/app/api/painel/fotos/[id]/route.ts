import { prisma } from "@/lib/prisma";
import { estaLogado } from "@/lib/painel-auth";

export async function GET(req: Request, ctx: RouteContext<"/api/painel/fotos/[id]">) {
  if (!(await estaLogado())) return new Response("não autorizado", { status: 401 });

  const { id } = await ctx.params;
  const foto = await prisma.fotoDocumento.findUnique({ where: { id } });
  if (!foto) return new Response("não encontrada", { status: 404 });

  const extensao = foto.mime.split("/")[1] ?? "jpg";
  const baixar = new URL(req.url).searchParams.has("baixar");
  return new Response(Buffer.from(foto.dados), {
    headers: {
      "Content-Type": foto.mime,
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${foto.tipo}.${extensao}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
