// NOTE: Em versão futura, a Mafe terá capacidade de cadastrar plantas
// via texto ou voz — o usuário descreve o item e a IA preenche os campos
// automaticamente, confirmando com o usuário antes de salvar.

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { HistoricoPrecos } from "@/components/HistoricoPrecos";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useCategoriasPlantas } from "@/hooks/useCategoriasPlantas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { capitalizeWords } from "@/hooks/useInputMasks";
import { MidiaUpload } from "@/components/MidiaUpload";
import { parsePorteMetros } from "@/lib/porte";

const UNIDADES_PLANTAS = [
  '1/2 Cuia','Bag','Bdj','Cuia','Cx','Cx com 15','Muda',
  'Pacote','Pote','Raiz Nua','Saco','Torrão','Touceira',
  'Unid','Vaso','Cuia 21','m','m²','m³',
];

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
    altura_min_m: "",
    altura_max_m: "",
    dap_cm: "",
    unidade: "",
    embalagem: "",
    nota_qualidade: "",
    preco_unitario: "",
    alerta_validacao: "",
    observacoes: "",
  });
  const [midia, setMidia] = useState<{ url: string; tipo: string; nome: string }[]>([]);

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
        altura_min_m: (plantaExistente as any).altura_min_m?.toString() ?? (plantaExistente as any).altura_m?.toString() ?? "",
        altura_max_m: (plantaExistente as any).altura_max_m?.toString() ?? (plantaExistente as any).altura_m?.toString() ?? "",
        dap_cm: plantaExistente.dap_cm?.toString() || "",
        unidade: plantaExistente.unidade || "",
        embalagem: (plantaExistente as any).embalagem || "",
        nota_qualidade: plantaExistente.nota_qualidade?.toString() || "",
        preco_unitario: plantaExistente.preco_unitario?.toString() || "",
        alerta_validacao: (plantaExistente as any).alerta_validacao || "",
        observacoes: (plantaExistente as any).observacoes || "",
      });
      setMidia((plantaExistente.midia as any) || []);
    }
  }, [plantaExistente]);

  const selectedCategoria = categorias.find((c) => c.id === formData.categoria_id);
  const isArvore = selectedCategoria?.nome.toLowerCase() === "árvores";

  // Get mercado from selected fornecedor
  const selectedFornecedor = fornecedores.find((f) => f.id === formData.fornecedor_id);
  const localizacaoFornecedor = selectedFornecedor?.mercado || null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const minM = parsePorteMetros(formData.altura_min_m).value;
      const maxM = parsePorteMetros(formData.altura_max_m).value;
      const payload = {
        nome_popular: formData.nome_popular,
        nome_cientifico: formData.nome_cientifico || null,
        categoria_id: formData.categoria_id || null,
        fornecedor_id: formData.fornecedor_id || null,
        altura_min_m: minM,
        altura_max_m: maxM,
        altura_m: minM != null && maxM != null ? (minM + maxM) / 2 : (minM ?? maxM ?? 0),
        dap_cm: isArvore && formData.dap_cm ? parseFloat(formData.dap_cm) : null,
        unidade: formData.unidade || null,
        embalagem: formData.embalagem || null,
        nota_qualidade: formData.nota_qualidade ? parseInt(formData.nota_qualidade) : null,
        preco_unitario: formData.preco_unitario ? parseFloat(formData.preco_unitario) : null,
        alerta_validacao: formData.alerta_validacao || null,
        observacoes: formData.observacoes || null,
        midia: midia as any,
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
    const minR = parsePorteMetros(formData.altura_min_m);
    const maxR = parsePorteMetros(formData.altura_max_m);
    if (!minR.ok) { toast.error("Altura mínima: " + minR.error); return; }
    if (!maxR.ok) { toast.error("Altura máxima: " + maxR.error); return; }
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

        {/* Alerta de Validação */}
        {formData.alerta_validacao && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{formData.alerta_validacao}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome_popular">Nome Popular *</Label>
              <Input
                id="nome_popular"
                value={formData.nome_popular}
                onChange={(e) => setFormData({ ...formData, nome_popular: capitalizeWords(e.target.value) })}
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
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
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
                    <SelectItem key={forn.id} value={forn.id}>{forn.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Localização do Fornecedor — somente leitura */}
            {formData.fornecedor_id && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Localização do Fornecedor</Label>
                <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                  {localizacaoFornecedor ? `📍 ${localizacaoFornecedor}` : "📍 Não informado"}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="altura_min_m">Altura mínima (m)</Label>
              <Input
                id="altura_min_m"
                inputMode="decimal"
                value={formData.altura_min_m}
                onChange={(e) => setFormData({ ...formData, altura_min_m: e.target.value })}
                placeholder="Ex: 0,40 — 1,20 — 5,00"
              />
              <p className="text-xs text-muted-foreground">Use vírgula. Sem unidade. "P14", "Pt 24", "DAP" não são aceitos.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="altura_max_m">Altura máxima (m)</Label>
              <Input
                id="altura_max_m"
                inputMode="decimal"
                value={formData.altura_max_m}
                onChange={(e) => setFormData({ ...formData, altura_max_m: e.target.value })}
                placeholder="Ex: 2,00 (igual à mínima se não houver variação)"
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
              <Select
                value={formData.unidade}
                onValueChange={(value) => setFormData({ ...formData, unidade: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES_PLANTAS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="embalagem">Embalagem</Label>
              <Input
                id="embalagem"
                value={formData.embalagem}
                onChange={(e) => setFormData({ ...formData, embalagem: e.target.value })}
                placeholder="Ex: Cuia 21, Saco 40L"
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
              <Label htmlFor="preco_unitario">Preço de Referência (R$)</Label>
              <Input
                id="preco_unitario"
                type="number"
                value={formData.preco_unitario}
                onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                placeholder="Ex: 25.00"
                min={0}
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                Valor estimado de referência. O preço real é registrado em cada cotação.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="alerta_validacao">Alerta de Validação</Label>
              <Textarea
                id="alerta_validacao"
                value={formData.alerta_validacao}
                onChange={(e) => setFormData({ ...formData, alerta_validacao: e.target.value })}
                placeholder="Aviso que será exibido no topo da ficha (ex: verificar disponibilidade antes de cotar)"
                rows={2}
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

            <div className="sm:col-span-2">
              <MidiaUpload value={midia} onChange={setMidia} folder="plantas" label="Fotos e Vídeos" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => navigate("/plantas")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>

        {isEditing && id && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground">
              Histórico de Preços
            </h2>
            <HistoricoPrecos tipo="planta" itemId={id} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
