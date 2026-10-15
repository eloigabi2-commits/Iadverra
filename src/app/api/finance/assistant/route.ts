import { NextRequest, NextResponse } from "next/server";
import { askAssistant, type ChatMessage } from "@/lib/assistant";

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (v.role === "user" || v.role === "assistant") && typeof v.content === "string";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const messages = body?.messages;
  const year = Number(body?.year);
  const month = Number(body?.month);

  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isChatMessage)) {
    return NextResponse.json({ error: "messages inválido." }, { status: 400 });
  }
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "year e month (1-12) são obrigatórios." }, { status: 400 });
  }

  try {
    const reply = await askAssistant(messages, { year, month });
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
