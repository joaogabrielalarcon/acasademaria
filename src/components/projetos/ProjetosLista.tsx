import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, AlertTriangle, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  statusColor,
  tipoLabel,
  temperaturaLabel,
  PIPELINE_STATUS_VALUES,
  type ProjetoPipeline,
} from "@/hooks/useProjetosPipeline";
import { cn } from "@/lib/utils";

const statusOrder = (s?: string | null) => {
  const i = PIPELINE_STATUS_VALUES.indexOf((s ?? "prospeccao") as string);
  return i === -1 ? 999 : i;
};

interface Props {
  projetos: ProjetoPipeline[];
}

type SortKey = "cliente" | "tipo" | "jardim" | "temperatura" | "responsavel" | "retorno" | "entrega";

function tempDot(t?: string | null) {
  if (t === "quente") return "bg-primary";
  if (t === "morno") return "bg-warn";
  if (t === "frio") return "bg-accent";
  return "bg-muted-foreground/40";
}

function prazoInfo(alvo: string | null | undefined, prefixo: "retorno" | "entrega") {
  if (!alvo) return { texto: "—", atrasado: false, hoje: false, ordem: Infinity };
  const d = new Date(alvo); d.setHours(0, 0, 0, 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((hoje.getTime() - d.getTime()) / 86400000);
  const suffix = prefixo === "entrega" ? "a" : "o";
  if (diff > 0) return { texto: `Atrasad${suffix} ${diff}d`, atrasado: true, hoje: false, ordem: -diff };
  if (diff === 0) return { texto: "Hoje", atrasado: true, hoje: true, ordem: 0 };
  return { texto: `Em ${-diff}d`, atrasado: false, hoje: false, ordem: -diff };
}

export function ProjetosLista({ projetos }: Props) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("cliente");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    // Primeiro agrupa por status (mesma ordem do Kanban), depois aplica sort do usuário dentro do grupo.
    const arr = projetos.map((p, i) => ({ p, i }));
    arr.sort((a, b) => {
      const sa = statusOrder(a.p.status);
      const sb = statusOrder(b.p.status);
      if (sa !== sb) return sa - sb;

      let av: any, bv: any;
      switch (sortKey) {
        case "cliente": av = a.p.cliente_nome?.toLowerCase() ?? "zzz"; bv = b.p.cliente_nome?.toLowerCase() ?? "zzz"; break;
        case "tipo": av = a.p.tipo; bv = b.p.tipo; break;
        case "jardim": av = a.p.local_apelido?.toLowerCase() ?? "zzz"; bv = b.p.local_apelido?.toLowerCase() ?? "zzz"; break;
        case "temperatura": av = a.p.temperatura ?? "z"; bv = b.p.temperatura ?? "z"; break;
        case "responsavel": av = a.p.responsavel_nome?.toLowerCase() ?? "zzz"; bv = b.p.responsavel_nome?.toLowerCase() ?? "zzz"; break;
        case "retorno": av = prazoInfo(a.p.data_retorno_prometida ?? a.p.proximo_contato_em, "retorno").ordem; bv = prazoInfo(b.p.data_retorno_prometida ?? b.p.proximo_contato_em, "retorno").ordem; break;
        case "entrega": av = prazoInfo(a.p.data_prometida_cliente, "entrega").ordem; bv = prazoInfo(b.p.data_prometida_cliente, "entrega").ordem; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return a.i - b.i;
    });
    return arr.map((x) => x.p);
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
        <p className="text-[16px] font-semibold text-foreground">Nada por aqui ainda</p>
        <p className="text-[13px] text-muted-foreground mt-1">Ajuste os filtros ou crie um novo projeto.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-e1">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <Th k="cliente">Cliente / Projeto</Th>
            <Th k="tipo">Tipo</Th>
            <Th k="jardim">Jardim</Th>
            <Th k="temperatura">Temperatura</Th>
            <Th k="responsavel">Responsável</Th>
            <Th k="retorno">Retorno</Th>
            <Th k="entrega">Entrega</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => {
            const ret = prazoInfo(p.data_retorno_prometida ?? p.proximo_contato_em, "retorno");
            const ent = prazoInfo(p.data_prometida_cliente, "entrega");
            const temp = temperaturaLabel(p.temperatura);
            const iniciais = (p.responsavel_nome ?? "").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
            return (
              <TableRow
                key={p.id}
                onClick={() => navigate(`/projetos/${p.id}/painel`)}
                className="cursor-pointer hover:bg-muted/40 relative"
              >
                <TableCell className="py-3 pl-4 relative">
                  <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-sm" style={{ background: statusColor(p.status) }} />
                  {p.cliente_nome ? (
                    <HoverCard openDelay={200}>
                      <HoverCardTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${p.cliente_id}`); }}
                          className="text-[14.5px] font-semibold text-foreground leading-tight tracking-tight hover:text-primary text-left"
                        >
                          {p.cliente_nome}
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent side="top" className="w-64">
                        <p className="font-semibold text-[14px]">{p.cliente_nome}</p>
                        <p className="text-[12px] text-muted-foreground">Abrir ficha</p>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <span className="text-[13px] text-muted-foreground/70 italic">Sem cliente</span>
                  )}
                  <div className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{p.titulo}</div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-primary-soft text-primary text-[11.5px] font-medium px-2 py-0.5">
                    {tipoLabel(p.tipo)}
                  </span>
                </TableCell>
                <TableCell className="text-[13px] text-foreground">
                  {p.local_apelido ?? <span className="text-muted-foreground/60">—</span>}
                </TableCell>
                <TableCell>
                  {temp ? (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground">
                      <span className={cn("w-2 h-2 rounded-full", tempDot(p.temperatura))} />
                      {temp.toLowerCase()}
                    </span>
                  ) : <span className="text-muted-foreground/60">—</span>}
                </TableCell>
                <TableCell>
                  {p.responsavel_nome ? (
                    <div className="flex items-center gap-2">
                      <div
                        title={p.responsavel_nome}
                        className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10.5px] font-semibold flex items-center justify-center overflow-hidden ring-1 ring-border shrink-0"
                      >
                        {p.responsavel_foto ? (
                          <img src={p.responsavel_foto} alt="" className="w-full h-full object-cover" />
                        ) : iniciais || <User className="w-3 h-3" />}
                      </div>
                      <span className="text-[13px] text-foreground line-clamp-1">{p.responsavel_nome}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {ret.atrasado ? (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium tabular-nums",
                      ret.hoje ? "bg-primary-soft text-primary" : "bg-primary text-primary-foreground",
                    )}>
                      <AlertTriangle className="w-3 h-3" />
                      {ret.texto}
                    </span>
                  ) : (
                    <span className="text-[12.5px] text-muted-foreground tabular-nums">{ret.texto}</span>
                  )}
                </TableCell>
                <TableCell>
                  {ent.atrasado ? (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium tabular-nums",
                      ent.hoje ? "bg-primary-soft text-primary" : "bg-primary text-primary-foreground",
                    )}>
                      <AlertTriangle className="w-3 h-3" />
                      {ent.texto}
                    </span>
                  ) : (
                    <span className="text-[12.5px] text-muted-foreground tabular-nums">{ent.texto}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
