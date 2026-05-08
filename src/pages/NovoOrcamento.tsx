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
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface TipoProposta {
  id: string;
  sigla: string;
  nome_completo: string;
}

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        return id;
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
      navigate(`/orcamentos/${newId}`);
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
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl text-foreground">
              {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
            </h1>
            <p className="text-sm text-muted-foreground">Preencha os dados básicos do orçamento</p>
          </div>
        </div>

        <Card className="p-6 space-y-4">
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
              placeholder="Notas visíveis apenas para a equipe"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações da Proposta</Label>
            <Textarea
              rows={3}
              value={form.obs_proposta}
              onChange={(e) => setForm((c) => ({ ...c, obs_proposta: e.target.value }))}
              placeholder="Texto que aparecerá na proposta enviada ao cliente"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => navigate("/orcamentos")}>
              Cancelar
            </Button>
            <Button
              variant="terracota"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.codigo.trim() || !form.tipo_proposta_id}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? "Salvar" : "Criar Orçamento"}
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
