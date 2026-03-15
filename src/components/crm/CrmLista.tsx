import type { CrmCard } from "@/hooks/useCRM";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TIPO_COLORS: Record<string, string> = {
  Obra: "bg-[#1E4D3A] text-white",
  Proposta: "bg-primary text-primary-foreground",
  Manutencao: "bg-[#6A9A7A] text-white",
  Tarefa: "bg-[#C8856A] text-white",
};

const TIPO_LABELS: Record<string, string> = {
  Obra: "Obra",
  Proposta: "Proposta",
  Manutencao: "Manutenção",
  Tarefa: "Tarefa",
};

const STATUS_LABELS: Record<string, string> = {
  Lead: "Lead",
  "Proposta Enviada": "Proposta Enviada",
  Aprovado: "Aprovado",
  "Em Execucao": "Em Execução",
  Concluido: "Concluído",
  "Pos-venda": "Pós-venda",
  "Nao Aprovado": "Não Aprovado",
};

interface Props {
  cards: CrmCard[];
  onCardClick: (card: CrmCard) => void;
}

export function CrmLista({ cards, onCardClick }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Tipo</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead className="w-[110px]">Prazo</TableHead>
            <TableHead className="w-[130px]">Último contato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                Nenhum card encontrado
              </TableCell>
            </TableRow>
          ) : (
            cards.map((card) => (
              <TableRow
                key={card.id}
                className="cursor-pointer hover:bg-secondary/50"
                onClick={() => onCardClick(card)}
              >
                <TableCell>
                  <Badge className={cn("text-[10px] px-1.5 py-0", TIPO_COLORS[card.tipo])}>
                    {TIPO_LABELS[card.tipo] ?? card.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{card.titulo}</TableCell>
                <TableCell className="text-muted-foreground">{card.cliente_nome || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABELS[card.status] ?? card.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{card.responsavel_nome || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {card.prazo
                    ? new Date(card.prazo + "T12:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(card.updated_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
