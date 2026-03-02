// Feriados Nacionais, Estaduais (SP) e Municipais (Jarinu-SP)
// Feriados fixos + cálculo de Páscoa para feriados móveis

function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatMMDD(date: Date): string {
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${m}-${d}`;
}

export interface Feriado {
  data: string; // MM-DD
  nome: string;
  tipo: "nacional" | "estadual" | "municipal";
}

export function getFeriados(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano);
  const carnaval = addDays(pascoa, -47);
  const sextaSanta = addDays(pascoa, -2);
  const corpusChristi = addDays(pascoa, 60);

  const feriados: Feriado[] = [
    // Nacionais fixos
    { data: "01-01", nome: "Confraternização Universal", tipo: "nacional" },
    { data: "04-21", nome: "Tiradentes", tipo: "nacional" },
    { data: "05-01", nome: "Dia do Trabalho", tipo: "nacional" },
    { data: "09-07", nome: "Independência do Brasil", tipo: "nacional" },
    { data: "10-12", nome: "Nossa Sra. Aparecida", tipo: "nacional" },
    { data: "11-02", nome: "Finados", tipo: "nacional" },
    { data: "11-15", nome: "Proclamação da República", tipo: "nacional" },
    { data: "11-20", nome: "Consciência Negra", tipo: "nacional" },
    { data: "12-25", nome: "Natal", tipo: "nacional" },

    // Nacionais móveis
    { data: formatMMDD(carnaval), nome: "Carnaval", tipo: "nacional" },
    { data: formatMMDD(addDays(carnaval, 1)), nome: "Carnaval", tipo: "nacional" },
    { data: formatMMDD(sextaSanta), nome: "Sexta-feira Santa", tipo: "nacional" },
    { data: formatMMDD(pascoa), nome: "Páscoa", tipo: "nacional" },
    { data: formatMMDD(corpusChristi), nome: "Corpus Christi", tipo: "nacional" },

    // Estadual SP
    { data: "07-09", nome: "Revolução Constitucionalista (SP)", tipo: "estadual" },

    // Municipal - Jarinu
    { data: "03-03", nome: "Aniversário de Jarinu", tipo: "municipal" },
    { data: "06-13", nome: "Dia de Santo Antônio (Padroeiro)", tipo: "municipal" },
  ];

  return feriados;
}
