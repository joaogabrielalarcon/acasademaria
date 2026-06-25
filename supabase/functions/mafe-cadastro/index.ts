// Edge function: mafe-cadastro
// Motor genérico de cadastro conversacional via IA (Mafe).
// Recebe { entidade, modo, mensagens, imagem? } e devolve campos extraídos,
// faltantes para integridade e candidatos de duplicado.
// Protegida por login (validação de JWT no código). Sem travessão nas respostas.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const MAX_MESSAGES = 50;

// ---------- Configuração por entidade ----------
type CampoTipo = "text" | "number" | "enum" | "array_text";
interface CampoCfg {
  name: string;
  tipo: CampoTipo;
  obrigatorio?: boolean;
  enumValores?: string[];
  descricao?: string;
  validar?: (v: any) => string | null; // retorna msg de erro
}
interface EntidadeCfg {
  label: string;
  tabela: string;
  campos: CampoCfg[];
  // chave de dedup: dado o "extraido", devolve query candidatos (shape livre por entidade)
  buscarDuplicados: (
    supabase: any,
    extraido: Record<string, any>,
  ) => Promise<any>;
  systemHint: string;
}

const normaliza = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const ENTIDADES: Record<string, EntidadeCfg> = {
  fornecedores: {
    label: "Fornecedor",
    tabela: "fornecedores",
    campos: [
      { name: "nome", tipo: "text", obrigatorio: true, descricao: "Razão/nome do fornecedor" },
      { name: "cidade", tipo: "text", descricao: "Cidade" },
      { name: "estado", tipo: "text", descricao: "UF (2 letras)" },
      { name: "telefone", tipo: "text" },
      { name: "whatsapp", tipo: "text" },
      { name: "email", tipo: "text" },
      { name: "mercado", tipo: "text", descricao: "Mercado de referência (ex: Holambra, Ceagesp)" },
      { name: "categoria_fornecedor", tipo: "text" },
      { name: "observacoes", tipo: "text" },
      { name: "contato_nome", tipo: "text", descricao: "Nome do atendente principal (vai para fornecedor_atendentes)" },
    ],
    buscarDuplicados: async (supabase, extraido) => {
      const nome = String(extraido.nome ?? "").trim();
      if (!nome) return [];
      // busca por nome similar (ilike por tokens) + filtra cidade quando informada
      const tokens = normaliza(nome).split(/\s+/).filter((t) => t.length >= 3).slice(0, 3);
      let q = supabase
        .from("fornecedores")
        .select("id,nome,cidade,estado,telefone,mercado")
        .limit(20);
      if (tokens.length > 0) {
        const orExpr = tokens.map((t) => `nome.ilike.%${t}%`).join(",");
        q = q.or(orExpr);
      } else {
        q = q.ilike("nome", `%${nome}%`);
      }
      const { data } = await q;
      const cidade = normaliza(extraido.cidade);
      const arr = (data ?? []) as any[];
      // se cidade informada, prioriza match de cidade; senão devolve todos
      return arr
        .map((r) => ({
          ...r,
          _score:
            (normaliza(r.nome).includes(normaliza(nome)) ||
            normaliza(nome).includes(normaliza(r.nome))
              ? 2
              : 1) + (cidade && normaliza(r.cidade) === cidade ? 2 : 0),
        }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 5);
    },
    systemHint:
      "Extraia dados de um fornecedor (viveiro, mercado, prestador). Se vier endereço completo, separe cidade e UF. Telefone só dígitos com DDD quando possível.",
  },

  insumos: {
    label: "Insumo",
    tabela: "insumos",
    campos: [
      { name: "nome", tipo: "text", obrigatorio: true, descricao: "Nome do insumo (ex: Terra preta, Bidim, Torta de mamona)" },
      { name: "categoria", tipo: "text", descricao: "Categoria livre (Adubo, Substrato, Tela, Lona, etc.)" },
      { name: "unidade", tipo: "text", descricao: "Unidade de medida (kg, saco, m, m², m³, rolo, litro, unid)" },
      { name: "volume_apresentacao", tipo: "text", descricao: "Volume/peso da apresentação (ex: 25kg, 50L, rolo 50m)" },
      { name: "descricao_produto", tipo: "text", descricao: "Descrição livre do produto" },
      { name: "observacoes", tipo: "text" },
    ],
    buscarDuplicados: async (supabase, extraido) => {
      const nome = String(extraido.nome ?? "").trim();
      if (!nome) return [];
      const tokens = normaliza(nome).split(/\s+/).filter((t) => t.length >= 3).slice(0, 3);
      let q = supabase
        .from("insumos")
        .select("id,nome,categoria,unidade,volume_apresentacao")
        .eq("ativo", true)
        .limit(20);
      if (tokens.length > 0) {
        q = q.or(tokens.map((t) => `nome.ilike.%${t}%`).join(","));
      } else {
        q = q.ilike("nome", `%${nome}%`);
      }
      const { data } = await q;
      const cat = normaliza(extraido.categoria);
      const arr = (data ?? []) as any[];
      return arr
        .map((r) => ({
          ...r,
          _score:
            (normaliza(r.nome) === normaliza(nome) ? 3
              : normaliza(r.nome).includes(normaliza(nome)) || normaliza(nome).includes(normaliza(r.nome))
              ? 2 : 1) +
            (cat && normaliza(r.categoria) === cat ? 1 : 0),
        }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 5);
    },
    systemHint:
      "Extraia dados de um insumo de catálogo (terra, substrato, adubo, bidim, lona, corda, tela, etc.). Unidade em forma curta (kg, saco, m, m², m³, rolo, litro, unid). Não invente categoria.",
  },

  plantas: {
    label: "Planta",
    tabela: "plantas",
    campos: [
      { name: "nome_popular", tipo: "text", obrigatorio: true },
      { name: "nome_cientifico", tipo: "text" },
      { name: "porte", tipo: "text", descricao: "Porte em metros com vírgula (ex: 0,40 ou 1,20). Aceita lista separada por ; quando houver múltiplos." },
      { name: "altura_m", tipo: "number", descricao: "Altura única em metros (decimal com ponto)" },
      { name: "unidade", tipo: "text", descricao: "Unid, Muda, Cuia, Pote, Saco, etc." },
      { name: "categoria", tipo: "text", descricao: "Nome da categoria (ex: Arbusto, Forração, Árvore). Será resolvida para categoria_id depois." },
      { name: "embalagem", tipo: "text" },
      { name: "dap_cm", tipo: "number" },
      { name: "observacoes", tipo: "text" },
    ],
    buscarDuplicados: async (supabase, extraido) => {
      const pop = String(extraido.nome_popular ?? "").trim();
      const sci = String(extraido.nome_cientifico ?? "").trim();
      if (!pop && !sci) return [];
      let q = supabase
        .from("plantas")
        .select("id,nome_popular,nome_cientifico,porte,altura_m,unidade")
        .eq("ativo", true)
        .limit(20);
      if (pop && sci) {
        q = q.or(`nome_popular.ilike.%${pop}%,nome_cientifico.ilike.%${sci}%`);
      } else if (pop) {
        q = q.ilike("nome_popular", `%${pop}%`);
      } else {
        q = q.ilike("nome_cientifico", `%${sci}%`);
      }
      const { data } = await q;
      const porte = normaliza(extraido.porte);
      const arr = (data ?? []) as any[];
      return arr
        .map((r) => ({
          ...r,
          _score:
            (normaliza(r.nome_popular) === normaliza(pop) ? 2 : 1) +
            (sci && normaliza(r.nome_cientifico) === normaliza(sci) ? 2 : 0) +
            (porte && normaliza(r.porte) === porte ? 1 : 0),
        }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 5);
    },
    systemHint:
      "Extraia dados de uma planta de catálogo. Porte em metros com vírgula decimal (0,40 / 1,20 / 5,00). Não invente nome científico.",
  },

  preco_fornecedor: {
    label: "Preço de fornecedor",
    tabela: "historico_precos",
    campos: [
      { name: "fornecedor_nome", tipo: "text", obrigatorio: true, descricao: "Nome do fornecedor que cotou" },
      { name: "item_nome", tipo: "text", obrigatorio: true, descricao: "Nome popular ou científico do item (planta ou insumo)" },
      { name: "item_tipo", tipo: "enum", enumValores: ["planta", "insumo", "auto"], descricao: "planta ou insumo. Use 'auto' quando não tiver certeza." },
      { name: "porte", tipo: "text", descricao: "Porte em metros com vírgula (ex: 0,40 ou 1,20). Só para planta." },
      { name: "unidade", tipo: "text", descricao: "Unidade do preço (Unid, Muda, Cuia, kg, m³ etc.). Se não dito, deixe null para usar a do catálogo." },
      { name: "preco", tipo: "number", obrigatorio: true, descricao: "Preço unitário em R$ (use ponto decimal)" },
      { name: "observacoes", tipo: "text" },
    ],
    buscarDuplicados: async (supabase, extraido) => {
      const forNome = String(extraido.fornecedor_nome ?? "").trim();
      const itemNome = String(extraido.item_nome ?? "").trim();
      const porte = normaliza(extraido.porte);
      const tipoHint = String(extraido.item_tipo ?? "auto").toLowerCase();

      const result: any = { fornecedores: [], itens: [], ultimo_preco: null };

      // ---- Fornecedores ----
      if (forNome) {
        const tokens = normaliza(forNome).split(/\s+/).filter((t) => t.length >= 3).slice(0, 3);
        let q = supabase
          .from("fornecedores")
          .select("id,nome,cidade,estado,mercado")
          .eq("status", "ativo")
          .limit(15);
        if (tokens.length > 0) q = q.or(tokens.map((t) => `nome.ilike.%${t}%`).join(","));
        else q = q.ilike("nome", `%${forNome}%`);
        const { data } = await q;
        result.fornecedores = ((data ?? []) as any[])
          .map((r) => ({
            ...r,
            _score: normaliza(r.nome) === normaliza(forNome) ? 3
              : normaliza(r.nome).includes(normaliza(forNome)) ? 2 : 1,
          }))
          .sort((a, b) => b._score - a._score)
          .slice(0, 5);
      }

      // ---- Itens (plantas + insumos do catálogo INTEIRO) ----
      if (itemNome) {
        const buscarTipo = async (tipo: "planta" | "insumo") => {
          const tabela = tipo === "planta" ? "plantas" : "insumos";
          let q = supabase
            .from(tabela)
            .select(tipo === "planta"
              ? "id,nome_popular,nome_cientifico,porte,unidade,preco_unitario"
              : "id,nome,unidade,preco_unitario")
            .eq("ativo", true)
            .limit(10);
          if (tipo === "planta") {
            q = q.or(`nome_popular.ilike.%${itemNome}%,nome_cientifico.ilike.%${itemNome}%`);
          } else {
            q = q.ilike("nome", `%${itemNome}%`);
          }
          const { data } = await q;
          return ((data ?? []) as any[]).map((r) => ({
            id: r.id,
            tipo,
            nome: tipo === "planta" ? r.nome_popular : r.nome,
            nome_cientifico: r.nome_cientifico ?? null,
            porte: r.porte ?? null,
            unidade: r.unidade ?? null,
            preco_unitario: r.preco_unitario ?? null,
          }));
        };
        const lista: any[] = [];
        if (tipoHint === "planta" || tipoHint === "auto") lista.push(...(await buscarTipo("planta")));
        if (tipoHint === "insumo" || tipoHint === "auto") lista.push(...(await buscarTipo("insumo")));
        result.itens = lista
          .map((r) => ({
            ...r,
            _score:
              (normaliza(r.nome) === normaliza(itemNome) ? 3 : normaliza(r.nome).includes(normaliza(itemNome)) ? 2 : 1) +
              (porte && normaliza(r.porte) === porte ? 1 : 0),
          }))
          .sort((a, b) => b._score - a._score)
          .slice(0, 8);
      }

      // ---- Último preço (se top 1 fornecedor + top 1 item óbvios) ----
      const forTop = result.fornecedores[0];
      const itemTop = result.itens[0];
      if (forTop && itemTop && forTop._score >= 2 && itemTop._score >= 2) {
        const { data: ult } = await supabase
          .from("historico_precos")
          .select("preco,data_orcamento,porte,unidade")
          .eq("fornecedor_id", forTop.id)
          .eq("item_id", itemTop.id)
          .eq("item_tipo", itemTop.tipo)
          .order("data_orcamento", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ult) result.ultimo_preco = ult;
      }

      return result;
    },
    systemHint:
      "Extraia uma atualização de preço de fornecedor para um item do catálogo. Preço em número decimal (use ponto). Se o operador não disser porte/unidade, deixe null que o sistema completa do catálogo.",
  },
};

// ---------- Tool definition (dinâmica por entidade) ----------
function buildTool(cfg: EntidadeCfg) {
  const props: Record<string, any> = {};
  for (const c of cfg.campos) {
    if (c.tipo === "number") props[c.name] = { type: ["number", "null"], description: c.descricao };
    else if (c.tipo === "array_text") props[c.name] = { type: "array", items: { type: "string" } };
    else if (c.tipo === "enum") props[c.name] = { type: "string", enum: c.enumValores ?? [] };
    else props[c.name] = { type: ["string", "null"], description: c.descricao };
  }
  return {
    type: "function",
    function: {
      name: "extrair_dados",
      description: `Extrai campos de ${cfg.label} a partir da conversa. Use null para o que não foi dito; nunca invente.`,
      parameters: {
        type: "object",
        properties: {
          ...props,
          confianca: { type: "string", enum: ["alta", "media", "baixa"] },
          observacao_ia: { type: "string", description: "Comentário curto da IA sobre o que entendeu (sem travessão)." },
        },
        additionalProperties: false,
      },
    },
  } as const;
}

function buildSystemPrompt(cfg: EntidadeCfg, modo: string) {
  const lista = cfg.campos
    .map((c) => `- ${c.name}${c.obrigatorio ? " (obrigatório)" : ""}${c.descricao ? `: ${c.descricao}` : ""}`)
    .join("\n");
  return `Você é a Mafe, assistente operacional da Casa de Maria. Está ajudando o operador a ${modo === "atualizar" ? "atualizar" : "cadastrar"} ${cfg.label}.

Campos a extrair:
${lista}

REGRAS:
- ${cfg.systemHint}
- Use SEMPRE a tool extrair_dados ao final, mesmo que faltem dados. O que não foi dito vai como null.
- Em PT-BR. Sem travessão (—) em qualquer texto.
- Não mencione "IA", "modelo" ou "banco de dados".
- Se a imagem estiver ilegível, diga isso e peça nova foto ou texto.`;
}

function toGeminiMessages(messages: any[]) {
  return messages.map((m) => {
    if (m.image_base64) {
      return {
        role: m.role,
        content: [
          { type: "text", text: m.content || "" },
          { type: "image_url", image_url: { url: m.image_base64 } },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });
}

function validarFaltantes(cfg: EntidadeCfg, extraido: Record<string, any>) {
  const faltantes: string[] = [];
  for (const c of cfg.campos) {
    if (c.obrigatorio) {
      const v = extraido[c.name];
      if (v === null || v === undefined || String(v).trim() === "") {
        faltantes.push(c.name);
      }
    }
  }
  return faltantes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth obrigatório
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const entidade = String(body?.entidade ?? "");
    const modo = body?.modo === "atualizar" ? "atualizar" : "criar";
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    const cfg = ENTIDADES[entidade];
    if (!cfg) {
      return new Response(JSON.stringify({ error: "entidade_invalida", entidades: Object.keys(ENTIDADES) }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: `Limite de ${MAX_MESSAGES} mensagens` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tool = buildTool(cfg);
    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(cfg, modo) },
        ...toGeminiMessages(messages),
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "extrair_dados" } },
      temperature: 0.2,
    };

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limit", message: "Muitas requisições. Tente em alguns segundos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted", message: "Créditos de IA esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[mafe-cadastro] gateway erro", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "ia_error", message: "Falha ao consultar a IA. Tente de novo.", detail: errText.slice(0, 400) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json().catch(() => ({}));
    const choice = aiJson?.choices?.[0];
    const message = choice?.message;
    const toolCalls = message?.tool_calls || [];

    // Parsing defensivo
    let extraido: Record<string, any> = {};
    let confianca = "media";
    let observacao_ia = "";
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const tc = toolCalls.find((t: any) => t?.function?.name === "extrair_dados") || toolCalls[0];
      try {
        const parsed = JSON.parse(tc?.function?.arguments || "{}");
        if (parsed && typeof parsed === "object") {
          confianca = typeof parsed.confianca === "string" ? parsed.confianca : "media";
          observacao_ia = typeof parsed.observacao_ia === "string" ? parsed.observacao_ia : "";
          for (const c of cfg.campos) {
            const v = parsed[c.name];
            if (v === undefined) { extraido[c.name] = null; continue; }
            if (v === null) { extraido[c.name] = null; continue; }
            if (c.tipo === "number") {
              const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
              extraido[c.name] = Number.isFinite(n) ? n : null;
            } else {
              extraido[c.name] = typeof v === "string" ? v.trim() : v;
            }
          }
        }
      } catch (e) {
        console.warn("[mafe-cadastro] JSON inválido em tool args", e);
      }
    }
    // se nada extraído, garante shape
    for (const c of cfg.campos) if (!(c.name in extraido)) extraido[c.name] = null;

    const faltantes = validarFaltantes(cfg, extraido);

    // Dedup
    let duplicados: any[] = [];
    try {
      duplicados = await cfg.buscarDuplicados(supabase, extraido);
    } catch (e) {
      console.warn("[mafe-cadastro] erro dedup", e);
      duplicados = [];
    }

    const assistant_message: string =
      (typeof message?.content === "string" && message.content) ||
      observacao_ia ||
      (faltantes.length > 0
        ? `Anotei o que deu para entender. Ainda preciso de: ${faltantes.join(", ")}.`
        : "Anotei tudo. Confirma o cadastro?");

    return new Response(
      JSON.stringify({
        entidade,
        modo,
        extraido,
        faltantes,
        duplicados,
        confianca,
        assistant_message: assistant_message.replace(/—/g, ","),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[mafe-cadastro] exception", err);
    return new Response(
      JSON.stringify({ error: "exception", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
