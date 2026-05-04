// NOTE: Em versão futura, a Mafe terá capacidade de cadastrar fornecedores
// via texto ou voz — o usuário descreve o fornecedor e a IA preenche os campos
// automaticamente, confirmando com o usuário antes de salvar.

import { useState, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Search, Trash2, GitMerge } from "lucide-react";
import { useFornecedoresTodos, Fornecedor } from "@/hooks/useFornecedores";
import { useAuth, useIsAdmin, useIsAdminOrAdministrativo } from "@/hooks/useAuth";
import { MesclarManualDialog } from "@/components/fornecedores/MesclarManualDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCNPJ, formatPhone, capitalizeWords } from "@/hooks/useInputMasks";

const MERCADOS = [
  'Ceagesp','Ceaflor','Jundiaí','Ceasa','Itapetininga','Atibaia',
  'Limeira','Ceasa Campinas','São Roque','Boituva','Miracatu',
  'Amparo','Joanópolis','Holambra','Jarinu','Cabreúva','Outros',
];

const CATEGORIAS_FORNECEDOR = [
  'Viveiro / Produtor','Atacadista / Distribuidor','Fornecedor Diverso',
  'Insumos Agrícolas','Materiais / Insumos Construtivos','Vasos / Decoração',
  'Insumos/Materiais',
];

export function FornecedoresContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ativo");
  const [itemToDelete, setItemToDelete] = useState<Fornecedor | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [mesclarOpen, setMesclarOpen] = useState(false);

  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const podeMesclar = useIsAdminOrAdministrativo(user?.id);

  const { data: fornecedores = [], isLoading } = useFornecedoresTodos();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome: "",
    mercado: "",
    categoria_fornecedor: "",
    nome_alternativo: "",
    cnpj: "",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    cidade: "",
    estado: "",
    observacoes: "",
    status: "ativo",
  });

  const resetForm = () => {
    setFormData({
      nome: "", mercado: "", categoria_fornecedor: "", nome_alternativo: "",
      cnpj: "", telefone: "", whatsapp: "", email: "",
      endereco: "", cidade: "", estado: "", observacoes: "", status: "ativo",
    });
    setEditingFornecedor(null);
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setFormData({
      nome: fornecedor.nome,
      mercado: fornecedor.mercado || "",
      categoria_fornecedor: fornecedor.categoria_fornecedor || "",
      nome_alternativo: fornecedor.nome_alternativo || "",
      cnpj: fornecedor.cnpj || "",
      telefone: fornecedor.telefone || "",
      whatsapp: fornecedor.whatsapp || "",
      email: fornecedor.email || "",
      endereco: fornecedor.endereco || "",
      cidade: fornecedor.cidade || "",
      estado: fornecedor.estado || "",
      observacoes: fornecedor.observacoes || "",
      status: fornecedor.status,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        nome: data.nome,
        mercado: data.mercado || null,
        categoria_fornecedor: data.categoria_fornecedor || null,
        nome_alternativo: data.nome_alternativo || null,
        cnpj: data.cnpj || null,
        telefone: data.telefone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        endereco: data.endereco || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        observacoes: data.observacoes || null,
        status: data.status,
      };

      if (editingFornecedor) {
        const { error } = await supabase.from("fornecedores").update(payload).eq("id", editingFornecedor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fornecedores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-todos"] });
      toast.success(editingFornecedor ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao salvar fornecedor: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    saveMutation.mutate(formData);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-todos"] });
      toast.success("Fornecedor excluído!");
      setItemToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  // Search: nome OR nome_alternativo
  const filteredFornecedores = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = fornecedores.filter((f) => {
      const matchesSearch = f.nome.toLowerCase().includes(term) ||
        (f.nome_alternativo?.toLowerCase().includes(term) ?? false);
      const matchesStatus = filterStatus === "todos" || f.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
    return filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [fornecedores, searchTerm, filterStatus]);

  const visibleFornecedores = filteredFornecedores.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFornecedores.length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Fornecedor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nome *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: capitalizeWords(e.target.value) })}
                      placeholder="Nome do fornecedor"
                    />
                  </div>

                  {/* Mercado — posição de destaque após Nome */}
                  <div className="space-y-2">
                    <Label>Mercado / Central</Label>
                    <Select value={formData.mercado} onValueChange={(v) => setFormData({ ...formData, mercado: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {MERCADOS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formData.categoria_fornecedor} onValueChange={(v) => setFormData({ ...formData, categoria_fornecedor: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_FORNECEDOR.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nome Alternativo / Apelido</Label>
                    <Input
                      value={formData.nome_alternativo}
                      onChange={(e) => setFormData({ ...formData, nome_alternativo: e.target.value })}
                      placeholder="Ex: Luigi Flores, Luigi Ceaflor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Endereço</Label>
                    <Input
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: capitalizeWords(e.target.value) })}
                      placeholder="Rua, número, bairro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: capitalizeWords(e.target.value) })}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      placeholder="Observações sobre o fornecedor"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
                  <div>
                    {editingFornecedor && podeMesclar && (
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setMesclarOpen(true)}
                      >
                        <GitMerge className="w-4 h-4" />
                        Mesclar fornecedores
                      </Button>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou apelido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Mercado</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredFornecedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum fornecedor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                visibleFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{fornecedor.nome}</span>
                        {fornecedor.nome_alternativo && (
                          <span className="block text-xs text-muted-foreground">{fornecedor.nome_alternativo}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{fornecedor.mercado || "-"}</TableCell>
                    <TableCell className="text-sm">{fornecedor.categoria_fornecedor || "-"}</TableCell>
                    <TableCell>{fornecedor.telefone || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        fornecedor.status === "ativo"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {fornecedor.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(fornecedor)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setItemToDelete(fornecedor)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setVisibleCount((c) => c + 20)}>
              Carregar mais ({filteredFornecedores.length - visibleCount} restantes)
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fornecedor "{itemToDelete?.nome}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingFornecedor && (
        <MesclarManualDialog
          open={mesclarOpen}
          onOpenChange={setMesclarOpen}
          principal={editingFornecedor}
          onMerged={() => { setDialogOpen(false); resetForm(); }}
        />
      )}
    </>
  );
}

export default function Fornecedores() {
  return (
    <AppLayout>
      <FornecedoresContent />
    </AppLayout>
  );
}
