import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Transacao {
  data: string;
  valor: number;
  descricao: string;
  remetente: string;
  conta: string;
  agencia: string;
  chave_pix: string;
}

function parseCSV(text: string, banco: string): Transacao[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const transacoes: Transacao[] = [];

  for (const line of lines) {
    try {
      const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      
      // Try to find date and value columns
      let data = "";
      let valor = 0;
      let descricao = "";
      let remetente = "";
      let conta = "";
      let agencia = "";
      let chavePix = "";

      if (banco === "nubank") {
        // Nubank CSV: Data, Valor, Identificador, Descrição
        if (cols.length >= 4) {
          data = cols[0];
          valor = parseFloat(cols[1]?.replace(",", ".") || "0");
          descricao = cols[3] || cols[2] || "";
          remetente = cols[3] || "";
        }
      } else if (banco === "itau") {
        // Itaú CSV: Data, Descrição, Valor
        if (cols.length >= 3) {
          data = cols[0];
          descricao = cols[1] || "";
          valor = parseFloat(cols[2]?.replace(",", ".") || "0");
          remetente = cols[1] || "";
        }
      } else if (banco === "safra") {
        // Safra CSV: Data, Histórico, Valor, Saldo
        if (cols.length >= 3) {
          data = cols[0];
          descricao = cols[1] || "";
          valor = parseFloat(cols[2]?.replace(",", ".") || "0");
          remetente = cols[1] || "";
        }
      } else {
        // Generic: try date, description, value
        if (cols.length >= 3) {
          data = cols[0];
          descricao = cols[1] || "";
          valor = parseFloat(cols[2]?.replace(",", ".") || "0");
          remetente = cols[1] || "";
        }
      }

      // Only include credits (positive values)
      if (valor > 0 && data && /\d/.test(data)) {
        // Extract PIX key if present in description
        const pixMatch = descricao.match(
          /(?:chave|pix)[:\s]*([^\s,;]+@[^\s,;]+|[\d./-]{11,18}|\+?\d{10,13})/i
        );
        if (pixMatch) chavePix = pixMatch[1];

        // Extract account info if present
        const contaMatch = descricao.match(/(?:conta?|cc|c\/c)[:\s]*(\d+)/i);
        if (contaMatch) conta = contaMatch[1];

        const agMatch = descricao.match(/(?:ag|agencia|agência)[:\s]*(\d+)/i);
        if (agMatch) agencia = agMatch[1];

        transacoes.push({
          data: normalizeDate(data),
          valor,
          descricao,
          remetente,
          conta,
          agencia,
          chave_pix: chavePix,
        });
      }
    } catch {
      // Skip unparseable lines
    }
  }

  return transacoes;
}

function normalizeDate(d: string): string {
  // Try DD/MM/YYYY or DD-MM-YYYY
  const match = d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    let year = match[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
  return d;
}

async function parsePDFWithAI(base64Content: string, banco: string): Promise<Transacao[]> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  // Decode base64 to text for the AI
  const bytes = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
  const textContent = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4096,
      system:
        "Extraia todas as transações de ENTRADA (créditos/valores positivos) deste extrato bancário. " +
        "Para cada transação retorne JSON: {data (YYYY-MM-DD), valor (number), descricao, remetente, conta, agencia, chave_pix}. " +
        "Se um campo não estiver disponível, retorne string vazia. " +
        "Responda APENAS com array JSON válido, sem texto adicional.",
      messages: [
        {
          role: "user",
          content: `Extrato do banco ${banco}. Conteúdo:\n\n${textContent.substring(0, 30000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text || "[]";

  // Extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((t: Record<string, unknown>) => ({
      data: String(t.data || ""),
      valor: Number(t.valor) || 0,
      descricao: String(t.descricao || ""),
      remetente: String(t.remetente || ""),
      conta: String(t.conta || ""),
      agencia: String(t.agencia || ""),
      chave_pix: String(t.chave_pix || ""),
    })).filter((t: Transacao) => t.valor > 0);
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { arquivo_base64, banco, arquivo_nome, data_extrato, tipo_arquivo } = body;

    if (!arquivo_base64 || !banco) {
      return new Response(JSON.stringify({ error: "Arquivo e banco são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse transactions
    let transacoes: Transacao[];
    if (tipo_arquivo === "csv") {
      const decoded = atob(arquivo_base64);
      const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      transacoes = parseCSV(text, banco);
    } else {
      transacoes = await parsePDFWithAI(arquivo_base64, banco);
    }

    if (transacoes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma transação de entrada encontrada no arquivo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get colaborador_id for created_by
    const { data: colab } = await supabase
      .from("colaboradores")
      .select("id")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .maybeSingle();

    // Create extrato record
    const { data: extrato, error: extratoErr } = await supabase
      .from("conciliacao_extratos")
      .insert({
        banco,
        data_extrato: data_extrato || new Date().toISOString().split("T")[0],
        arquivo_nome: arquivo_nome || "extrato",
        created_by: colab?.id || null,
      })
      .select("id")
      .single();

    if (extratoErr) throw extratoErr;

    // Fetch all rules for matching
    const { data: regras } = await supabase
      .from("conciliacao_regras")
      .select("*");

    // Match and insert lancamentos
    const lancamentos = transacoes.map((t) => {
      let clienteId: string | null = null;
      let status = "pendente";

      if (regras && regras.length > 0) {
        for (const regra of regras) {
          // Match by chave_pix
          if (regra.chave_pix && t.chave_pix && regra.chave_pix === t.chave_pix) {
            clienteId = regra.cliente_id;
            status = "identificado";
            break;
          }
          // Match by conta + agencia
          if (regra.conta && regra.agencia && t.conta && t.agencia &&
              regra.conta === t.conta && regra.agencia === t.agencia) {
            clienteId = regra.cliente_id;
            status = "identificado";
            break;
          }
          // Match by nome_remetente (partial, case-insensitive)
          if (regra.nome_remetente && t.remetente &&
              t.remetente.toLowerCase().includes(regra.nome_remetente.toLowerCase())) {
            clienteId = regra.cliente_id;
            status = "identificado";
            break;
          }
        }
      }

      return {
        extrato_id: extrato.id,
        data_lancamento: t.data,
        valor: t.valor,
        descricao: t.descricao,
        remetente_raw: t.remetente,
        conta_raw: t.conta,
        chave_pix_raw: t.chave_pix,
        cliente_id: clienteId,
        status,
      };
    });

    const { error: lancErr } = await supabase
      .from("conciliacao_lancamentos")
      .insert(lancamentos);

    if (lancErr) throw lancErr;

    const identificados = lancamentos.filter((l) => l.status === "identificado").length;
    const pendentes = lancamentos.filter((l) => l.status === "pendente").length;

    return new Response(
      JSON.stringify({
        extrato_id: extrato.id,
        total: lancamentos.length,
        identificados,
        pendentes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no processamento:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
