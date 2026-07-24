import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  statusLabel,
  statusColor,
  tipoLabel,
  temperaturaLabel,
  type ProjetoPipeline,
} from "@/hooks/useProjetosPipeline";
import { cn } from "@/lib/utils";

interface Props {
  projetos: ProjetoPipeline[];
}

type SortKey = "titulo" | "tipo" | "status" | "responsavel" | "temperatura" | "retorno" | "valor";

const tempCls = (t?: string | null) =>
  t === "quente" ? "bg-primary-soft text-primary" :
  t === "morno" ? "bg-warn-soft text-warn" :
  t === "frio" ? "bg-navy-soft text-accent" : "bg-muted text-muted-foreground";

function retornoInfo(p: ProjetoPipeline) {
  const alvo = p.data_retorno_prometida ?? p.proximo_contato_em;
  if (!alvo) return { texto: "—", atrasado: false, ordem: Infinity };
  const d = new Date(alvo); d.setHours(0, 0, 0, 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((hoje.getTime() - d.getTime()) / 86400000);
  if (diff > 0) return { texto: `Atrasado ${diff}d`, atrasado: true, ordem: -diff };
  if (diff === 0) return { texto: "Hoje", atrasado: true, ordem: 0 };
  return { texto: `Em ${-diff}d`, atrasado: false, ordem: -diff };
}

function fmtMoeda(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function ProjetosLista({ projetos }: Props) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("retorno");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const arr = [...projetos];
    arr.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "titulo": av = a.titulo?.toLowerCase(); bv = b.titulo?.toLowerCase(); break;
        case "tipo": av = a.tipo; bv = b.tipo; break;
        case "status": av = a.status; bv = b.status; break;
        case "responsavel": av = a.responsavel_nome ?? "zzz"; bv = b.responsavel_nome ?? "zzz"; break;
        case "temperatura": av = a.temperatura ?? "z"; bv = b.temperatura ?? "z"; break;
        case "retorno": av = retornoInfo(a).ordem; bv = retornoInfo(b).ordem; break;
        case "valor": av = a.valor_total ?? -1; bv = b.valor_total ?? -1; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [projetos, sortKey, sortDir]);

  const toggle = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn("text-[11px] uppercase tracking-[0.12em]", className)}>
      <button
        onClick={() => toggle(k)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          sortKey === k && "text-foreground",
        )}
      >
        {children}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </button>
    </TableHead>
  );

  if (!projetos.length) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-10 text-center">
        <p className="font-serif text-[18px] text-foreground">Nada por aqui ainda</p>
        <p className="text-[13px] text-muted-foreground mt-1">Ajuste os filtros ou crie um novo projeto.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-e1">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <Th k="titulo">Projeto</Th>
            <Th k="tipo">Tipo</Th>
            <Th k="status">Status</Th>
            <TableHead className="text-[11px] uppercase tracking-[0.12em]">Substatus</TableHead>
            <Th k="responsavel">Responsável</Th>
            <Th k="temperatura">Temperatura</Th>
            <Th k="retorno">Próximo retorno</Th>
            <Th k="valor" className="text-right">Valor</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => {
            const ret = retornoInfo(p);
            const temp = temperaturaLabel(p.temperatura);
            return (
              <TableRow
                key={p.id}
                onClick={() => navigate(`/projetos/${p.id}/painel`)}
                className="cursor-pointer hover:bg-muted/40 relative"
              >
                <TableCell className="py-3 pl-4 relative">
                  <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-sm" style={{ background: statusColor(p.status) }} />
                  <div className="font-serif text-[14.5px] font-semibold text-foreground leading-tight">{p.titulo}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    {p.cliente_nome ? (
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${p.cliente_id}`); }}
                            className="hover:text-primary hover:underline underline-offset-2"
                          >
                            {p.cliente_nome}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent side="top" className="w-64">
                          <p className="font-serif font-semibold text-[14px]">{p.cliente_nome}</p>
                          <p className="text-[12px] text-muted-foreground">Abrir ficha</p>
                        </HoverCardContent>
                      </HoverCard>
                    ) : <span className="text-muted-foreground/60">sem cliente</span>}
                    {p.local_apelido && <span className="opacity-60"> · {p.local_apelido}</span>}
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary" className="bg-navy-soft text-accent border-0">{tipoLabel(p.tipo)}</Badge></TableCell>
                <TableCell><span className="text-[13px] text-foreground">{statusLabel(p.status)}</span></TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{p.substatus ?? "—"}</TableCell>
                <TableCell className="text-[13px] text-foreground">{p.responsavel_nome ?? <span className="text-muted-foreground/60">—</span>}</TableCell>
                <TableCell>
                  {temp ? (
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tempCls(p.temperatura))}>{temp}</span>
                  ) : <span className="text-muted-foreground/60">—</span>}
                </TableCell>
                <TableCell>
                  {ret.atrasado ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft text-primary px-2 py-0.5 text-[12px] font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {ret.texto}
                    </span>
                  ) : (
                    <span className="text-[12.5px] text-muted-foreground">{ret.texto}</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-[13px]">{fmtMoeda(p.valor_total)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
