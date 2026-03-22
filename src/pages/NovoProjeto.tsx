import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProjeto } from "@/hooks/useProjetos";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function NovoProjeto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const { data: projeto, isLoading: loadingProjeto } = useProjeto(id);

  const [form, setForm] = useState({
    cliente_id: "",
    local_id: "",
    titulo: "",
    descricao: "",
    tipo: "implantacao",
    observacoes: "",
  });

  useEffect(() => {
    if (projeto) {
      setForm({
        cliente_id: projeto.cliente_id,
        local_id: (projeto as any).local_id || "",
        titulo: projeto.titulo,
        descricao: projeto.descricao || "",
        tipo: (projeto as any).tipo || "implantacao",
        observacoes: projeto.observacoes || "",
      });
    }
  }, [projeto]);

  useEffect(() => {
    if (!isEditing) {
      const params = new URLSearchParams(window.location.search);
      const clienteId = params.get("cliente_id");
      const localId = params.get("local_id");
      if (clienteId) setForm(f => ({ ...f, cliente_id: clienteId }));
      if (localId) setForm(f => ({ ...f, local_id: localId }));
    }
  }, [isEditing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        cliente_id: form.cliente_id,
        local_id: form.local_id || null,
        titulo: form.titulo,
        descricao: form.descricao || null,
        tipo: form.tipo,
        observacoes: form.observacoes || null,
      };

      if (isEditing) {
        const { error } = await supabase.from("projetos").update(payload as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projetos").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      toast({ title: isEditing ? "Projeto atualizado" : "Projeto criado" });
      navigate(form.cliente_id ? `/clientes/${form.cliente_id}?tab=projetos` : "/");
    },
    onError: () => {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id || !form.titulo || !form.descricao.trim()) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  if (isEditing && loadingProjeto) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Link
        to={form.cliente_id ? `/clientes/${form.cliente_id}?tab=projetos` : "/"}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar</span>
      </Link>

      <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-6">
        {isEditing ? "Editar Projeto" : "Novo Projeto"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Número da proposta"
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição *</Label>
          <Textarea
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Detalhes do projeto..."
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de Projeto</Label>
          <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="implantacao">Implantação</SelectItem>
              <SelectItem value="manutencao">Manutenção</SelectItem>
              <SelectItem value="revitalizacao">Revitalização</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={form.observacoes}
            onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            rows={3}
          />
        </div>

        <Button type="submit" variant="terracota" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {isEditing ? "Salvar Alterações" : "Criar Projeto"}
        </Button>
      </form>
    </AppLayout>
  );
}
