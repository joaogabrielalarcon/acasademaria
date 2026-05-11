import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Star, Pencil, Check, X } from "lucide-react";
import {
  useAtendentes, useSaveAtendente, useDeleteAtendente,
  useMeuAtendentePadrao, useSetMeuAtendentePadrao, Atendente,
} from "@/hooks/useFornecedorAtendentes";
import { useIsAdmin } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import { formatPhone } from "@/hooks/useInputMasks";
import { toast } from "sonner";

interface Props {
  fornecedorId: string;
}

const empty = { nome: "", telefone: "", funcao: "", email: "" };

export function AtendentesSection({ fornecedorId }: Props) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { data: atendentes = [], isLoading } = useAtendentes(fornecedorId);
  const { data: padraoId } = useMeuAtendentePadrao(fornecedorId);
  const save = useSaveAtendente();
  const del = useDeleteAtendente();
  const setPadrao = useSetMeuAtendentePadrao();

  const [novo, setNovo] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState(empty);

  const handleAdd = async () => {
    if (!novo.nome.trim()) { toast.error("Nome do atendente é obrigatório"); return; }
    await save.mutateAsync({ fornecedor_id: fornecedorId, ...novo });
    setNovo(empty);
  };

  const startEdit = (a: Atendente) => {
    setEditId(a.id);
    setEditData({ nome: a.nome, telefone: a.telefone ?? "", funcao: a.funcao ?? "", email: a.email ?? "" });
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (!editData.nome.trim()) { toast.error("Nome do atendente é obrigatório"); return; }
    await save.mutateAsync({ id: editId, fornecedor_id: fornecedorId, ...editData });
    setEditId(null);
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Atendentes</Label>
        <span className="text-xs text-muted-foreground">
          {atendentes.length} {atendentes.length === 1 ? "atendente" : "atendentes"}
        </span>
      </div>

      {/* Adicionar novo */}
      <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto] items-end rounded-md bg-muted/30 p-3">
        <div className="space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telefone</Label>
          <Input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Função</Label>
          <Input value={novo.funcao} onChange={(e) => setNovo({ ...novo, funcao: e.target.value })} placeholder="Ex: Vendedor" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} placeholder="email@..." />
        </div>
        <Button type="button" onClick={handleAdd} disabled={save.isPending} className="gap-1">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Carregando...</div>
      ) : atendentes.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Nenhum atendente cadastrado.</div>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {atendentes.map((a) => {
            const ehPadrao = padraoId === a.id;
            const editando = editId === a.id;
            return (
              <div key={a.id} className={`p-3 ${ehPadrao ? "bg-primary/5" : ""}`}>
                {editando ? (
                  <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto] items-end">
                    <Input value={editData.nome} onChange={(e) => setEditData({ ...editData, nome: e.target.value })} />
                    <Input value={editData.telefone} onChange={(e) => setEditData({ ...editData, telefone: formatPhone(e.target.value) })} maxLength={15} />
                    <Input value={editData.funcao} onChange={(e) => setEditData({ ...editData, funcao: e.target.value })} />
                    <Input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                    <div className="flex gap-1">
                      <Button type="button" size="icon-sm" onClick={saveEdit}><Check className="w-4 h-4" /></Button>
                      <Button type="button" size="icon-sm" variant="outline" onClick={() => setEditId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.nome}</span>
                        {a.funcao && <span className="text-xs text-muted-foreground">· {a.funcao}</span>}
                        {ehPadrao && (
                          <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3" fill="currentColor" /> meu padrão
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                        {a.telefone && <span>{a.telefone}</span>}
                        {a.email && <span>{a.email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button" variant="ghost" size="sm"
                        className={ehPadrao ? "text-primary" : ""}
                        onClick={() => setPadrao.mutate({ fornecedor_id: fornecedorId, atendente_id: a.id })}
                        title="Definir como meu padrão"
                      >
                        <Star className="w-4 h-4" fill={ehPadrao ? "currentColor" : "none"} />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => startEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      {isAdmin && (
                        <Button
                          type="button" variant="ghost" size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => del.mutate({ id: a.id, fornecedor_id: fornecedorId })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
