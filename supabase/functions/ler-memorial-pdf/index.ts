import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const client = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

const PROMPT = `Você é especialista em paisagismo. Leia este memorial descritivo e extraia DOIS conjuntos de itens:

1) PLANTAS — qualquer espécie vegetal especificada (árvores, arbustos, herbáceas, forrações, trepadeiras, palmeiras, gramado, vasos).
2) INSUMOS — qualquer material/produto/insumo citado para execução do paisagismo: terra/substrato, adubos e condicionadores (torta de mamona, yoorin, k-forte, algen/lithothamnium, bokashi, terra preta, adubo preparado), cordas, bidim, limitador, lona, telas, mantas, pedriscos, seixos, brita, areia, e qualquer outro produto/insumo extraordinário descrito.

Responda APENAS com um objeto JSON válido (sem markdown, sem texto antes ou depois) no formato:

{
  "plantas": [
    {
      "nome_popular": string,
      "nome_cientifico": string|null,
      "porte": string (exatamente como no documento),
      "quantidade": number,
      "unidade": string (UNID/M2/CX/SACO/POTE conforme documento),
      "categoria": string (uma de: Árvores / Arbustos e Herbáceas / Forrações / Trepadeiras / Palmeiras / Gramado / Vasos),
      "confianca": "alta"|"media"|"baixa"
    }
  ],
  "insumos": [
    {
      "nome": string (nome do material exatamente como aparece, sem inferir marca),
      "quantidade": number|null (se não informado, null),
      "unidade": string (m³/m²/m/kg/saco/rolo/unidade/tonelada conforme documento, ou "unidade" se omisso),
      "categoria": string|null (ex.: "Adubo", "Substrato", "Tela", "Pedra"),
      "observacao": string|null (detalhe relevante: "para canteiros", "10mm", etc.),
      "confianca": "alta"|"media"|"baixa"
    }
  ]
}

Se um conjunto não existir no memorial, retorne array vazio. Não invente itens.`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunk, bytes.length)),
    );
  }
  return btoa(binary);
}

function detectKind(file: File): "pdf" | "image" | "excel" | "unknown" {
  const name = (file.name || "").toLowerCase();
  const t = (file.type || "").toLowerCase();
  if (t === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (t.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(name)) return "image";
  if (
    name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv") ||
    t.includes("spreadsheet") || t.includes("excel") || t === "text/csv"
  ) return "excel";
  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = (formData.get("arquivo") || formData.get("pdf")) as File | null;
    if (!file) {
      return new Response(
        JSON.stringify({ error: "Arquivo não enviado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const kind = detectKind(file);
    const bytes = await file.arrayBuffer();

    let content: any[];

    if (kind === "pdf") {
      content = [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: arrayBufferToBase64(bytes) },
        },
        { type: "text", text: PROMPT },
      ];
    } else if (kind === "image") {
      const mediaType = (file.type && file.type.startsWith("image/"))
        ? file.type
        : "image/jpeg";
      content = [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: arrayBufferToBase64(bytes) },
        },
        { type: "text", text: PROMPT },
      ];
    } else if (kind === "excel") {
      const wb = XLSX.read(new Uint8Array(bytes), { type: "array" });
      let texto = "";
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        texto += `\n\n=== Planilha: ${sheetName} ===\n${csv}`;
      }
      content = [{ type: "text", text: `${PROMPT}\n\nMEMORIAL (planilha):\n${texto.slice(0, 80000)}` }];
    } else {
      return new Response(
        JSON.stringify({ error: "Formato não suportado. Envie PDF, imagem (JPG/PNG) ou planilha (XLS/XLSX/CSV)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8000,
      messages: [{ role: "user", content }],
    });

    const block = response.content[0] as { type: string; text?: string };
    let texto = block.text ?? "";
    texto = texto.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(texto);
    } catch (_e) {
      // Tenta extrair objeto {plantas,insumos}; se não der, tenta array (formato antigo).
      const objMatch = texto.match(/\{[\s\S]*\}/);
      const arrMatch = texto.match(/\[[\s\S]*\]/);
      if (objMatch) {
        parsed = JSON.parse(objMatch[0]);
      } else if (arrMatch) {
        parsed = JSON.parse(arrMatch[0]);
      } else {
        throw new Error("Resposta da IA não está em JSON válido");
      }
    }

    // Normaliza: aceita tanto o novo formato {plantas,insumos} quanto o antigo (array de plantas).
    let plantas: any[] = [];
    let insumos: any[] = [];
    if (Array.isArray(parsed)) {
      plantas = parsed;
    } else if (parsed && typeof parsed === "object") {
      plantas = Array.isArray(parsed.plantas) ? parsed.plantas : [];
      insumos = Array.isArray(parsed.insumos) ? parsed.insumos : [];
    }

    // `itens` mantido por compatibilidade com clientes existentes (= plantas).
    return new Response(JSON.stringify({ itens: plantas, plantas, insumos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ler-memorial-pdf error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
