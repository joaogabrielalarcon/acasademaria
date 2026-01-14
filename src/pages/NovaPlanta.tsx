import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft } from "lucide-react";
import { useCategoriasPlantas } from "@/hooks/useCategoriasPlantas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function NovaPlanta() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();

  const { data: categorias = [] } = useCategoriasPlantas();
  const { data: fornecedores = [] } = useFornecedores();

  const [formData, setFormData] = useState({
    nome_popular: "",
    nome_cientifico: "",
    categoria_id: "",
    fornecedor_id: "",
    porte: "",
    altura_cm: "",
    dap_cm: "",
    unidade: "",
    nota_qualidade: "",
    preco_unitario: "",
    observacoes: "",
  });

  // Fetch existing plant data if editing
  const { data: plantaExistente } = useQuery({
    queryKey: ["planta", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("plantas")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (plantaExistente) {
      setFormData({
        nome_popular: plantaExistente.nome_popular,
        nome_cientifico: plantaExistente.nome_cientifico || "",
        categoria_id: plantaExistente.categoria_id || "",
        fornecedor_id: plantaExistente.fornecedor_id || "",
        porte: plantaExistente.porte || "",
        altura_cm: plantaExistente.altura_cm?.toString() || "",
        dap_cm: plantaExistente.dap_cm?.toString() || "",
        unidade: plantaExistente.unidade || "",
        nota_qualidade: plantaExistente.nota_qualidade?.toString() || "",
        preco_unitario: plantaExistente.preco_unitario?.toString() || "",
        observacoes: plantaExistente.observacoes || "",
      });
    }
  }, [plantaExistente]);

  const selectedCategoria = categorias.find((c) => c.id === formData.categoria_id);
  const isArvore = selectedCategoria?.nome.toLowerCase() === "árvore";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome_popular: formData.nome_popular,
        nome_cientifico: formData.nome_cientifico || null,
        categoria_id: formData.categoria_id || null,
        fornecedor_id: formData.fornecedor_id || null,
        porte: formData.porte || null,
        altura_cm: formData.altura_cm ? parseFloat(formData.altura_cm) : null,
        dap_cm: isArvore && formData.dap_cm ? parseFloat(formData.dap_cm) : null,
        unidade: formData.unidade || null,
        nota_qualidade: formData.nota_qualidade ? parseInt(formData.nota_qualidade) : null,
        preco_unitario: formData.preco_unitario ? parseFloat(formData.preco_unitario) : null,
        observacoes: formData.observacoes || null,
      };

      if (isEditing && id) {
        const { error } = await supabase.from("plantas").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plantas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantas"] });
      toast.success(isEditing ? "Planta atualizada!" : "Planta cadastrada!");
      navigate("/plantas");
    },
    onError: (error) => {
      toast.error("Erro ao salvar planta: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_popular.trim()) {
      toast.error("Nome popular é obrigatório");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/plantas")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              {isEditing ? "Editar Planta" : "Nova Planta"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Atualize os dados da planta" : "Cadastre uma nova planta no sistema"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-botanical p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome_popular">Nome Popular *</Label>
              <Input
                id="nome_popular"
                value={formData.nome_popular}
                onChange={(e) => setFormData({ ...formData, nome_popular: e.target.value })}
                placeholder="Ex: Ipê Amarelo"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome_cientifico">Nome Científico</Label>
              <Input
                id="nome_cientifico"
                value={formData.nome_cientifico}
                onChange={(e) => setFormData({ ...formData, nome_cientifico: e.target.value })}
                placeholder="Ex: Handroanthus albus"
                className="italic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria_id}
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Select
                value={formData.fornecedor_id}
                onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((forn) => (
                    <SelectItem key={forn.id} value={forn.id}>
                      {forn.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="porte">Porte</Label>
              <Input
                id="porte"
                value={formData.porte}
                onChange={(e) => setFormData({ ...formData, porte: e.target.value })}
                placeholder="Ex: Pequeno, Médio, Grande"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="altura_cm">Altura (cm)</Label>
              <Input
                id="altura_cm"
                type="number"
                value={formData.altura_cm}
                onChange={(e) => setFormData({ ...formData, altura_cm: e.target.value })}
                placeholder="Ex: 150"
                min={0}
                step="0.01"
              />
            </div>

            {isArvore && (
              <div className="space-y-2">
                <Label htmlFor="dap_cm">DAP (cm)</Label>
                <Input
                  id="dap_cm"
                  type="number"
                  value={formData.dap_cm}
                  onChange={(e) => setFormData({ ...formData, dap_cm: e.target.value })}
                  placeholder="Diâmetro à Altura do Peito"
                  min={0}
                  step="0.01"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                value={formData.unidade}
                onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                placeholder="Ex: Muda, Caixaria, Pote"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nota_qualidade">Nota de Qualidade (1-5)</Label>
              <Select
                value={formData.nota_qualidade}
                onValueChange={(value) => setFormData({ ...formData, nota_qualidade: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Ruim</SelectItem>
                  <SelectItem value="2">2 - Regular</SelectItem>
                  <SelectItem value="3">3 - Bom</SelectItem>
                  <SelectItem value="4">4 - Muito Bom</SelectItem>
                  <SelectItem value="5">5 - Excelente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preco_unitario">Preço Unitário (R$)</Label>
              <Input
                id="preco_unitario"
                type="number"
                value={formData.preco_unitario}
                onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                placeholder="Ex: 25.00"
                min={0}
                step="0.01"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações sobre a planta"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => navigate("/plantas")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
