import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth, useProfile, useHasAnyRole, useIsAdmin } from "@/hooks/useAuth";
import { Plus, ShoppingCart, Check, X, Trash2, ExternalLink, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Urgencia = "baixa" | "media" | "alta" | "urgente";
type Status = "pendente" | "aprovada" | "recusada" | "comprada";

interface Solicitacao {
  id: string;
  solicitante_id: string | null;
  solicitante_nome: string;
  motivo: string;
  link_ou_contato: string | null;
  valor_estimado: number | null;
  condicao_pagamento: string | null;
  urgencia: Urgencia;
  data_solicitacao: string;
  status: Status;
  motivo_recusa: string | null;
  decidido_por_nome: string | null;
  decidido_em: string | null;
  observacoes: string | null;
  created_at: string;
}

const URGENCIA_LABELS: Record<Urgencia, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const URGENCIA_CLASSES: Record<Urgencia, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  media: "bg-amber-50 text-amber-800 border-amber-200",
  alta: "bg-orange-100 text-orange-900 border-orange-300",
  urgente: "bg-primary/15 text-primary border-primary/40",
};

const STATUS_LABELS: Record<Status, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  recusada: "Recusada",
  comprada: "Comprada",
};

const STATUS_CLASSES: Record<Status, string> = {
  pendente: "bg-amber-50 text-amber-800 border-amber-200",
  aprovada: "bg-primary/10 text-primary border-primary/30",
  recusada: "bg-muted text-muted-foreground border-border",
  comprada: "bg-secondary text-secondary-foreground border-border",
};

const formatCurrency = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SolicitacoesCompras() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const isAdmin = useIsAdmin(user?.id);
  const canApprove = useHasAnyRole(user?.id, ["admin", "administrativo"]);
  const canCreate = useHasAnyRole(user?.id, [
    "admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra",
  ]);

  const qc = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState<Status | "todas">("todas");
  const [novaOpen, setNovaOpen] = useState(false);
  const [recusaModal, setRecusaModal] = useState<{ open: boolean; id: string | null; motivo: string }>({
    open: false, id: null, motivo: "",
  });

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ["solicitacoes_compras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes_compras")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Solicitacao[];
    },
  });

  const filtradas = useMemo(
    () => filtroStatus === "todas" ? solicitacoes : solicitacoes.filter(s => s.status === filtroStatus),
    [solicitacoes, filtroStatus]
  );

  const kpis = useMemo(() => ({
    total: solicitacoes.length,
    pendentes: solicitacoes.filter(s => s.status === "pendente").length,
    aprovadas: solicitacoes.filter(s => s.status === "aprovada").length,
    urgentes: solicitacoes.filter(s => s.status === "pendente" && s.urgencia === "urgente").length,
  }), [solicitacoes]);

  // === Form state ===
  const [form, setForm] = useState({
    motivo: "",
    link_ou_contato: "",
    valor_estimado: "",
    condicao_pagamento: "",
    urgencia: "media" as Urgencia,
    data_solicitacao: format(new Date(), "yyyy-MM-dd"),
  });

  const resetForm = () => setForm({
    motivo: "", link_ou_contato: "", valor_estimado: "",
    condicao_pagamento: "", urgencia: "media",
    data_solicitacao: format(new Date(), "yyyy-MM-dd"),
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      if (!form.motivo.trim()) throw new Error("Informe o motivo da solicitação");
      const valor = form.valor_estimado ? Number(form.valor_estimado.replace(",", ".")) : null;
      const { error } = await supabase.from("solicitacoes_compras").insert({
        solicitante_id: user.id,
        solicitante_nome: profile?.nome || user.email || "Colaborador",
        motivo: form.motivo.trim(),
        link_ou_contato: form.link_ou_contato.trim() || null,
        valor_estimado: valor,
        condicao_pagamento: form.condicao_pagamento.trim() || null,
        urgencia: form.urgencia,
        data_solicitacao: form.data_solicitacao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada para aprovação");
      qc.invalidateQueries({ queryKey: ["solicitacoes_compras"] });
      setNovaOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decidir = useMutation({
    mutationFn: async (vars: { id: string; status: Status; motivo_recusa?: string }) => {
      const { error } = await supabase.from("solicitacoes_compras").update({
        status: vars.status,
        motivo_recusa: vars.motivo_recusa || null,
        decidido_por: user?.id,
        decidido_por_nome: profile?.nome || user?.email,
        decidido_em: new Date().toISOString(),
      }).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_compras"] });
      toast.success("Solicitação atualizada");
      setRecusaModal({ open: false, id: null, motivo: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("solicitacoes_compras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_compras"] });
      toast.success("Solicitação excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl text-foreground flex items-center gap-3">
              <ShoppingCart className="h-7 w-7 text-primary" />
              Solicitações de Compras
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Solicite compras e acompanhe a aprovação da diretoria
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setNovaOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nova solicitação
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
            <div className="text-2xl font-serif text-foreground mt-1">{kpis.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</div>
            <div className="text-2xl font-serif text-amber-700 mt-1">{kpis.pendentes}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Aprovadas</div>
            <div className="text-2xl font-serif text-primary mt-1">{kpis.aprovadas}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Urgentes pend.</div>
            <div className="text-2xl font-serif text-primary mt-1">{kpis.urgentes}</div>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as Status | "todas")}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovada">Aprovadas</SelectItem>
              <SelectItem value="recusada">Recusadas</SelectItem>
              <SelectItem value="comprada">Compradas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtradas.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Nenhuma solicitação encontrada.
          </Card>
        ) : (
          <div className="space-y-3">
            {filtradas.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="outline" className={STATUS_CLASSES[s.status]}>
                        {STATUS_LABELS[s.status]}
                      </Badge>
                      <Badge variant="outline" className={URGENCIA_CLASSES[s.urgencia]}>
                        {URGENCIA_LABELS[s.urgencia]}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(s.data_solicitacao + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-foreground mb-1">{s.solicitante_nome}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{s.motivo}</div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                      <div>
                        <div className="text-muted-foreground uppercase tracking-wide">Valor estimado</div>
                        <div className="text-foreground font-medium">{formatCurrency(s.valor_estimado)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground uppercase tracking-wide">Condição</div>
                        <div className="text-foreground">{s.condicao_pagamento || "—"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-muted-foreground uppercase tracking-wide">Link / Contato</div>
                        {s.link_ou_contato ? (
                          /^https?:\/\//i.test(s.link_ou_contato) ? (
                            <a href={s.link_ou_contato} target="_blank" rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-full">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{s.link_ou_contato}</span>
                            </a>
                          ) : (
                            <div className="text-foreground truncate">{s.link_ou_contato}</div>
                          )
                        ) : <div className="text-foreground">—</div>}
                      </div>
                    </div>

                    {s.status === "recusada" && s.motivo_recusa && (
                      <div className="mt-3 p-2 rounded bg-muted/60 text-xs">
                        <span className="font-medium text-foreground">Motivo da recusa: </span>
                        <span className="text-muted-foreground">{s.motivo_recusa}</span>
                      </div>
                    )}
                    {s.decidido_por_nome && s.decidido_em && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {s.status === "aprovada" ? "Aprovado" : s.status === "recusada" ? "Recusado" : "Decidido"} por {s.decidido_por_nome} em{" "}
                        {format(new Date(s.decidido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {canApprove && s.status === "pendente" && (
                      <>
                        <Button size="sm" onClick={() => decidir.mutate({ id: s.id, status: "aprovada" })}
                          disabled={decidir.isPending} className="gap-1">
                          <Check className="h-4 w-4" /> Aprovar
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => setRecusaModal({ open: true, id: s.id, motivo: "" })}
                          className="gap-1">
                          <X className="h-4 w-4" /> Recusar
                        </Button>
                      </>
                    )}
                    {canApprove && s.status === "aprovada" && (
                      <Button size="sm" variant="outline"
                        onClick={() => decidir.mutate({ id: s.id, status: "comprada" })}
                        disabled={decidir.isPending}>
                        Marcar comprada
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="sm" variant="ghost"
                        onClick={() => { if (confirm("Excluir solicitação?")) excluir.mutate(s.id); }}
                        className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Nova solicitação */}
      <Dialog open={novaOpen} onOpenChange={(o) => { setNovaOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Nova solicitação de compra</DialogTitle>
            <DialogDescription>Será enviada para aprovação da diretoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Solicitante</Label>
              <Input value={profile?.nome || user?.email || ""} disabled />
            </div>
            <div>
              <Label>Motivo da solicitação *</Label>
              <Textarea
                value={form.motivo} rows={3}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Por que essa compra é necessária?"
              />
            </div>
            <div>
              <Label>Link de compra ou contato do fornecedor</Label>
              <Input
                value={form.link_ou_contato}
                onChange={(e) => setForm({ ...form, link_ou_contato: e.target.value })}
                placeholder="https://... ou nome/telefone do fornecedor"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor estimado (R$)</Label>
                <Input
                  type="text" inputMode="decimal"
                  value={form.valor_estimado}
                  onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Condição de pagamento</Label>
                <Input
                  value={form.condicao_pagamento}
                  onChange={(e) => setForm({ ...form, condicao_pagamento: e.target.value })}
                  placeholder="Ex: à vista, 30 dias, 3x"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Urgência</Label>
                <Select value={form.urgencia} onValueChange={(v) => setForm({ ...form, urgencia: v as Urgencia })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data da solicitação</Label>
                <Input
                  type="date"
                  value={form.data_solicitacao}
                  onChange={(e) => setForm({ ...form, data_solicitacao: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button onClick={() => criar.mutate()} disabled={criar.isPending || !form.motivo.trim()}>
              {criar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar para aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recusar */}
      <Dialog open={recusaModal.open} onOpenChange={(o) => setRecusaModal({ ...recusaModal, open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Recusar solicitação</DialogTitle>
            <DialogDescription>Informe o motivo da recusa para registro.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={recusaModal.motivo}
            onChange={(e) => setRecusaModal({ ...recusaModal, motivo: e.target.value })}
            placeholder="Ex: orçamento muito acima do mercado, item não prioritário..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecusaModal({ open: false, id: null, motivo: "" })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!recusaModal.motivo.trim() || decidir.isPending}
              onClick={() => decidir.mutate({
                id: recusaModal.id!, status: "recusada", motivo_recusa: recusaModal.motivo.trim(),
              })}
            >
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
