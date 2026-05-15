import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CAPES_INDICATORS, SWOT_CATEGORIES, GENERAL_ITEM_CODE } from "@/lib/swot-items";

interface CompiledItem {
  code: string;
  title: string;
  group: string;
  strength: string[];
  weakness: string[];
}

interface CompiledGeneral {
  opportunity: string[];
  threat: string[];
}

export const compileSwot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ periodId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!roles?.some((r: { role: string }) => r.role === "gestor")) {
      throw new Error("Acesso restrito ao gestor.");
    }

    const { data: entries, error } = await supabase
      .from("swot_entries")
      .select("item_code,category,content,user_id")
      .eq("period_id", data.periodId);
    if (error) throw new Error(error.message);

    const { data: period } = await supabase
      .from("evaluation_periods")
      .select("name,year")
      .eq("id", data.periodId)
      .single();

    const totalParticipants = new Set((entries ?? []).map((e: { user_id: string }) => e.user_id)).size;

    const byItem: Record<string, { strength: string[]; weakness: string[] }> = {};
    for (const it of CAPES_INDICATORS) {
      byItem[it.code] = { strength: [], weakness: [] };
    }
    const general: { opportunity: string[]; threat: string[] } = { opportunity: [], threat: [] };

    (entries ?? []).forEach((e: { item_code: string; category: string; content: string }) => {
      if (e.category === "opportunity" || e.category === "threat") {
        if (e.category === "opportunity") general.opportunity.push(e.content);
        else general.threat.push(e.content);
      } else if (byItem[e.item_code] && (e.category === "strength" || e.category === "weakness")) {
        byItem[e.item_code][e.category as "strength" | "weakness"].push(e.content);
      }
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada no servidor.");

    const client = new Anthropic({ apiKey });
    const prompt = buildPrompt(byItem, general, period?.name ?? "", period?.year ?? 0, totalParticipants);

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 8192,
      system:
        "Você é especialista em planejamento estratégico de Programas de Pós-Graduação stricto sensu (CAPES). Consolide as percepções da comunidade do PPGDHO em um diagnóstico institucional único, agrupando ideias semelhantes, eliminando duplicatas e priorizando os pontos mais relevantes. Responda APENAS em JSON válido em português do Brasil.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    // Remove markdown code fences if the model wrapped the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let parsed: { items?: CompiledItem[]; general?: CompiledGeneral; executive_summary?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("A IA retornou um JSON inválido.");
    }

    return {
      period: { name: period?.name ?? "", year: period?.year ?? 0 },
      totalParticipants,
      totalEntries: entries?.length ?? 0,
      executive_summary: parsed.executive_summary ?? "",
      items: parsed.items ?? [],
      general: parsed.general ?? { opportunity: [], threat: [] },
    };
  });

function buildPrompt(
  byItem: Record<string, { strength: string[]; weakness: string[] }>,
  general: { opportunity: string[]; threat: string[] },
  periodName: string,
  year: number,
  totalParticipants: number,
) {
  const lines: string[] = [];
  lines.push(`Ciclo: ${periodName} (${year}). Participantes: ${totalParticipants}.`);
  lines.push("\nForças/Fraquezas por indicador CAPES:");
  for (const item of CAPES_INDICATORS) {
    const b = byItem[item.code];
    if (!b.strength.length && !b.weakness.length) continue;
    lines.push(`\n--- ${item.code} — ${item.title} ---`);
    if (b.strength.length) {
      lines.push("[Forças]");
      b.strength.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
    }
    if (b.weakness.length) {
      lines.push("[Fraquezas]");
      b.weakness.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
    }
  }
  lines.push("\nAmeaças e Oportunidades (seção geral):");
  if (general.opportunity.length) {
    lines.push("[Oportunidades]");
    general.opportunity.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
  }
  if (general.threat.length) {
    lines.push("[Ameaças]");
    general.threat.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
  }

  const cats = SWOT_CATEGORIES.map((c) => c.label).join(", ");
  lines.push(`
Categorias: ${cats}.

Tarefa:
1. Para cada indicador (${CAPES_INDICATORS.map((i) => i.code).join(", ")}), consolide Forças e Fraquezas (3 a 5 frases por categoria), agrupando ideias similares.
2. Para a seção geral, consolide Ameaças e Oportunidades em 3 a 5 frases cada.
3. Inclua "executive_summary" (2–3 parágrafos) com o diagnóstico institucional.

Use o código "${GENERAL_ITEM_CODE}" implicitamente para a seção geral. Responda EXATAMENTE neste JSON (sem markdown, apenas JSON puro):
{
  "executive_summary": "string",
  "items": [
    { "code": "Q1", "title": "...", "group": "Ficha CAPES", "strength": ["..."], "weakness": ["..."] }
  ],
  "general": { "opportunity": ["..."], "threat": ["..."] }
}`);
  return lines.join("\n");
}
