import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isFinite(v) ? v : 0);

interface LinhaResumo {
  categoria: string;
  custo: number;
  markup: number;
  venda: number;
  margemBruta: number;
}

interface Props {
  linhas: LinhaResumo[];
  totalCusto: number;
  totalVenda: number;
  markupMedio: number;
  margemBrutaPct: number;
  margemBrutaVal: number;
  impostoProdutos: number;
  aliquotaProdutos: number;
  onChangeAliquotaProdutos: (v: number) => void;
  aliquotaMo: number;
  valorComissao: number;
  comissaoOn: boolean;
  comissaoLabel: string;
  negociacaoValor: number;
  negociacaoProdutos: number;
  negociacaoMo: number;
  shareProdutos: number;
  shareMo: number;
  totalCliente: number;
  custoPorM2?: number;
  areaM2?: number;
  pisos: Record<string, number>;
}

/**
 * Etapa 6 — Painel mini-DRE. Mostra Receita, Custo direto por bloco,
 * Margem de contribuição, Comissão, Impostos e Resultado/Total ao cliente.
 * Alerta visualmente categorias com margem bruta abaixo do piso configurado.
 */
export function Etapa6ResumoDRE(props: Props) {
  const {
    linhas,
    totalCusto,
    totalVenda,
    markupMedio,
    margemBrutaPct,
    margemBrutaVal,
    impostoProdutos,
    aliquotaProdutos,
    onChangeAliquotaProdutos,
    aliquotaMo,
    valorComissao,
    comissaoOn,
    comissaoLabel,
    negociacaoValor,
    negociacaoProdutos,
    negociacaoMo,
    shareProdutos,
    shareMo,
    totalCliente,
    custoPorM2,
    areaM2,
    pisos,
  } = props;

  // Agrupamento mini-DRE
  const grupos = {
    "Materiais": ["Plantas", "Insumos"],
    "Mão de Obra": ["Mão de Obra"],
    "Máquinas, Fretes e Transporte": ["Fretes", "Transporte", "Máquinas"],
    "Indiretos": ["Custos Indiretos"],
  } as const;

  const linhaPor = (cat: string) => linhas.find((l) => l.categoria === cat);

  const bloco = (titulo: string, cats: readonly string[]) => {
    const itens = cats
      .map((c) => linhaPor(c))
      .filter((l): l is LinhaResumo => !!l && l.custo > 0);
    const sub = itens.reduce(
      (acc, l) => {
        acc.custo += l.custo;
        acc.venda += l.venda;
        return acc;
      },
      { custo: 0, venda: 0 },
    );
    if (itens.length === 0) return null;
    return { titulo, itens, sub };
  };

  const blocos = Object.entries(grupos)
    .map(([titulo, cats]) => bloco(titulo, cats))
    .filter((b): b is NonNullable<typeof b> => b !== null);

  // Categorias presentes não cobertas pelos grupos
  const cobertasSet = new Set<string>();
  Object.values(grupos).forEach((arr) => arr.forEach((c) => cobertasSet.add(c)));
  const outras = linhas.filter((l) => !cobertasSet.has(l.categoria) && l.custo > 0);
  if (outras.length > 0) {
    blocos.push({
      titulo: "Outros",
      itens: outras,
      sub: outras.reduce(
        (acc, l) => ({ custo: acc.custo + l.custo, venda: acc.venda + l.venda }),
        { custo: 0, venda: 0 },
      ),
    });
  }

  const margemContribuicao = totalVenda - totalCusto;
  const margemContribuicaoPct = totalVenda > 0 ? (margemContribuicao / totalVenda) * 100 : 0;
  const resultado = margemContribuicao - impostoProdutos;
  const resultadoPct = totalVenda > 0 ? (resultado / totalVenda) * 100 : 0;

  // Categorias abaixo do piso
  const alertasPiso = linhas.filter(
    (l) => pisos[l.categoria] != null && l.custo > 0 && l.margemBruta < pisos[l.categoria],
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho — uma ação principal: revisar e fechar */}
      <div>
        <h2 className="font-display text-2xl text-foreground">Resumo Final</h2>
        <p className="text-sm text-muted-foreground">
          Mini-DRE do orçamento. Revise receita, custo direto, comissão e impostos antes de enviar ao cliente.
        </p>
      </div>

      {alertasPiso.length > 0 && (
        <Card className="p-3 border-amber-500/40 bg-amber-500/5 flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Margem abaixo do piso em {alertasPiso.length} categoria(s)</p>
            <p className="text-xs text-muted-foreground">
              {alertasPiso
                .map((l) => `${l.categoria} (${l.margemBruta.toFixed(1)}% < piso ${pisos[l.categoria].toFixed(1)}%)`)
                .join(" · ")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Apenas alerta. Ajuste o markup na Etapa 4 ou o piso da categoria para silenciar.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna principal — DRE */}
        <Card className="p-5 lg:col-span-2 space-y-4">
          {/* RECEITA */}
          <DRELine
            tone="header"
            label="Receita (venda ao cliente)"
            valor={totalVenda}
          />

          {/* (-) CUSTO DIRETO POR BLOCO */}
          <div className="space-y-2 pl-3 border-l-2 border-border">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              (-) Custo direto
            </p>
            {blocos.map((b) => {
              const itensComAlerta = b.itens.filter(
                (l) => pisos[l.categoria] != null && l.margemBruta < pisos[l.categoria],
              );
              return (
                <div key={b.titulo} className="space-y-1">
                  <DRELine label={b.titulo} valor={-b.sub.custo} dense />
                  <div className="pl-4 text-xs text-muted-foreground space-y-0.5">
                    {b.itens.map((l) => {
                      const piso = pisos[l.categoria];
                      const abaixo = piso != null && l.margemBruta < piso;
                      return (
                        <div key={l.categoria} className="flex items-center justify-between">
                          <span className={abaixo ? "text-amber-600 dark:text-amber-400" : ""}>
                            {abaixo && "⚠ "}
                            {l.categoria} · venda {fmtBRL(l.venda)} · margem {l.margemBruta.toFixed(1)}%
                            {piso != null && ` (piso ${piso.toFixed(1)}%)`}
                          </span>
                          <span className="tabular-nums">{fmtBRL(-l.custo)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {itensComAlerta.length === 0 && null}
                </div>
              );
            })}
          </div>

          {/* MARGEM DE CONTRIBUIÇÃO */}
          <DRELine
            tone="subtotal"
            label="= Margem de contribuição"
            valor={margemContribuicao}
            extra={`${margemContribuicaoPct.toFixed(1)}%`}
          />

          {/* COMISSÃO (acrescida) */}
          {comissaoOn && valorComissao > 0 && (
            <DRELine
              label={`(+) ${comissaoLabel} · repassada ao cliente`}
              valor={valorComissao}
              dense
              tone="muted"
            />
          )}

          {/* NEGOCIAÇÃO DILUÍDA */}
          {negociacaoValor !== 0 && (
            <div className="space-y-1">
              <DRELine
                label={`(${negociacaoValor > 0 ? "+" : ""}) Negociação diluída`}
                valor={negociacaoValor}
                dense
                tone="muted"
              />
              <div className="pl-4 text-xs text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>→ Produtos ({(shareProdutos * 100).toFixed(1)}%)</span>
                  <span className="tabular-nums">{fmtBRL(negociacaoProdutos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>→ Mão de Obra ({(shareMo * 100).toFixed(1)}%)</span>
                  <span className="tabular-nums">{fmtBRL(negociacaoMo)}</span>
                </div>
              </div>
            </div>
          )}

          {/* IMPOSTOS */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">(-) Imposto produtos</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={aliquotaProdutos}
                  onChange={(e) => onChangeAliquotaProdutos(Number(e.target.value) || 0)}
                  className="h-7 w-20 text-right"
                  aria-label="Alíquota imposto produtos"
                />
                <span className="text-xs text-muted-foreground">% sobre plantas + insumos</span>
              </div>
              <span className="tabular-nums text-sm">{fmtBRL(-impostoProdutos)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pl-1">
              Alíquota da Mão de Obra ({aliquotaMo.toFixed(2)}%) é editada na Etapa 5 e já está embutida no valor de venda da MO.
            </p>
          </div>

          {/* RESULTADO */}
          <DRELine
            tone="result"
            label="= Resultado"
            valor={resultado}
            extra={`${resultadoPct.toFixed(1)}% da receita`}
          />
        </Card>

        {/* Coluna lateral — indicadores chave */}
        <div className="space-y-3">
          <Card className="p-4 bg-primary/10 border-primary/30">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total ao Cliente</p>
            <p className="font-display text-3xl text-primary mt-1">{fmtBRL(totalCliente)}</p>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <CardInd label="Markup médio" valor={`${markupMedio.toFixed(1)}%`} />
            <CardInd label="Margem bruta" valor={`${margemBrutaPct.toFixed(1)}%`} extra={fmtBRL(margemBrutaVal)} />
            <CardInd label="Custo total" valor={fmtBRL(totalCusto)} />
            <CardInd label="Venda" valor={fmtBRL(totalVenda)} />
            <CardInd
              label="Custo / m²"
              valor={areaM2 && areaM2 > 0 && custoPorM2 != null ? fmtBRL(custoPorM2) : "—"}
              extra={areaM2 && areaM2 > 0 ? `${areaM2} m²` : "Área não informada"}
              full
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DRELine({
  label,
  valor,
  extra,
  dense,
  tone = "default",
}: {
  label: string;
  valor: number;
  extra?: string;
  dense?: boolean;
  tone?: "default" | "header" | "subtotal" | "result" | "muted";
}) {
  const cls =
    tone === "header"
      ? "font-display text-lg text-foreground"
      : tone === "subtotal"
        ? "font-semibold text-foreground border-t pt-2"
        : tone === "result"
          ? "font-display text-xl text-primary border-t-2 border-primary/30 pt-2"
          : tone === "muted"
            ? "text-sm text-muted-foreground"
            : "text-sm text-foreground";
  return (
    <div className={`flex items-baseline justify-between ${cls} ${dense ? "py-0" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums flex items-baseline gap-2">
        {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
        <span>{fmtBRL(valor)}</span>
      </span>
    </div>
  );
}

function CardInd({
  label,
  valor,
  extra,
  full,
}: {
  label: string;
  valor: string;
  extra?: string;
  full?: boolean;
}) {
  return (
    <Card className={`p-3 ${full ? "col-span-2" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium leading-tight mt-0.5">{valor}</p>
      {extra && <p className="text-[10px] text-muted-foreground mt-0.5">{extra}</p>}
    </Card>
  );
}
