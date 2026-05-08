import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TipoProposta {
  id: string;
  sigla: string;
  nome_completo: string;
}

const ETAPAS = [
  "Cabeçalho",
  "Memorial",
  "Fornecedores",
  "Cotação",
  "Insumos",
  "MO e Fretes",
  "Resumo",
];

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [etapaAtual, setEtapaAtual] = useState(1);
  const [form, setForm] = useState({
    codigo: "",
    tipo_proposta_id: "",
    cliente_id: "",
    local_endereco: "",
    tipo_cliente: "",
    cidade: "",
    estado: "",
    area_m2: "",
    obs_interna: "",
    obs_proposta: "",
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-proposta"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tipos_proposta")
        .select("id, sigla, nome_completo")
        .eq("ativo", true)
        .order("sigla");
      if (error) throw error;
      return (data || []) as TipoProposta[];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orcamento } = useQuery({
    queryKey: ["orcamento", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("orcamentos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (orcamento) {
      setForm({
        codigo: orcamento.codigo || "",
        tipo_proposta_id: orcamento.tipo_proposta_id || "",
        cliente_id: orcamento.cliente_id || "",
        local_endereco: orcamento.local_endereco || "",
        tipo_cliente: orcamento.tipo_cliente || "",
        cidade: orcamento.cidade || "",
        estado: orcamento.estado || "",
        area_m2: orcamento.area_m2?.toString() || "",
        obs_interna: orcamento.obs_interna || "",
        obs_proposta: orcamento.obs_proposta || "",
      });
    }
  }, [orcamento]);

  const camposObrigatoriosOk = !!form.codigo.trim() && !!form.tipo_proposta_id;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        codigo: form.codigo.trim(),
        tipo_proposta_id: form.tipo_proposta_id || null,
        cliente_id: form.cliente_id || null,
        local_endereco: form.local_endereco || null,
        tipo_cliente: form.tipo_cliente || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
        obs_interna: form.obs_interna || null,
        obs_proposta: form.obs_proposta || null,
      };
      if (isEdit) {
        const { error } = await (supabase as any).from("orcamentos").update(payload).eq("id", id);
        if (error) throw error;
        return id as string;
      } else {
        const { data, error } = await (supabase as any)
          .from("orcamentos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      toast({ title: isEdit ? "Orçamento atualizado" : "Orçamento criado" });
      if (!isEdit) navigate(`/orcamentos/${newId}`);
    },
    onError: (e: any) => {
      toast({
        title: "Erro ao salvar",
        description: e?.message || "Verifique os campos",
        variant: "destructive",
      });
    },
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-display text-2xl text-foreground">
                {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
              </h1>
              <p className="text-sm text-muted-foreground">Etapa {etapaAtual} de {ETAPAS.length}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate("/orcamentos")}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        {/* Barra de progresso */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {ETAPAS.map((nome, idx) => {
              const numero = idx + 1;
              const ativa = numero === etapaAtual;
              const concluida = numero < etapaAtual;
              return (
                <div key={nome} className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                      ativa && "bg-primary text-primary-foreground border-primary",
                      concluida && "bg-primary/20 text-primary border-primary/40",
                      !ativa && !concluida && "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {concluida ? <Check className="w-4 h-4" /> : numero}
                  </div>
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      ativa ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {nome}
                  </span>
                  {idx < ETAPAS.length - 1 && (
                    <div className="w-6 h-px bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Etapa 1 - Cabeçalho */}
        {etapaAtual === 1 && (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-display text-xl text-foreground">Cabeçalho</h2>
              <p className="text-sm text-muted-foreground">Dados básicos do orçamento</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm((c) => ({ ...c, codigo: e.target.value }))}
                  placeholder="Ex: PI-2026-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Proposta *</Label>
                <Select
                  value={form.tipo_proposta_id}
                  onValueChange={(v) => setForm((c) => ({ ...c, tipo_proposta_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {tipos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.sigla} — {t.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={form.cliente_id}
                  onValueChange={(v) => setForm((c) => ({ ...c, cliente_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((cl: any) => (
                      <SelectItem key={cl.id} value={cl.id}>{cl.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cliente</Label>
                <Select
                  value={form.tipo_cliente}
                  onValueChange={(v) => setForm((c) => ({ ...c, tipo_cliente: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="condominio">Condomínio</SelectItem>
                    <SelectItem value="resort">Resort</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Endereço do Local</Label>
                <Input
                  value={form.local_endereco}
                  onChange={(e) => setForm((c) => ({ ...c, local_endereco: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => setForm((c) => ({ ...c, cidade: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado (UF)</Label>
                <Input
                  maxLength={2}
                  value={form.estado}
                  onChange={(e) => setForm((c) => ({ ...c, estado: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Área (m²)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.area_m2}
                  onChange={(e) => setForm((c) => ({ ...c, area_m2: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações Internas</Label>
              <Textarea
                rows={3}
                value={form.obs_interna}
                onChange={(e) => setForm((c) => ({ ...c, obs_interna: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações da Proposta</Label>
              <Textarea
                rows={3}
                value={form.obs_proposta}
                onChange={(e) => setForm((c) => ({ ...c, obs_proposta: e.target.value }))}
              />
            </div>
          </Card>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setEtapaAtual((e) => Math.max(1, e - 1))}
            disabled={etapaAtual === 1}
          >
            <ArrowLeft className="w-4 h-4" />
            Etapa anterior
          </Button>

          <div className="flex gap-2">
            {!isEdit && (
              <Button
                variant="ghost"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !camposObrigatoriosOk}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar rascunho
              </Button>
            )}
            <Button
              variant="terracota"
              onClick={() => setEtapaAtual((e) => Math.min(ETAPAS.length, e + 1))}
              disabled={!camposObrigatoriosOk || etapaAtual === ETAPAS.length}
            >
              Próxima etapa
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
