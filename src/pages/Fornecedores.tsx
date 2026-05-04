// NOTE: Em versão futura, a Mafe terá capacidade de cadastrar fornecedores
// via texto ou voz — o usuário descreve o fornecedor e a IA preenche os campos
// automaticamente, confirmando com o usuário antes de salvar.

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, GitMerge } from "lucide-react";
import { DataTableExcel, DataTableColumn } from "@/components/ui/data-table-excel";
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
  const [itemToDelete, setItemToDelete] = useState<Fornecedor | null>(null);
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

  const columns: DataTableColumn<Fornecedor>[] = [
    {
      key: "nome", header: "Nome", width: 220,
      accessor: (f) => f.nome,
      render: (f) => (
        <div>
          <span className="font-medium">{f.nome}</span>
          {f.nome_alternativo && (
            <span className="block text-xs text-muted-foreground">{f.nome_alternativo}</span>
          )}
        </div>
      ),
    },
    { key: "nome_alternativo", header: "Apelido", width: 160, accessor: (f) => f.nome_alternativo ?? "" },
    { key: "mercado", header: "Mercado", width: 140, accessor: (f) => f.mercado ?? "" },
    { key: "categoria_fornecedor", header: "Categoria", width: 200, accessor: (f) => f.categoria_fornecedor ?? "" },
    { key: "cnpj", header: "CNPJ", width: 160, accessor: (f) => f.cnpj ?? "" },
    { key: "telefone", header: "Telefone", width: 140, accessor: (f) => f.telefone ?? "" },
    { key: "whatsapp", header: "WhatsApp", width: 140, accessor: (f) => f.whatsapp ?? "" },
    { key: "email", header: "Email", width: 200, accessor: (f) => f.email ?? "" },
    { key: "cidade", header: "Cidade", width: 140, accessor: (f) => f.cidade ?? "" },
    { key: "estado", header: "UF", width: 70, accessor: (f) => f.estado ?? "" },
    { key: "endereco", header: "Endereço", width: 220, accessor: (f) => f.endereco ?? "" },
    {
      key: "status", header: "Status", width: 100, accessor: (f) => f.status,
      render: (f) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          f.status === "ativo" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          {f.status === "ativo" ? "Ativo" : "Inativo"}
        </span>
      ),
    },
    { key: "observacoes", header: "Observações", width: 240, accessor: (f) => f.observacoes ?? "" },
  ];

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

        <DataTableExcel
          data={fornecedores}
          columns={columns}
          rowKey={(f) => f.id}
          loading={isLoading}
          searchPlaceholder="Buscar fornecedores..."
          globalSearchKeys={["nome", "nome_alternativo", "cnpj", "cidade", "email", "categoria_fornecedor", "mercado"]}
          rowActions={(fornecedor) => (
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
          )}
        />
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
