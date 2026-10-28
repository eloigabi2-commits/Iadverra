import { cookies } from "next/headers";
import { COOKIE_PREGAO } from "@/lib/pregao-auth";

export async function POST() {
  (await cookies()).delete(COOKIE_PREGAO);
  return Response.json({ ok: true });
}
