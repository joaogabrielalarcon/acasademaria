import { Card } from "@/components/ui/card";

interface Props {
  custo: number;
  venda: number;
  margemPct: number;
  totalCliente: number;
  custoPorM2?: number;
  areaM2?: number;
  etapa: number;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isFinite(v) ? v : 0);

/**
 * Resumo corrente, fixo no topo das etapas 4/5/6, para o operador ver o
 * impacto de cada mudança em tempo real. Use os tokens semânticos do tema.
 */
export function ResumoCorrenteRail({
  custo,
  venda,
  margemPct,
  totalCliente,
  custoPorM2,
  areaM2,
  etapa,
}: Props) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border">
      <Card className="p-3 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Etapa {etapa} · resumo corrente
        </span>
        <Bloco label="Custo" valor={fmtBRL(custo)} />
        <Bloco label="Venda" valor={fmtBRL(venda)} />
        <Bloco
          label="Margem"
          valor={`${margemPct.toFixed(1)}%`}
          tone={margemPct < 0 ? "destructive" : margemPct < 10 ? "warn" : "ok"}
        />
        {areaM2 != null && areaM2 > 0 && custoPorM2 != null && (
          <Bloco label="Custo / m²" valor={fmtBRL(custoPorM2)} />
        )}
        <div className="ml-auto pl-4 border-l border-border">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total ao cliente</p>
          <p className="font-display text-lg text-primary leading-tight">{fmtBRL(totalCliente)}</p>
        </div>
      </Card>
    </div>
  );
}

function Bloco({
  label,
  valor,
  tone = "default",
}: {
  label: string;
  valor: string;
  tone?: "default" | "ok" | "warn" | "destructive";
}) {
  const toneCls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-medium leading-tight ${toneCls}`}>{valor}</p>
    </div>
  );
}
