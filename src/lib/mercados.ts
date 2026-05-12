// Mercados de referência operacional da MFM Paisagismo.
// Lista usada como base de sugestões em qualquer campo de mercado.
// Operadores podem digitar livremente outros mercados.
export const MERCADOS_REFERENCIA: string[] = [
  "Ceagesp",
  "Ceaflor",
  "Jundiaí",
  "Ceasa",
  "Itapetininga",
  "Atibaia",
  "Limeira",
  "Ceasa Campinas",
  "São Roque",
  "Boituva",
  "Miracatu",
  "Amparo",
  "Joanópolis",
  "Holambra",
  "Jarinu",
  "Cabreúva",
];

const norm = (s: string) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Une os mercados de referência com mercados já cadastrados em outros fornecedores,
 * removendo duplicatas (case + acento insensível). Mantém a forma original do primeiro
 * registro encontrado para cada mercado e ordena alfabeticamente.
 */
export function mergeMercadosSugestoes(jaCadastrados: string[] = []): string[] {
  const map = new Map<string, string>();
  // referência primeiro (forma canônica)
  MERCADOS_REFERENCIA.forEach((m) => map.set(norm(m), m));
  // depois cadastrados (não sobrescreve a referência)
  jaCadastrados
    .map((m) => String(m || "").trim())
    .filter((m) => m.length > 0)
    .forEach((m) => {
      const k = norm(m);
      if (!map.has(k)) map.set(k, m);
    });
  return Array.from(map.values()).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );
}
