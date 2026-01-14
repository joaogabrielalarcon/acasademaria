import { useState } from "react";
import { Search, Plus, UserCircle, MoreVertical, Pencil, ChevronDown } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { useColaboradores, Colaborador } from "@/hooks/useColaboradores";
import { useMaquinas } from "@/hooks/useMaquinas";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const TAMANHOS_ROUPA = ["PP", "P", "M", "G", "GG", "XG", "XXG"];
const TAMANHOS_CALCADO = ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];

export default function Equipe() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  
  // Form fields
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [area, setArea] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [maquinasIds, setMaquinasIds] = useState<string[]>([]);
  const [tamanhoCamiseta, setTamanhoCamiseta] = useState("");
  const [tamanhoCalca, setTamanhoCalca] = useState("");
  const [tamanhoCalcado, setTamanhoCalcado] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Collapsible sections
  const [enderecoOpen, setEnderecoOpen] = useState(false);
  const [uniformeOpen, setUniformeOpen] = useState(false);
  const [maquinasOpen, setMaquinasOpen] = useState(false);

  const { data: colaboradores = [], isLoading } = useColaboradores();
  const { data: maquinas = [] } = useMaquinas();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const capitalizeWords = (text: string) => {
    return text
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("colaboradores")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNome("");
    setCargo("");
    setArea("");
    setTelefone("");
    setEndereco("");
    setCidade("");
    setEstado("");
    setCep("");
    setMaquinasIds([]);
    setTamanhoCamiseta("");
    setTamanhoCalca("");
    setTamanhoCalcado("");
    setAtivo(true);
    setEnderecoOpen(false);
    setUniformeOpen(false);
    setMaquinasOpen(false);
  };

  const handleOpenNew = () => {
    setEditingColaborador(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setNome(colaborador.nome);
    setCargo(colaborador.cargo || "");
    setArea(colaborador.area || "");
    setTelefone(colaborador.telefone || "");
    setEndereco(colaborador.endereco || "");
    setCidade(colaborador.cidade || "");
    setEstado(colaborador.estado || "");
    setCep(colaborador.cep || "");
    setMaquinasIds(colaborador.maquinas_ids || []);
    setTamanhoCamiseta(colaborador.tamanho_camiseta || "");
    setTamanhoCalca(colaborador.tamanho_calca || "");
    setTamanhoCalcado(colaborador.tamanho_calcado || "");
    setAtivo(colaborador.ativo);
    setEnderecoOpen(!!colaborador.endereco || !!colaborador.cidade);
    setUniformeOpen(!!colaborador.tamanho_camiseta || !!colaborador.tamanho_calca || !!colaborador.tamanho_calcado);
    setMaquinasOpen((colaborador.maquinas_ids?.length || 0) > 0);
    setDialogOpen(true);
  };

  const handleMaquinaToggle = (maquinaId: string) => {
    setMaquinasIds(prev => 
      prev.includes(maquinaId) 
        ? prev.filter(id => id !== maquinaId)
        : [...prev, maquinaId]
    );
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o nome do colaborador.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const payload = {
      nome: capitalizeWords(nome.trim()),
      cargo: cargo.trim() ? capitalizeWords(cargo.trim()) : null,
      area: area.trim() ? capitalizeWords(area.trim()) : null,
      telefone: telefone.trim() || null,
      endereco: endereco.trim() ? capitalizeWords(endereco.trim()) : null,
      cidade: cidade.trim() ? capitalizeWords(cidade.trim()) : null,
      estado: estado || null,
      cep: cep.trim() || null,
      maquinas_ids: maquinasIds,
      tamanho_camiseta: tamanhoCamiseta || null,
      tamanho_calca: tamanhoCalca || null,
      tamanho_calcado: tamanhoCalcado || null,
      ativo,
    };

    try {
      if (editingColaborador) {
        const { error } = await supabase
          .from("colaboradores")
          .update(payload)
          .eq("id", editingColaborador.id);

        if (error) throw error;

        toast({
          title: "Colaborador atualizado",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("colaboradores")
          .insert(payload);

        if (error) throw error;

        toast({
          title: "Colaborador cadastrado",
          description: "O colaborador foi adicionado à equipe.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      setDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar colaborador:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o colaborador.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredColaboradores = colaboradores.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cargo && c.cargo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.area && c.area.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Equipe
          </h1>
          <p className="text-muted-foreground">Colaboradores do time</p>
        </div>
        <Button variant="terracota" onClick={handleOpenNew}>
          <Plus className="w-4 h-4" />
          Novo Colaborador
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, cargo ou área..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="card-botanical overflow-hidden">
        <div className="divide-y divide-primary/10">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : filteredColaboradores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchTerm
                ? "Nenhum colaborador encontrado."
                : "Nenhum colaborador cadastrado."}
            </div>
          ) : (
            filteredColaboradores.map((colaborador) => (
              <div
                key={colaborador.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">
                    {colaborador.nome}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {[colaborador.cargo, colaborador.area].filter(Boolean).join(" • ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {colaborador.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <Switch
                      checked={colaborador.ativo}
                      onCheckedChange={(checked) =>
                        toggleAtivoMutation.mutate({
                          id: colaborador.id,
                          ativo: checked,
                        })
                      }
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(colaborador)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingColaborador ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Dados Básicos */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  placeholder="Ex: Jardineiro"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Área</Label>
                <Input
                  id="area"
                  placeholder="Ex: Operações"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                maxLength={15}
              />
            </div>

            {/* Endereço - Collapsible */}
            <Collapsible open={enderecoOpen} onOpenChange={setEnderecoOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium">Endereço</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${enderecoOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    placeholder="Rua, número, complemento"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      placeholder="Cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={estado} onValueChange={setEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BRASIL.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(formatCep(e.target.value))}
                    maxLength={9}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Uniforme - Collapsible */}
            <Collapsible open={uniformeOpen} onOpenChange={setUniformeOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium">Tamanhos de Uniforme</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${uniformeOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Camiseta</Label>
                    <Select value={tamanhoCamiseta} onValueChange={setTamanhoCamiseta}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tam." />
                      </SelectTrigger>
                      <SelectContent>
                        {TAMANHOS_ROUPA.map((tam) => (
                          <SelectItem key={tam} value={tam}>
                            {tam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Calça</Label>
                    <Select value={tamanhoCalca} onValueChange={setTamanhoCalca}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tam." />
                      </SelectTrigger>
                      <SelectContent>
                        {TAMANHOS_ROUPA.map((tam) => (
                          <SelectItem key={tam} value={tam}>
                            {tam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Calçado</Label>
                    <Select value={tamanhoCalcado} onValueChange={setTamanhoCalcado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nº" />
                      </SelectTrigger>
                      <SelectContent>
                        {TAMANHOS_CALCADO.map((tam) => (
                          <SelectItem key={tam} value={tam}>
                            {tam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Máquinas - Collapsible */}
            <Collapsible open={maquinasOpen} onOpenChange={setMaquinasOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm font-medium">Máquinas que opera</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${maquinasOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {maquinas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma máquina cadastrada.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {maquinas.map((maquina) => (
                      <div key={maquina.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`maquina-${maquina.id}`}
                          checked={maquinasIds.includes(maquina.id)}
                          onCheckedChange={() => handleMaquinaToggle(maquina.id)}
                        />
                        <Label 
                          htmlFor={`maquina-${maquina.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {maquina.nome}
                          {maquina.modelo && <span className="text-muted-foreground"> ({maquina.modelo})</span>}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Status */}
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="ativo">Colaborador ativo</Label>
              <Switch
                id="ativo"
                checked={ativo}
                onCheckedChange={setAtivo}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="terracota"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
