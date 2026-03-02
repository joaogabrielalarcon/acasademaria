import { useState } from "react";
import { Search, Plus, UserCircle, MoreVertical, Pencil, ChevronDown, Package, Trash2, Calendar, Key, RefreshCw } from "lucide-react";
import { useAuth, useIsManager, useIsAdmin } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useColaboradores, Colaborador } from "@/hooks/useColaboradores";
import { useMaquinas } from "@/hooks/useMaquinas";
import { useInsumos } from "@/hooks/useInsumos";
import { useAreas } from "@/hooks/useAreas";
import { useEntregasColaborador, useCreateEntrega, useDeleteEntrega } from "@/hooks/useEntregasColaborador";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCPF, formatCEP, formatPhone, capitalizeWords } from "@/hooks/useInputMasks";
import { ImageUpload } from "@/components/ImageUpload";

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
  
  // Dialog de entregas
  const [entregasDialogOpen, setEntregasDialogOpen] = useState(false);
  const [selectedColaboradorEntrega, setSelectedColaboradorEntrega] = useState<Colaborador | null>(null);
  const [entregaInsumoId, setEntregaInsumoId] = useState("");
  const [entregaQuantidade, setEntregaQuantidade] = useState("1");
  const [entregaData, setEntregaData] = useState<Date>(new Date());
  const [entregaObservacao, setEntregaObservacao] = useState("");
  const [entregaToDelete, setEntregaToDelete] = useState<{ id: string; colaboradorId: string } | null>(null);
  
  // Form fields
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState<Date | undefined>(undefined);
  const [cargo, setCargo] = useState("");
  const [subEquipe, setSubEquipe] = useState("");
  const [areaId, setAreaId] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [maquinasIds, setMaquinasIds] = useState<string[]>([]);
  const [tamanhoCamiseta, setTamanhoCamiseta] = useState("");
  const [tamanhoCalca, setTamanhoCalca] = useState("");
  const [tamanhoCalcado, setTamanhoCalcado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Campos de acesso ao sistema
  const [acessoOpen, setAcessoOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [emailAcesso, setEmailAcesso] = useState("");
  const [senhaInicial, setSenhaInicial] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [novaSenhaReset, setNovaSenhaReset] = useState("");
  
  // Collapsible sections
  const [enderecoOpen, setEnderecoOpen] = useState(false);
  const [uniformeOpen, setUniformeOpen] = useState(false);
  const [maquinasOpen, setMaquinasOpen] = useState(false);

  const { user } = useAuth();
  const canManageUsers = useIsManager(user?.id);
  const isAdmin = useIsAdmin(user?.id);
  const [colaboradorToDelete, setColaboradorToDelete] = useState<Colaborador | null>(null);
  
  const { data: colaboradores = [], isLoading } = useColaboradores();
  const { data: maquinas = [] } = useMaquinas();
  const { data: insumos = [] } = useInsumos();
  const { data: areas = [] } = useAreas();
  const { data: entregas = [], isLoading: isLoadingEntregas } = useEntregasColaborador(selectedColaboradorEntrega?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Criar mapa de áreas para exibir nome
  const areasMap = new Map(areas.map(a => [a.id, a]));
  
  const createEntregaMutation = useCreateEntrega();
  const deleteEntregaMutation = useDeleteEntrega();

  // Usando as funções de formatação do useInputMasks

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

  const deleteColaboradorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("colaboradores")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      toast({
        title: "Colaborador excluído",
        description: "O cadastro foi removido permanentemente.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o colaborador.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNome("");
    setCpf("");
    setDataNascimento(undefined);
    setCargo("");
    setSubEquipe("");
    setAreaId("");
    setTelefone("");
    setEndereco("");
    setCidade("");
    setEstado("");
    setCep("");
    setMaquinasIds([]);
    setTamanhoCamiseta("");
    setTamanhoCalca("");
    setTamanhoCalcado("");
    setObservacoes("");
    setAtivo(true);
    setFotoUrl(null);
    setUsername("");
    setEmailAcesso("");
    setSenhaInicial("");
    setNovaSenhaReset("");
    setEnderecoOpen(false);
    setUniformeOpen(false);
    setMaquinasOpen(false);
    setAcessoOpen(false);
  };

  const handleOpenNew = () => {
    setEditingColaborador(null);
    resetForm();
    setAcessoOpen(true); // Abrir seção de acesso por padrão em novos cadastros
    setDialogOpen(true);
  };

  const handleEdit = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setNome(colaborador.nome);
    setCpf(colaborador.cpf || "");
    setDataNascimento(colaborador.data_nascimento ? new Date(colaborador.data_nascimento + "T00:00:00") : undefined);
    setCargo(colaborador.cargo || "");
    setSubEquipe(colaborador.sub_equipe || "");
    setAreaId(colaborador.area_id || "");
    setTelefone(colaborador.telefone || "");
    setEndereco(colaborador.endereco || "");
    setCidade(colaborador.cidade || "");
    setEstado(colaborador.estado || "");
    setCep(colaborador.cep || "");
    setMaquinasIds(colaborador.maquinas_ids || []);
    setTamanhoCamiseta(colaborador.tamanho_camiseta || "");
    setTamanhoCalca(colaborador.tamanho_calca || "");
    setTamanhoCalcado(colaborador.tamanho_calcado || "");
    setObservacoes(colaborador.observacoes || "");
    setAtivo(colaborador.ativo);
    setFotoUrl(colaborador.foto_url || null);
    setUsername(colaborador.username || "");
    setEmailAcesso(colaborador.email || "");
    setSenhaInicial("");
    setNovaSenhaReset("");
    setEnderecoOpen(!!colaborador.endereco || !!colaborador.cidade);
    setUniformeOpen(!!colaborador.tamanho_camiseta || !!colaborador.tamanho_calca || !!colaborador.tamanho_calcado);
    setMaquinasOpen((colaborador.maquinas_ids?.length || 0) > 0);
    setAcessoOpen(!!colaborador.user_id);
    setDialogOpen(true);
  };

  const handleCreateUserAccess = async () => {
    if (!editingColaborador) return;
    
    if (!username.trim() || !emailAcesso.trim() || !senhaInicial.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha usuário, email e senha inicial.",
        variant: "destructive",
      });
      return;
    }

    if (senhaInicial.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: emailAcesso.toLowerCase(),
          password: senhaInicial,
          username: username.toLowerCase(),
          colaboradorId: editingColaborador.id,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erro ao criar acesso");
      }

      toast({
        title: "Acesso criado!",
        description: `O colaborador ${editingColaborador.nome} agora pode acessar o sistema.`,
      });

      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      setSenhaInicial("");
    } catch (error: any) {
      toast({
        title: "Erro ao criar acesso",
        description: error.message || "Não foi possível criar o acesso.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingColaborador || !editingColaborador.user_id) return;

    if (!novaSenhaReset.trim() || novaSenhaReset.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: {
          userId: editingColaborador.user_id,
          newPassword: novaSenhaReset,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erro ao resetar senha");
      }

      toast({
        title: "Senha resetada!",
        description: "A nova senha foi definida com sucesso.",
      });

      setNovaSenhaReset("");
    } catch (error: any) {
      toast({
        title: "Erro ao resetar senha",
        description: error.message || "Não foi possível resetar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
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

    // Para novos colaboradores, acesso é obrigatório
    if (!editingColaborador && canManageUsers) {
      if (!username.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "Informe o nome de usuário para acesso ao sistema.",
          variant: "destructive",
        });
        setAcessoOpen(true);
        return;
      }
      if (!emailAcesso.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "Informe o email para acesso ao sistema.",
          variant: "destructive",
        });
        setAcessoOpen(true);
        return;
      }
      if (!senhaInicial.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "Informe a senha inicial para acesso ao sistema.",
          variant: "destructive",
        });
        setAcessoOpen(true);
        return;
      }
      if (senhaInicial.length < 6) {
        toast({
          title: "Senha muito curta",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        setAcessoOpen(true);
        return;
      }
    }

    const shouldCreateAccess = canManageUsers && !editingColaborador && username.trim() && emailAcesso.trim() && senhaInicial.trim();

    setIsSaving(true);

    const payload = {
      nome: capitalizeWords(nome.trim()),
      cpf: cpf.trim() || null,
      data_nascimento: dataNascimento ? format(dataNascimento, "yyyy-MM-dd") : null,
      cargo: cargo.trim() ? capitalizeWords(cargo.trim()) : null,
      sub_equipe: subEquipe || null,
      area_id: areaId || null,
      telefone: telefone.trim() || null,
      endereco: endereco.trim() ? capitalizeWords(endereco.trim()) : null,
      cidade: cidade.trim() ? capitalizeWords(cidade.trim()) : null,
      estado: estado || null,
      cep: cep.trim() || null,
      maquinas_ids: maquinasIds,
      tamanho_camiseta: tamanhoCamiseta || null,
      tamanho_calca: tamanhoCalca || null,
      tamanho_calcado: tamanhoCalcado || null,
      observacoes: observacoes.trim() || null,
      foto_url: fotoUrl,
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
        const { data: newColaborador, error } = await supabase
          .from("colaboradores")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        // Se campos de acesso preenchidos, criar acesso automaticamente
        if (shouldCreateAccess && newColaborador) {
          try {
            const { data: accessData, error: accessError } = await supabase.functions.invoke("create-user", {
              body: {
                email: emailAcesso.toLowerCase(),
                password: senhaInicial,
                username: username.toLowerCase(),
                colaboradorId: newColaborador.id,
              },
            });

            if (accessError || accessData?.error) {
              toast({
                title: "Colaborador cadastrado, mas erro no acesso",
                description: accessData?.error || accessError?.message || "Não foi possível criar o acesso. Edite o colaborador para tentar novamente.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Colaborador cadastrado com acesso!",
                description: "O colaborador foi adicionado e já pode acessar o sistema.",
              });
            }
          } catch (accessErr: any) {
            toast({
              title: "Colaborador cadastrado, mas erro no acesso",
              description: accessErr.message || "Edite o colaborador para criar o acesso.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Colaborador cadastrado",
            description: "O colaborador foi adicionado à equipe.",
          });
        }
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

  const filteredColaboradores = colaboradores.filter((c) => {
    const areaNome = c.area_id ? areasMap.get(c.area_id)?.nome : c.area;
    return c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cargo && c.cargo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (areaNome && areaNome.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleOpenEntregas = (colaborador: Colaborador) => {
    setSelectedColaboradorEntrega(colaborador);
    setEntregaInsumoId("");
    setEntregaQuantidade("1");
    setEntregaData(new Date());
    setEntregaObservacao("");
    setEntregasDialogOpen(true);
  };

  const handleSaveEntrega = async () => {
    if (!entregaInsumoId || !selectedColaboradorEntrega) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um item para registrar a entrega.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createEntregaMutation.mutateAsync({
        colaborador_id: selectedColaboradorEntrega.id,
        insumo_id: entregaInsumoId,
        quantidade: parseFloat(entregaQuantidade) || 1,
        data_entrega: format(entregaData, "yyyy-MM-dd"),
        observacao: entregaObservacao.trim() || null,
      });

      toast({
        title: "Entrega registrada",
        description: "O material foi registrado com sucesso.",
      });

      setEntregaInsumoId("");
      setEntregaQuantidade("1");
      setEntregaObservacao("");
    } catch (error) {
      console.error("Erro ao registrar entrega:", error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a entrega.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntrega = async () => {
    if (!entregaToDelete) return;

    try {
      await deleteEntregaMutation.mutateAsync(entregaToDelete);
      toast({
        title: "Entrega excluída",
        description: "O registro foi removido.",
      });
    } catch (error) {
      console.error("Erro ao excluir entrega:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o registro.",
        variant: "destructive",
      });
    } finally {
      setEntregaToDelete(null);
    }
  };

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
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {colaborador.foto_url ? (
                    <img 
                      src={colaborador.foto_url} 
                      alt={colaborador.nome} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">
                    {colaborador.nome}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {[
                      colaborador.area_id ? areasMap.get(colaborador.area_id)?.nome : colaborador.area,
                      colaborador.sub_equipe === 'implantacao' ? 'Implantação' : colaborador.sub_equipe === 'manutencao' ? 'Manutenção' : null,
                      colaborador.cargo,
                    ].filter(Boolean).join(" • ") || "—"}
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
                      <DropdownMenuItem onClick={() => handleOpenEntregas(colaborador)}>
                        <Package className="w-4 h-4 mr-2" />
                        Entregas
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem 
                          onClick={() => setColaboradorToDelete(colaborador)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
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
            {/* Upload de Foto */}
            <div className="flex justify-center pb-2">
              <ImageUpload
                value={fotoUrl}
                onChange={setFotoUrl}
                bucket="colaboradores-fotos"
                folder="colaboradores"
              />
            </div>

            {/* Dados Básicos */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(capitalizeWords(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataNascimento ? format(dataNascimento, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataNascimento}
                      onSelect={setDataNascimento}
                      initialFocus
                      locale={ptBR}
                      captionLayout="dropdown-buttons"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  placeholder="Ex: Jardineiro"
                  value={cargo}
                  onChange={(e) => setCargo(capitalizeWords(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Área</Label>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: area.cor || '#22c55e' }}
                          />
                          {area.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sub-equipe - apenas para Time de Campo */}
            {areaId && areasMap.get(areaId)?.nome?.toLowerCase().includes("campo") && (
              <div className="space-y-2">
                <Label>Sub-equipe</Label>
                <Select value={subEquipe} onValueChange={setSubEquipe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a sub-equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="implantacao">Implantação</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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
                    onChange={(e) => setEndereco(capitalizeWords(e.target.value))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      placeholder="Cidade"
                      value={cidade}
                      onChange={(e) => setCidade(capitalizeWords(e.target.value))}
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
                    onChange={(e) => setCep(formatCEP(e.target.value))}
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

            {/* Acesso ao Sistema - Collapsible (apenas para gestores) */}
            {canManageUsers && (
              <Collapsible open={acessoOpen} onOpenChange={setAcessoOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Acesso ao Sistema
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${acessoOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {editingColaborador?.user_id ? (
                    // Colaborador já tem acesso - mostrar opção de reset
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          ✓ Este colaborador possui acesso ao sistema
                        </p>
                        {username && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Usuário: <strong>{username}</strong>
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Resetar Senha</Label>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder="Nova senha (mín. 6 caracteres)"
                            value={novaSenhaReset}
                            onChange={(e) => setNovaSenhaReset(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetPassword}
                            disabled={isResettingPassword || !novaSenhaReset}
                          >
                            {isResettingPassword ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              "Resetar"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Colaborador não tem acesso - mostrar formulário de criação
                    <div className="space-y-4">
                      {editingColaborador ? (
                        <p className="text-sm text-muted-foreground">
                          Criar acesso para que o colaborador possa entrar no sistema.
                        </p>
                      ) : (
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                          * Campos obrigatórios para finalizar o cadastro
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">Nome de Usuário *</Label>
                        <Input
                          id="username"
                          placeholder="ex: joao.silva"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="emailAcesso">Email *</Label>
                        <Input
                          id="emailAcesso"
                          type="email"
                          placeholder="email@empresa.com"
                          value={emailAcesso}
                          onChange={(e) => setEmailAcesso(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="senhaInicial">Senha Inicial *</Label>
                        <Input
                          id="senhaInicial"
                          type="password"
                          placeholder="Mín. 6 caracteres"
                          value={senhaInicial}
                          onChange={(e) => setSenhaInicial(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          O colaborador poderá alterar a senha após o primeiro login.
                        </p>
                      </div>
                      
                      {editingColaborador && (
                        <Button
                          type="button"
                          variant="terracota"
                          onClick={handleCreateUserAccess}
                          disabled={isCreatingUser}
                          className="w-full"
                        >
                          {isCreatingUser ? "Criando acesso..." : "Criar Acesso ao Sistema"}
                        </Button>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Observações */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Anotações gerais sobre o colaborador..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>

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

      {/* Dialog de Entregas ao Colaborador */}
      <Dialog open={entregasDialogOpen} onOpenChange={setEntregasDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Entregas - {selectedColaboradorEntrega?.nome}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Formulário de nova entrega */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Registrar Nova Entrega</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item *</Label>
                  <Select value={entregaInsumoId} onValueChange={setEntregaInsumoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o item" />
                    </SelectTrigger>
                    <SelectContent>
                      {insumos.map((insumo) => (
                        <SelectItem key={insumo.id} value={insumo.id}>
                          {insumo.nome}
                          {insumo.categoria && <span className="text-muted-foreground"> ({insumo.categoria})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={entregaQuantidade}
                    onChange={(e) => setEntregaQuantidade(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Entrega</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(entregaData, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={entregaData}
                        onSelect={(date) => date && setEntregaData(date)}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input
                    placeholder="Ex: Reposição"
                    value={entregaObservacao}
                    onChange={(e) => setEntregaObservacao(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                variant="terracota" 
                onClick={handleSaveEntrega}
                disabled={createEntregaMutation.isPending}
              >
                {createEntregaMutation.isPending ? "Salvando..." : "Registrar Entrega"}
              </Button>
            </div>

            {/* Histórico de entregas */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Histórico de Entregas</h4>
              
              {isLoadingEntregas ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : entregas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma entrega registrada.
                </p>
              ) : (
                <div className="space-y-2">
                  {entregas.map((entrega) => (
                    <div 
                      key={entrega.id}
                      className="flex items-center justify-between p-3 bg-background border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {entrega.insumo?.nome || "Item removido"}
                          </span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            x{entrega.quantidade}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(entrega.data_entrega), "dd/MM/yyyy", { locale: ptBR })}
                          {entrega.observacao && ` • ${entrega.observacao}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEntregaToDelete({ id: entrega.id, colaboradorId: entrega.colaborador_id })}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert de confirmação de exclusão de entrega */}
      <AlertDialog open={!!entregaToDelete} onOpenChange={() => setEntregaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro de entrega será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntrega}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert de confirmação de exclusão de colaborador */}
      <AlertDialog open={!!colaboradorToDelete} onOpenChange={() => setColaboradorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O colaborador "{colaboradorToDelete?.nome}" será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (colaboradorToDelete) {
                  deleteColaboradorMutation.mutate(colaboradorToDelete.id);
                  setColaboradorToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
