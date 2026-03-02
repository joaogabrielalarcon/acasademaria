import { useState } from "react";
import { Plus, Trash2, Save, Loader2, FileText, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MemorialItem {
  id: string;
  projeto_id: string;
  nome_popular: string;
  nome_cientifico: string;
  porte: string;
  quantidade: number;
  unidade: string;
  ordem: number;
}

interface MemorialDescritivoProps {
  projetoId: string;
  isAdmin: boolean;
}

export function MemorialDescritivo({ projetoId, isAdmin }: MemorialDescritivoProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItems, setEditingItems] = useState<MemorialItem[] | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["memorial-descritivo", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorial_descritivo")
        .select("*")
        .eq("projeto_id", projetoId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as MemorialItem[];
    },
  });

  const isEditing = editingItems !== null;
  const displayItems = isEditing ? editingItems : items;

  const startEditing = () => setEditingItems([...items]);

  const cancelEditing = () => setEditingItems(null);

  const addRow = () => {
    if (!editingItems) return;
    setEditingItems([
      ...editingItems,
      {
        id: `new-${Date.now()}`,
        projeto_id: projetoId,
        nome_popular: "",
        nome_cientifico: "",
        porte: "",
        quantidade: 1,
        unidade: "un",
        ordem: editingItems.length,
      },
    ]);
  };

  const updateRow = (index: number, field: keyof MemorialItem, value: string | number) => {
    if (!editingItems) return;
    const updated = [...editingItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditingItems(updated);
  };

  const removeRow = (index: number) => {
    if (!editingItems) return;
    setEditingItems(editingItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!editingItems) return;
    setSaving(true);
    try {
      // Delete all existing items for this project
      const { error: deleteError } = await supabase
        .from("memorial_descritivo")
        .delete()
        .eq("projeto_id", projetoId);
      if (deleteError) throw deleteError;

      // Insert all current items
      if (editingItems.length > 0) {
        const toInsert = editingItems.map((item, idx) => ({
          projeto_id: projetoId,
          nome_popular: item.nome_popular,
          nome_cientifico: item.nome_cientifico || "",
          porte: item.porte || "",
          quantidade: item.quantidade || 1,
          unidade: item.unidade || "un",
          ordem: idx,
        }));

        const { error: insertError } = await supabase
          .from("memorial_descritivo")
          .insert(toInsert);
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ["memorial-descritivo", projetoId] });
      setEditingItems(null);
      toast({ title: "Memorial descritivo salvo" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-botanical p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Memorial Descritivo
        </h3>
        {isAdmin && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                  Cancelar
                </Button>
                <Button variant="terracota" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEditing}>
                Editar
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayItems.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Nome Popular</TableHead>
                  <TableHead>Nome Científico</TableHead>
                  <TableHead>Porte</TableHead>
                  <TableHead className="w-24">Qtd</TableHead>
                  <TableHead className="w-24">Unidade</TableHead>
                  {isEditing && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.nome_popular}
                          onChange={(e) => updateRow(idx, "nome_popular", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Nome popular"
                        />
                      ) : (
                        <span className="text-foreground">{item.nome_popular}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.nome_cientifico}
                          onChange={(e) => updateRow(idx, "nome_cientifico", e.target.value)}
                          className="h-8 text-sm italic"
                          placeholder="Nome científico"
                        />
                      ) : (
                        <span className="text-foreground italic">{item.nome_cientifico || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.porte}
                          onChange={(e) => updateRow(idx, "porte", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Porte"
                        />
                      ) : (
                        <span className="text-foreground">{item.porte || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => updateRow(idx, "quantidade", Number(e.target.value) || 0)}
                          className="h-8 text-sm w-20"
                          min={0}
                        />
                      ) : (
                        <span className="text-foreground">{item.quantidade}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.unidade}
                          onChange={(e) => updateRow(idx, "unidade", e.target.value)}
                          className="h-8 text-sm w-20"
                          placeholder="un"
                        />
                      ) : (
                        <span className="text-foreground">{item.unidade}</span>
                      )}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                          onClick={() => removeRow(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {isEditing && (
            <Button variant="outline" size="sm" onClick={addRow} className="mt-3">
              <Plus className="w-4 h-4" /> Adicionar linha
            </Button>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-muted-foreground text-sm mb-3">
            Nenhum item no memorial descritivo
          </p>
          {isAdmin && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => { startEditing(); setTimeout(addRow, 0); }}>
              <Plus className="w-4 h-4" /> Começar memorial
            </Button>
          )}
          {isEditing && (
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-4 h-4" /> Adicionar linha
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
