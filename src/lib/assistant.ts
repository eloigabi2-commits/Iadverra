import Anthropic from "@anthropic-ai/sdk";
import { MONTHS } from "@/lib/format";
import {
  getAnnualSummary,
  getMonthlySummary,
  listCategorias,
  listLancamentos,
} from "@/lib/finance";

const MODEL = "claude-opus-5";
const MAX_TOOL_ITERATIONS = 4;
const MAX_LANCAMENTOS_RETORNADOS = 80;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "resumo_mensal",
    description:
      "Retorna o resumo financeiro de um mês específico: saldo inicial/final, receitas e despesas totais e por categoria, lucro líquido, margem e valores pendentes de confirmação.",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "number", description: "Ano, ex: 2026" },
        month: { type: "number", description: "Mês de 1 (janeiro) a 12 (dezembro)" },
      },
      required: ["year", "month"],
    },
  },
  {
    name: "resumo_anual",
    description:
      "Retorna o resumo financeiro do ano inteiro: totais, o detalhamento mês a mês e o total de cada categoria de receita/despesa no ano.",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "number", description: "Ano, ex: 2026" },
      },
      required: ["year"],
    },
  },
  {
    name: "listar_lancamentos",
    description:
      "Lista os lançamentos (receitas e despesas) de um período, com data, categoria, descrição, valor e status. Use para responder perguntas sobre lançamentos específicos.",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "number", description: "Ano, ex: 2026" },
        month: {
          type: "number",
          description: "Mês de 1 a 12. Omita para trazer o ano inteiro.",
        },
        categoriaNome: {
          type: "string",
          description: "Filtra por nome exato de uma categoria (opcional).",
        },
      },
      required: ["year"],
    },
  },
  {
    name: "listar_categorias",
    description: "Lista as categorias de receita e despesa cadastradas (plano de contas).",
    input_schema: { type: "object", properties: {} },
  },
];

function systemPrompt(year: number, month: number): string {
  return `Você é o assistente de contabilidade do app "Contabilidade Conforme".

Responda sempre em português do Brasil, de forma direta e objetiva. A maioria das respostas deve caber em poucas frases; use listas curtas só quando ajudar a organizar vários números.

Você ajuda com dois tipos de pergunta:
1. Perguntas sobre os números da empresa (receitas, despesas, saldo, lucro, categorias, lançamentos) — use as ferramentas disponíveis para consultar os dados reais antes de responder. Nunca invente valores; se a ferramenta não trouxer o que precisa, diga que não encontrou.
2. Dúvidas gerais de contabilidade e finanças (ex: o que é DAS, prolabore, Simples Nacional, MEI, como categorizar uma despesa) — responda com seu conhecimento geral, deixando claro quando for uma orientação geral que não substitui um contador de verdade.

Formate valores em reais (ex: R$ 1.234,56). O período selecionado agora no app é ${MONTHS[month - 1]} de ${year} — quando o usuário disser "este mês" ou "esse ano" sem especificar, use esse período.`;
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "resumo_mensal": {
      const year = Number(input.year);
      const month = Number(input.month);
      const resumo = await getMonthlySummary(year, month);
      return {
        year: resumo.year,
        month: resumo.month,
        saldoInicial: resumo.saldoInicial,
        receitas: resumo.receitas,
        receitasPorCategoria: resumo.receitasPorCategoria,
        despesas: resumo.despesas,
        despesasPorCategoria: resumo.despesasPorCategoria,
        lucroLiquido: resumo.lucroLiquido,
        margem: resumo.margem,
        retiradas: resumo.retiradas,
        distribuicoes: resumo.distribuicoes,
        saldoFinal: resumo.saldoFinal,
        pendentesReceitas: resumo.pendentesReceitas,
        pendentesDespesas: resumo.pendentesDespesas,
      };
    }
    case "resumo_anual": {
      const year = Number(input.year);
      const resumo = await getAnnualSummary(year);
      return {
        year: resumo.year,
        saldoInicialAno: resumo.saldoInicialAno,
        saldoFinalAno: resumo.saldoFinalAno,
        totalReceitas: resumo.totalReceitas,
        totalDespesas: resumo.totalDespesas,
        totalLucroLiquido: resumo.totalLucroLiquido,
        margemAnual: resumo.margemAnual,
        totalRetiradas: resumo.totalRetiradas,
        totalDistribuicoes: resumo.totalDistribuicoes,
        meses: resumo.meses.map((m) => ({
          month: m.month,
          receitas: m.receitas,
          despesas: m.despesas,
          lucroLiquido: m.lucroLiquido,
          saldoFinal: m.saldoFinal,
        })),
        categorias: resumo.categorias.map((c) => ({
          nome: c.nome,
          tipo: c.tipo,
          total: c.total,
        })),
      };
    }
    case "listar_lancamentos": {
      const year = Number(input.year);
      const month = input.month !== undefined ? Number(input.month) : undefined;
      const lancamentos = await listLancamentos({ year, month });
      const filtrados = input.categoriaNome
        ? lancamentos.filter(
            (l) => l.categoriaNome.toLowerCase() === String(input.categoriaNome).toLowerCase(),
          )
        : lancamentos;
      const truncado = filtrados.length > MAX_LANCAMENTOS_RETORNADOS;
      return {
        total: filtrados.length,
        truncado,
        lancamentos: filtrados.slice(0, MAX_LANCAMENTOS_RETORNADOS).map((l) => ({
          data: l.data,
          tipo: l.tipo,
          categoria: l.categoriaNome,
          descricao: l.descricao,
          valor: l.valor,
          status: l.status,
        })),
      };
    }
    case "listar_categorias": {
      const categorias = await listCategorias();
      return categorias.map((c) => ({ nome: c.nome, tipo: c.tipo, ativa: c.ativa }));
    }
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

export async function askAssistant(
  history: ChatMessage[],
  context: { year: number; month: number },
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada. Defina essa variável de ambiente para habilitar o assistente.",
    );
  }

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system: systemPrompt(context.year, context.month),
      tools: TOOLS,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      return textBlock?.text ?? "Não consegui gerar uma resposta.";
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      try {
        const result = await executeTool(block.name, block.input as Record<string, unknown>);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: (error as Error).message,
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "Não consegui concluir a consulta agora — tenta reformular a pergunta?";
}
