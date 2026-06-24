// Edge function: refinar-comentario-versao
// Recebe o "porquê" escrito pelo humano + o de-para automático (o que mudou)
// e devolve uma versão aperfeiçoada e padronizada do comentário da versão.
// O registro só é gravado pelo frontend após o humano validar a versão da IA.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

function fmtBRL(v: any) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildDeParaTexto(dp: any): string {
  if (!dp) return "(sem de-para)";
  const out: string[] = [];

  if (Array.isArray(dp.itens_entraram) && dp.itens_entraram.length) {
    out.push("Itens que ENTRARAM:");
    dp.itens_entraram.forEach((i: any) => {
      out.push(`  + ${i.quantidade ?? "?"} ${i.unidade || ""} de ${i.nome_popular || i.nome || "—"}${i.porte ? ` (porte ${i.porte})` : ""}`);
    });
  }
  if (Array.isArray(dp.itens_sairam) && dp.itens_sairam.length) {
    out.push("Itens que SAÍRAM:");
    dp.itens_sairam.forEach((i: any) => {
      out.push(`  - ${i.quantidade ?? "?"} ${i.unidade || ""} de ${i.nome_popular || i.nome || "—"}${i.porte ? ` (porte ${i.porte})` : ""}`);
    });
  }
  if (Array.isArray(dp.itens_quantidade_mudou) && dp.itens_quantidade_mudou.length) {
    out.push("Itens com QUANTIDADE alterada:");
    dp.itens_quantidade_mudou.forEach((i: any) => {
      out.push(`  ~ ${i.nome_popular || i.nome || "—"}${i.porte ? ` (porte ${i.porte})` : ""}: de ${i.qtd_anterior} para ${i.qtd_nova} ${i.unidade || ""}`);
    });
  }

  if (Array.isArray(dp.financeiro) && dp.financeiro.length) {
    out.push("Financeiro por categoria (anterior → atual):");
    dp.financeiro.forEach((l: any) => {
      const dif = (Number(l.atual) || 0) - (Number(l.anterior) || 0);
      const sinal = dif >= 0 ? "+" : "";
      out.push(`  · ${l.categoria}: ${fmtBRL(l.anterior)} → ${fmtBRL(l.atual)} (${sinal}${fmtBRL(dif)})`);
    });
  }
  if (dp.totais) {
    out.push(
      `Totais: cliente ${fmtBRL(dp.totais.total_cliente_anterior)} → ${fmtBRL(dp.totais.total_cliente_atual)} | margem ${dp.totais.margem_anterior ?? "?"}% → ${dp.totais.margem_atual ?? "?"}%`,
    );
  }
  return out.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const comentarioHumano: string = (body?.comentario_humano || "").toString();
    const deparaTxt = buildDeParaTexto(body?.de_para);
    const codigo = body?.codigo || "—";
    const versaoSufixo = body?.versao_sufixo || "(primeira versão)";

    if (!comentarioHumano.trim()) {
      return new Response(
        JSON.stringify({ error: "comentario_humano vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const system = `Você é a Mafe, assistente da Casa de Maria. Sua tarefa é PADRONIZAR e APERFEIÇOAR
o texto que o operador escreveu explicando o porquê de uma nova versão de orçamento.

REGRAS:
- Use o "de-para" abaixo como contexto factual do que mudou. Não invente fatos.
- Mantenha o sentido do que o humano escreveu, apenas melhore clareza, ortografia e tom.
- Português do Brasil, tom profissional, direto, sem floreio.
- Cite os números relevantes (R$, quantidades) quando o humano se referir a eles.
- Não use travessão (—). Use hífen ou vírgula.
- Devolva entre 1 e 4 frases, no máximo um parágrafo curto.
- Não mencione "IA", "modelo" ou metadados internos.

Versão: ${codigo}${versaoSufixo ? " " + versaoSufixo : ""}

DE-PARA AUTOMÁTICO:
${deparaTxt}`;

    const resp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Texto do humano:\n"""${comentarioHumano.trim()}"""` },
        ],
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `gateway ${resp.status}`, detail: errTxt.slice(0, 500) }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json().catch(() => ({}));
    const comentarioFinal = data?.choices?.[0]?.message?.content?.toString()?.trim() || comentarioHumano.trim();

    return new Response(
      JSON.stringify({ comentario_final: comentarioFinal }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
