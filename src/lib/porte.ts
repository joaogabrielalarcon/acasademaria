// Padronização obrigatória de porte de plantas em metros.
// Formato: número decimal com vírgula (0,40 — 1,20 — 5,00). Sem unidade no input — label "m" implícita.
// Plantas sem altura entram 0,00 e o sistema exibe "—" visualmente.
// Rejeita texto livre tipo "P14", "Pt 24", "DAP 10/5 m".

const VALID = /^\d{1,3}([.,]\d{1,2})?$/;

export interface PorteParseResult {
  ok: boolean;
  value: number | null; // metros (com decimais)
  error?: string;
}

/** Valida e converte uma string de input para metros. */
export function parsePorteMetros(input: string | number | null | undefined): PorteParseResult {
  if (input === null || input === undefined) return { ok: true, value: null };
  const raw = String(input).trim();
  if (raw === "") return { ok: true, value: null };

  // Rejeita formatos antigos com letras (P14, Pt 24, DAP, cm, m, etc.)
  if (/[a-zA-Z]/.test(raw)) {
    return {
      ok: false,
      value: null,
      error: 'Formato inválido. Use somente números em metros (ex: 0,40 — 1,20 — 5,00). Não inclua "m", "cm", "P", "Pt", "DAP".',
    };
  }

  if (!VALID.test(raw)) {
    return {
      ok: false,
      value: null,
      error: 'Use formato numérico em metros com no máximo 2 casas decimais (ex: 0,40 — 1,20 — 5,00).',
    };
  }

  const n = parseFloat(raw.replace(",", "."));
  if (Number.isNaN(n) || n < 0) {
    return { ok: false, value: null, error: "Altura inválida." };
  }
  // Limite sanity: > 100m extremamente improvável
  if (n > 100) {
    return { ok: false, value: null, error: "Altura acima de 100 m parece incorreta. Confira o valor em metros." };
  }
  return { ok: true, value: n };
}

/** Formata valor numérico em metros para exibição (vírgula decimal). 0 ou null vira "—". */
export function formatPorteMetros(m: number | null | undefined, opts?: { suffix?: boolean }): string {
  if (m === null || m === undefined || Number(m) === 0) return "—";
  const txt = Number(m).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return opts?.suffix === false ? txt : `${txt} m`;
}

/** Tenta normalizar valores vindos de planilhas/legados para o novo formato em metros.
 *  Retorna null se o input não for normalizável (precisa intervenção manual). */
export function normalizarPorteImportacao(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  let s = String(input).trim();
  if (s === "") return null;

  // se contém claramente "cm" → divide por 100
  const cmMatch = s.match(/^(\d{1,4})([.,]\d+)?\s*cm$/i);
  if (cmMatch) {
    const n = parseFloat(s.replace(/\s*cm$/i, "").replace(",", "."));
    return Number.isFinite(n) ? Number((n / 100).toFixed(2)) : null;
  }

  // remove sufixo " m"
  s = s.replace(/\s*m$/i, "");

  // se contém letras (P14, Pt, DAP, etc.) → não normaliza, exige operador
  if (/[a-zA-Z]/.test(s)) return null;

  const r = parsePorteMetros(s);
  return r.ok ? r.value : null;
}
