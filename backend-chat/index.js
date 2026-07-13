const SYSTEM_PROMPT = `Você é a assistente de apoio do programa "Desincha em 21 Dias", um guia de hábitos alimentares e de rotina para reduzir inchaço e emagrecer de forma gradual, sem dietas radicais.
Responda sempre em português do Brasil, de forma acolhedora, direta e prática, em no máximo 4-5 frases.
Fique dentro do escopo de: hábitos alimentares, hidratação, sono, movimento diário, motivação e recaídas alimentares.
Nunca dê diagnóstico médico, prescrição de medicamento, ou recomendação de dieta extremamente restritiva.
Se a pergunta parecer um sintoma médico sério, um transtorno alimentar, ou fugir do escopo do programa, oriente a pessoa a buscar um profissional de saúde qualificado em vez de responder diretamente.`;

const DAILY_LIMIT = 20;
const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_MESSAGES = 6;

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(env), "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Método não permitido" }, 405, env);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: "JSON inválido" }, 400, env);
    }

    const clientId = String(body.clientId || "").slice(0, 64);
    const message = String(body.message || "").slice(0, MAX_MESSAGE_LENGTH);
    const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_MESSAGES) : [];

    if (!clientId || !message.trim()) {
      return jsonResponse({ error: "Faltam campos obrigatórios (clientId, message)" }, 400, env);
    }

    // Rate limit: N mensagens por dia por clientId, usando Workers KV.
    const today = new Date().toISOString().slice(0, 10);
    const kvKey = `rl:${clientId}:${today}`;
    const currentCountRaw = await env.RATE_LIMIT_KV.get(kvKey);
    const currentCount = currentCountRaw ? parseInt(currentCountRaw, 10) : 0;
    if (currentCount >= DAILY_LIMIT) {
      return jsonResponse(
        { error: `Limite diário de ${DAILY_LIMIT} perguntas atingido. Tente novamente amanhã.` },
        429,
        env
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history
        .filter((h) => h && (h.role === "user" || h.role === "assistant") && h.content)
        .map((h) => ({ role: h.role, content: String(h.content).slice(0, MAX_MESSAGE_LENGTH) })),
      { role: "user", content: message },
    ];

    let openaiResp;
    try {
      openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 300,
          temperature: 0.6,
        }),
      });
    } catch (e) {
      return jsonResponse({ error: "Falha ao conectar com a IA" }, 502, env);
    }

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      return jsonResponse({ error: "Erro ao consultar a IA", detail: errText.slice(0, 300) }, 502, env);
    }

    const data = await openaiResp.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content.trim()
      : "Desculpe, não consegui gerar uma resposta agora.";

    await env.RATE_LIMIT_KV.put(kvKey, String(currentCount + 1), { expirationTtl: 60 * 60 * 26 });

    return jsonResponse({ reply, remaining: DAILY_LIMIT - currentCount - 1 }, 200, env);
  },
};
