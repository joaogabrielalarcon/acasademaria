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

const PROMPT = `Você é especialista em paisagismo. Leia este memorial descritivo e extraia TODOS os itens de plantas e materiais.
Para cada item retorne JSON com estes campos exatos:
nome_popular (string),
nome_cientifico (string ou null),
porte (string exatamente como escrito no documento),
quantidade (número),
unidade (string: UNID/M2/CX/SACO/POTE conforme documento),
categoria (string: uma de: Árvores / Arbustos e Herbáceas / Forrações / Trepadeiras / Palmeiras / Gramado / Vasos),
confianca (string: alta/media/baixa).
Responda APENAS com array JSON válido, sem markdown, sem explicações, sem texto antes ou depois.`;

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

    let itens: unknown;
    try {
      itens = JSON.parse(texto);
    } catch (_e) {
      const match = texto.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Resposta da IA não está em JSON válido");
      itens = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ itens }), {
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
