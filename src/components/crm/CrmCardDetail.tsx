import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Phone,
  Mail,
  CalendarDays,
  User,
  Plus,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  type CrmCard,
  type CrmCardStatus,
  useUpdateCrmCard,
  useCrmHistorico,
  useCrmFollowups,
  useAddCrmHistorico,
  useCreateCrmFollowup,
  useUpdateCrmFollowup,
} from "@/hooks/useCRM";

const ALL_STATUSES: CrmCardStatus[] = [
  "Lead",
  "Proposta Enviada",
  "Aprovado",
  "Em Execucao",
  "Concluido",
  "Pos-venda",
  "Nao Aprovado",
];

const STATUS_LABELS: Record<string, string> = {
  Lead: "Lead",
  "Proposta Enviada": "Proposta Enviada",
  Aprovado: "Aprovado",
  "Em Execucao": "Em Execução",
  Concluido: "Concluído",
  "Pos-venda": "Pós-venda",
  "Nao Aprovado": "Não Aprovado",
};

const TIPO_COLORS: Record<string, string> = {
  Obra: "bg-primary/80 text-primary-foreground",
  Proposta: "bg-primary text-primary-foreground",
  Manutencao: "bg-primary/50 text-primary-foreground",
  Tarefa: "bg-primary/30 text-foreground",
};

const TIPO_LABELS: Record<string, string> = {
  Obra: "Obra",
  Proposta: "Proposta",
  Manutencao: "Manutenção",
  Tarefa: "Tarefa",
};

interface Props {
  card: CrmCard;
  open: boolean;
  onClose: () => void;
}

export function CrmCardDetail({ card, open, onClose }: Props) {
  const navigate = useNavigate();
  const updateCard = useUpdateCrmCard();
  const addHistorico = useAddCrmHistorico();
  const { data: historico = [] } = useCrmHistorico(card.id);
  const { data: followups = [] } = useCrmFollowups(card.id);
  const createFollowup = useCreateCrmFollowup();
  const updateFollowup = useUpdateCrmFollowup();

  const [newUpdate, setNewUpdate] = useState("");
  const [newFollowupDate, setNewFollowupDate] = useState("");
  const [newFollowupDias, setNewFollowupDias] = useState("3");

  const handleStatusChange = async (newStatus: string) => {
    const oldStatus = card.status;
    await updateCard.mutateAsync({ id: card.id, status: newStatus as CrmCardStatus });
    await addHistorico.mutateAsync({
      card_id: card.id,
      descricao: `Status alterado de "${STATUS_LABELS[oldStatus]}" para "${STATUS_LABELS[newStatus]}"`,
    });

    if (newStatus === "Aprovado") {
      toast({
        title: "Card aprovado!",
        description: "Deseja criar um Projeto para esta obra?",
        action: (
          <Button
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/projetos/novo${card.cliente_id ? `?cliente=${card.cliente_id}` : ""}`);
            }}
          >
            Criar Projeto
          </Button>
        ),
      });
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;
    await addHistorico.mutateAsync({ card_id: card.id, descricao: newUpdate.trim() });
    setNewUpdate("");
  };

  const handleAddFollowup = async () => {
    if (!newFollowupDate) return;
    await createFollowup.mutateAsync({
      card_id: card.id,
      data_retorno: newFollowupDate,
      dias_alerta: parseInt(newFollowupDias) || 3,
    });
    setNewFollowupDate("");
    setNewFollowupDias("3");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", TIPO_COLORS[card.tipo])}>
              {TIPO_LABELS[card.tipo]}
            </Badge>
            <SheetTitle className="text-lg font-serif">{card.titulo}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 mt-4">
          {/* Status */}
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={card.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Cliente</span>
              <p className="font-medium">{card.cliente_nome || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Responsável</span>
              <p className="font-medium flex items-center gap-1">
                <User className="w-3 h-3" /> {card.responsavel_nome || "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Prazo</span>
              <p className="font-medium flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {card.prazo
                  ? new Date(card.prazo + "T12:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
          </div>

          {/* Contato */}
          {(card.contato_nome || card.contato_whatsapp || card.contato_email) && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">PONTO DE CONTATO</h4>
                <div className="space-y-1 text-sm">
                  {card.contato_nome && (
                    <p>
                      {card.contato_nome}
                      {card.contato_cargo && (
                        <span className="text-muted-foreground"> · {card.contato_cargo}</span>
                      )}
                    </p>
                  )}
                  {card.contato_whatsapp && (
                    <a
                      href={`https://wa.me/${card.contato_whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="w-3 h-3" /> {card.contato_whatsapp}
                    </a>
                  )}
                  {card.contato_email && (
                    <a
                      href={`mailto:${card.contato_email}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Mail className="w-3 h-3" /> {card.contato_email}
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Observações */}
          {card.observacoes && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">OBSERVAÇÕES</h4>
                <p className="text-sm whitespace-pre-wrap">{card.observacoes}</p>
              </div>
            </>
          )}

          {/* Follow-ups */}
          <Separator />
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">FOLLOW-UPS</h4>
            <div className="space-y-2 mb-3">
              {followups.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{new Date(f.data_retorno + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                    {f.observacao && (
                      <span className="text-muted-foreground text-xs">· {f.observacao}</span>
                    )}
                  </div>
                  <Select
                    value={f.status}
                    onValueChange={(v) =>
                      updateFollowup.mutate({ id: f.id, card_id: card.id, status: v as any })
                    }
                  >
                    <SelectTrigger className="h-7 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Feito">Feito</SelectItem>
                      <SelectItem value="Adiado">Adiado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Data retorno</Label>
                <Input
                  type="date"
                  value={newFollowupDate}
                  onChange={(e) => setNewFollowupDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="w-20">
                <Label className="text-xs">Dias alerta</Label>
                <Input
                  type="number"
                  value={newFollowupDias}
                  onChange={(e) => setNewFollowupDias(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddFollowup}
                disabled={!newFollowupDate}
                className="h-8"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <Separator />
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">HISTÓRICO</h4>
            <div className="flex gap-2 mb-3">
              <Textarea
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Adicionar atualização..."
                className="text-sm min-h-[60px]"
              />
              <Button
                size="sm"
                onClick={handleAddUpdate}
                disabled={!newUpdate.trim()}
                className="self-end h-8"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-3">
              {historico.map((h) => (
                <div key={h.id} className="flex gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <p className="text-foreground">{h.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.colaborador_nome && `${h.colaborador_nome} · `}
                      {new Date(h.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
