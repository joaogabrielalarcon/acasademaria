import { supabase } from "@/integrations/supabase/client";

/**
 * Fundação de mídia — helper único de upload usado por TODOS os módulos.
 *
 * Buckets (ambos privados):
 *   - midia-interna: operação (diário, máquinas, recebimentos, cotações...)
 *   - midia-cliente: apenas material publicado para cliente (leitura futura via URL assinada)
 *
 * Caminho padrão: cliente/{cliente_id}/{ano}/{contexto}/{arquivo}
 *   contexto sugerido: "registro-<id>", "orcamento-<id>", "maquina-<id>",
 *   "diario-<id>", "recebimento-<id>", etc.
 */

export type MidiaBucket = "midia-interna" | "midia-cliente";

export type MidiaTipo = "foto" | "video";

export interface UploadMidiaParams {
  file: File;
  clienteId: string;
  contexto: string; // ex: "diario-<id>", "orcamento-<id>", "maquina-<id>"
  bucket?: MidiaBucket; // default: midia-interna
  ano?: number; // default: ano atual
}

export interface UploadMidiaResult {
  bucket: MidiaBucket;
  tipo: MidiaTipo;
  path: string; // caminho principal (imagem WebP ou vídeo original)
  thumbnailPath: string | null; // thumbnail WebP para fotos; null para vídeo
  mimeType: string;
  sizeBytes: number;
  nomeOriginal: string;
}

const MAX_FOTO_LADO = 2560;
const THUMB_LADO = 400;
const FOTO_QUALITY = 0.8;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

const FOTO_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-quicktime",
]);

function inferTipo(file: File): MidiaTipo | null {
  if (FOTO_MIMES.has(file.type)) return "foto";
  if (VIDEO_MIMES.has(file.type)) return "video";
  // fallback via extensão para HEIC em navegadores que não mandam mime
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) return "foto";
  if (ext && ["mp4", "mov", "m4v"].includes(ext)) return "video";
  return null;
}

function slugContexto(ctx: string): string {
  return ctx
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "geral";
}

function randomStub(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Falha ao decodificar a imagem"));
      img.src = url;
    });
    return img;
  } finally {
    // revogado depois pelo caller, mantemos ativo enquanto usamos
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function encodeWebp(source: CanvasImageSource, w: number, h: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");
  ctx.drawImage(source, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar WebP"))),
      "image/webp",
      quality,
    );
  });
}

function fitInside(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= max && h <= max) return { w, h };
  const scale = w >= h ? max / w : max / h;
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/**
 * Faz upload padronizado de uma foto ou vídeo.
 * - Fotos são convertidas para WebP (~0.8) com lado máximo 2560px e thumbnail (~400px).
 * - Vídeos são enviados como estão; se maiores que 200MB, o helper recusa com mensagem clara.
 * - Recusa tipos não permitidos.
 */
export async function uploadMidia(params: UploadMidiaParams): Promise<UploadMidiaResult> {
  const { file, clienteId, contexto } = params;
  const bucket: MidiaBucket = params.bucket ?? "midia-interna";
  const ano = params.ano ?? new Date().getFullYear();

  if (!clienteId) throw new Error("clienteId obrigatório para upload de mídia.");
  if (!contexto) throw new Error("contexto obrigatório para upload de mídia.");

  const tipo = inferTipo(file);
  if (!tipo) {
    throw new Error(
      `Tipo de arquivo não suportado: ${file.type || file.name}. Envie JPG/PNG/WebP/HEIC ou MP4/MOV.`,
    );
  }

  const baseDir = `cliente/${clienteId}/${ano}/${slugContexto(contexto)}`;
  const stub = randomStub();

  if (tipo === "video") {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(
        "Vídeo maior que 200 MB. Envie em 1080p ou reduza o tamanho antes de subir.",
      );
    }
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    const path = `${baseDir}/${stub}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || "video/mp4",
    });
    if (error) throw error;
    return {
      bucket,
      tipo,
      path,
      thumbnailPath: null,
      mimeType: file.type || "video/mp4",
      sizeBytes: file.size,
      nomeOriginal: file.name,
    };
  }

  // FOTO — comprime para WebP + thumbnail
  const img = await readImage(file);
  const full = fitInside(img.naturalWidth, img.naturalHeight, MAX_FOTO_LADO);
  const thumb = fitInside(img.naturalWidth, img.naturalHeight, THUMB_LADO);
  const [webpBlob, thumbBlob] = await Promise.all([
    encodeWebp(img, full.w, full.h, FOTO_QUALITY),
    encodeWebp(img, thumb.w, thumb.h, FOTO_QUALITY),
  ]);

  const path = `${baseDir}/${stub}.webp`;
  const thumbPath = `${baseDir}/${stub}.thumb.webp`;

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.storage.from(bucket).upload(path, webpBlob, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    }),
    supabase.storage.from(bucket).upload(thumbPath, thumbBlob, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    }),
  ]);
  if (err1) throw err1;
  if (err2) throw err2;

  return {
    bucket,
    tipo: "foto",
    path,
    thumbnailPath: thumbPath,
    mimeType: "image/webp",
    sizeBytes: webpBlob.size,
    nomeOriginal: file.name,
  };
}

/** Gera URL assinada de curta duração para exibição interna (default 1h). */
export async function getSignedMidiaUrl(
  bucket: MidiaBucket,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
