// Calcula o "de-para" entre dois snapshots de orçamento.
// Snapshot atual: dado coletado em tempo real na tela.
// Snapshot anterior: o último snapshot salvo (versão anterior).
// O resultado é o factual que vai como contexto para a IA aperfeiçoar o comentário do humano.

export interface SnapshotMinimo {
  itensMaterial?: Array<{
    nome_popular?: string;
    nome_cientifico?: string | null;
    porte?: string;
    quantidade?: number;
    unidade?: string;
    categoria?: string;
  }>;
  totais?: {
    totalCusto?: number;
    totalVenda?: number;
    totalCliente?: number;
    margemBrutaVal?: number;
    markupMedio?: number;
  };
  // Categorias financeiras (custo de venda por bloco)
  financeiroPorCategoria?: Record<string, number>;
}

export interface DeParaResultado {
  itens_entraram: Array<{ nome_popular: string; porte?: string; quantidade: number; unidade?: string }>;
  itens_sairam: Array<{ nome_popular: string; porte?: string; quantidade: number; unidade?: string }>;
  itens_quantidade_mudou: Array<{
    nome_popular: string;
    porte?: string;
    qtd_anterior: number;
    qtd_nova: number;
    unidade?: string;
  }>;
  financeiro: Array<{ categoria: string; anterior: number; atual: number; diff: number }>;
  totais: {
    total_cliente_anterior: number;
    total_cliente_atual: number;
    margem_anterior: number;
    margem_atual: number;
  };
  vazio: boolean;
}

function itemKey(it: any): string {
  const nome = (it?.nome_cientifico || it?.nome_popular || "").toString().toLowerCase().trim();
  const porte = (it?.porte || "").toString().toLowerCase().trim();
  return `${nome}|${porte}`;
}

export function calcularDePara(anterior: SnapshotMinimo | null, atual: SnapshotMinimo): DeParaResultado {
  const a = anterior?.itensMaterial || [];
  const b = atual.itensMaterial || [];

  const mapA = new Map<string, any>();
  a.forEach((i) => mapA.set(itemKey(i), i));
  const mapB = new Map<string, any>();
  b.forEach((i) => mapB.set(itemKey(i), i));

  const entraram: DeParaResultado["itens_entraram"] = [];
  const sairam: DeParaResultado["itens_sairam"] = [];
  const mudou: DeParaResultado["itens_quantidade_mudou"] = [];

  for (const [k, it] of mapB.entries()) {
    const prev = mapA.get(k);
    if (!prev) {
      entraram.push({
        nome_popular: it.nome_popular || it.nome_cientifico || "—",
        porte: it.porte,
        quantidade: Number(it.quantidade) || 0,
        unidade: it.unidade,
      });
    } else {
      const qa = Number(prev.quantidade) || 0;
      const qb = Number(it.quantidade) || 0;
      if (qa !== qb) {
        mudou.push({
          nome_popular: it.nome_popular || it.nome_cientifico || "—",
          porte: it.porte,
          qtd_anterior: qa,
          qtd_nova: qb,
          unidade: it.unidade,
        });
      }
    }
  }
  for (const [k, it] of mapA.entries()) {
    if (!mapB.has(k)) {
      sairam.push({
        nome_popular: it.nome_popular || it.nome_cientifico || "—",
        porte: it.porte,
        quantidade: Number(it.quantidade) || 0,
        unidade: it.unidade,
      });
    }
  }

  // Financeiro por categoria
  const catsAnt = anterior?.financeiroPorCategoria || {};
  const catsAtu = atual.financeiroPorCategoria || {};
  const todasCats = new Set([...Object.keys(catsAnt), ...Object.keys(catsAtu)]);
  const financeiro = Array.from(todasCats)
    .map((c) => {
      const ant = Number(catsAnt[c] || 0);
      const atu = Number(catsAtu[c] || 0);
      return { categoria: c, anterior: ant, atual: atu, diff: atu - ant };
    })
    .filter((l) => l.anterior !== 0 || l.atual !== 0)
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));

  const totaisAtu = atual.totais || {};
  const totaisAnt = anterior?.totais || {};
  const totaisOut = {
    total_cliente_anterior: Number(totaisAnt.totalCliente || totaisAnt.totalVenda || 0),
    total_cliente_atual: Number(totaisAtu.totalCliente || totaisAtu.totalVenda || 0),
    margem_anterior: Number(totaisAnt.markupMedio || 0),
    margem_atual: Number(totaisAtu.markupMedio || 0),
  };

  const vazio =
    entraram.length === 0 &&
    sairam.length === 0 &&
    mudou.length === 0 &&
    financeiro.every((l) => l.diff === 0);

  return {
    itens_entraram: entraram,
    itens_sairam: sairam,
    itens_quantidade_mudou: mudou,
    financeiro,
    totais: totaisOut,
    vazio,
  };
}

// Próximo sufixo alfabético: '' -> 'A' -> 'B' -> ... -> 'Z' -> 'AA'
export function proximoSufixoVersao(sufixosExistentes: Array<string | null | undefined>): string {
  const arr = sufixosExistentes
    .map((s) => (s || "").toUpperCase().trim())
    .filter((s, idx, all) => all.indexOf(s) === idx);
  // Se não há nenhum registro, a primeira versão é '' (sem letra)
  if (arr.length === 0) return "";
  // Se já existe '', a próxima é 'A'
  const naoVazios = arr.filter((s) => s !== "");
  if (naoVazios.length === 0) return "A";
  // Encontra o maior sufixo (ordem lexicográfica de mesmo tamanho funciona pra A..Z; depois extensível)
  const ordenados = naoVazios.sort((x, y) => (x.length === y.length ? x.localeCompare(y) : x.length - y.length));
  const ultimo = ordenados[ordenados.length - 1];
  return incrementaSufixo(ultimo);
}

function incrementaSufixo(s: string): string {
  if (!s) return "A";
  // incrementa estilo planilha: Z -> AA, AZ -> BA, ZZ -> AAA
  const chars = s.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] !== "Z") {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.join("");
    }
    chars[i] = "A";
    i--;
  }
  return "A" + chars.join("");
}
