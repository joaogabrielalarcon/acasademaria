import { useState } from "react";
import { Search, Plus, UserCircle, MoreVertical, Pencil } from "lucide-react";
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
import { useColaboradores, Colaborador } from "@/hooks/useColaboradores";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Equipe() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { data: colaboradores = [], isLoading } = useColaboradores();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const capitalizeWords = (text: string) => {
    return text
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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

  const handleOpenNew = () => {
    setEditingColaborador(null);
    setNome("");
    setFuncao("");
    setAtivo(true);
    setDialogOpen(true);
  };

  const handleEdit = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setNome(colaborador.nome);
    setFuncao(colaborador.funcao || "");
    setAtivo(colaborador.ativo);
    setDialogOpen(true);
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

    try {
      if (editingColaborador) {
        const { error } = await supabase
          .from("colaboradores")
          .update({
            nome: capitalizeWords(nome.trim()),
            funcao: funcao.trim() ? capitalizeWords(funcao.trim()) : null,
            ativo,
          })
          .eq("id", editingColaborador.id);

        if (error) throw error;

        toast({
          title: "Colaborador atualizado",
          description: "As informações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase.from("colaboradores").insert({
          nome: capitalizeWords(nome.trim()),
          funcao: funcao.trim() ? capitalizeWords(funcao.trim()) : null,
          ativo,
        });

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
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
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
          placeholder="Buscar colaborador..."
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
                    {colaborador.funcao || "—"}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingColaborador ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome do colaborador"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="funcao">Função</Label>
              <Input
                id="funcao"
                placeholder="Ex: Jardineiro, Paisagista..."
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
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
