import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, FileText, Search, Leaf, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePlantas, Planta } from "@/hooks/usePlantas";
import { useInsumos } from "@/hooks/useInsumos";
import { useCategoriasPlantas } from "@/hooks/useCategoriasPlantas";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MemorialItem {
  id: string;
  projeto_id: string;
  tipo: string;
  nome_popular: string;
  nome_cientifico: string;
  altura_m: number | null;
  quantidade: number;
  unidade: string;
  ordem: number;
  planta_id: string | null;
  insumo_id: string | null;
  categoria: string;
  dap: string;
}

interface MemorialDescritivoProps {
  projetoId: string;
  isAdmin: boolean;
}

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: { label: string; onSelect: () => void }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = suggestions.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const showDropdown = open && filtered.length > 0 && search.length > 0;

  // Close on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => search.length > 0 && setOpen(true)}
        className="h-8 text-sm pr-7"
        placeholder={placeholder}
        disabled={disabled}
      />
      <Search className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden">
          <ScrollArea className="max-h-48">
            <div className="py-1">
              {filtered.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors truncate cursor-pointer"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    s.onSelect();
                    setOpen(false);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function PlantasSection({
  items,
  isEditing,
  onUpdate,
  onRemove,
  onAdd,
  plantas,
  categoriasMap,
}: {
  items: MemorialItem[];
  isEditing: boolean;
  onUpdate: (index: number, field: keyof MemorialItem, value: string | number | null) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  plantas: Planta[];
  categoriasMap: Record<string, string>;
}) {
  const plantaSuggestions = plantas.map((p) => ({
    label: `${p.nome_popular}${p.nome_cientifico ? ` (${p.nome_cientifico})` : ""}`,
    planta: p,
  }));

  const plantaCientificoSuggestions = plantas
    .filter((p) => !!p.nome_cientifico)
    .map((p) => ({
      label: `${p.nome_cientifico} (${p.nome_popular})`,
      planta: p,
    }));

  return (
    <div>
      <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
        <Leaf className="w-4 h-4 text-primary" />
        Plantas
      </h4>
      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Item</TableHead>
                <TableHead>Nome Popular</TableHead>
                <TableHead>Nome Científico</TableHead>
                <TableHead>Altura (m)</TableHead>
                <TableHead className="w-24">DAP</TableHead>
                <TableHead className="w-28">Qtd</TableHead>
                <TableHead className="w-20">Unid.</TableHead>
                {isEditing && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => {
                const selectPlanta = (planta: Planta) => {
                  onUpdate(idx, "nome_popular", planta.nome_popular);
                  onUpdate(idx, "nome_cientifico", planta.nome_cientifico || "");
                  onUpdate(idx, "altura_m", planta.altura_m);
                  onUpdate(idx, "unidade", planta.unidade || "un");
                  onUpdate(idx, "dap", planta.dap_cm ? String(planta.dap_cm) : "");
                  onUpdate(idx, "categoria", planta.categoria_id ? (categoriasMap[planta.categoria_id] || "") : "");
                  onUpdate(idx, "planta_id", planta.id);
                };

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.categoria}
                          onChange={(e) => onUpdate(idx, "categoria", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Árvore, arbusto..."
                        />
                      ) : (
                        <span className="text-sm font-medium">{item.categoria || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <AutocompleteInput
                          value={item.nome_popular}
                          onChange={(v) => {
                            onUpdate(idx, "nome_popular", v);
                            onUpdate(idx, "planta_id", null);
                          }}
                          placeholder="Buscar planta..."
                          suggestions={plantaSuggestions.map((ps) => ({
                            label: ps.label,
                            onSelect: () => selectPlanta(ps.planta),
                          }))}
                        />
                      ) : (
                        <span>{item.nome_popular}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <AutocompleteInput
                          value={item.nome_cientifico}
                          onChange={(v) => {
                            onUpdate(idx, "nome_cientifico", v);
                            onUpdate(idx, "planta_id", null);
                          }}
                          placeholder="Nome científico"
                          suggestions={plantaCientificoSuggestions.map((ps) => ({
                            label: ps.label,
                            onSelect: () => selectPlanta(ps.planta),
                          }))}
                        />
                      ) : (
                        <span className="italic">{item.nome_cientifico || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={item.altura_m ?? ""}
                          onChange={(e) => onUpdate(idx, "altura_m", e.target.value === "" ? null : Number(e.target.value))}
                          className="h-8 text-sm w-24"
                          placeholder="Altura"
                        />
                      ) : (
                        <span>{item.altura_m != null ? `${Number(item.altura_m).toFixed(2)} m` : "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.dap}
                          onChange={(e) => onUpdate(idx, "dap", e.target.value)}
                          className="h-8 text-sm w-24"
                          placeholder="DAP"
                        />
                      ) : (
                        <span>{item.dap || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => onUpdate(idx, "quantidade", Number(e.target.value) || 0)}
                          className="h-8 text-sm w-20"
                          min={0}
                        />
                      ) : (
                        <span>{item.quantidade}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={item.unidade}
                          onChange={(e) => onUpdate(idx, "unidade", e.target.value)}
                          className="h-8 text-sm w-20"
                          placeholder="un"
                        />
                      ) : (
                        <span>{item.unidade}</span>
                      )}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                          onClick={() => onRemove(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm py-2">Nenhuma planta adicionada</p>
      )}
      {isEditing && (
        <Button variant="outline" size="sm" onClick={onAdd} className="mt-2">
          <Plus className="w-4 h-4" /> Adicionar planta
        </Button>
      )}
    </div>
  );
}

function InsumosSection({
  items,
  isEditing,
  onUpdate,
  onRemove,
  onAdd,
  insumos,
}: {
  items: MemorialItem[];
  isEditing: boolean;
  onUpdate: (index: number, field: keyof MemorialItem, value: string | number | null) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  insumos: { id: string; nome: string; categoria: string | null; unidade: string | null }[];
}) {
  const insumoSuggestions = insumos.map((ins) => ({
    label: `${ins.nome}${ins.categoria ? ` (${ins.categoria})` : ""}`,
    insumo: ins,
  }));

  return (
    <div>
      <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
        <Package className="w-4 h-4 text-primary" />
        Produtos e Insumos
      </h4>
      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-20">Qtd</TableHead>
                <TableHead className="w-20">Unid.</TableHead>
                {isEditing && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={item.categoria}
                        onChange={(e) => onUpdate(idx, "categoria", e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Categoria"
                      />
                    ) : (
                      <span>{item.categoria || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <AutocompleteInput
                        value={item.nome_popular}
                        onChange={(v) => {
                          onUpdate(idx, "nome_popular", v);
                          onUpdate(idx, "insumo_id", null);
                        }}
                        placeholder="Buscar produto/insumo..."
                        suggestions={insumoSuggestions.map((is) => ({
                          label: is.label,
                          onSelect: () => {
                            onUpdate(idx, "nome_popular", is.insumo.nome);
                            onUpdate(idx, "categoria", is.insumo.categoria || "");
                            onUpdate(idx, "unidade", is.insumo.unidade || "un");
                            onUpdate(idx, "insumo_id", is.insumo.id);
                          },
                        }))}
                      />
                    ) : (
                      <span>{item.nome_popular}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) => onUpdate(idx, "quantidade", Number(e.target.value) || 0)}
                        className="h-8 text-sm w-20"
                        min={0}
                      />
                    ) : (
                      <span>{item.quantidade}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={item.unidade}
                        onChange={(e) => onUpdate(idx, "unidade", e.target.value)}
                        className="h-8 text-sm w-20"
                        placeholder="un"
                      />
                    ) : (
                      <span>{item.unidade}</span>
                    )}
                  </TableCell>
                  {isEditing && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        onClick={() => onRemove(idx)}
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
      ) : (
        <p className="text-muted-foreground text-sm py-2">Nenhum produto/insumo adicionado</p>
      )}
      {isEditing && (
        <Button variant="outline" size="sm" onClick={onAdd} className="mt-2">
          <Plus className="w-4 h-4" /> Adicionar produto/insumo
        </Button>
      )}
    </div>
  );
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
        .order("tipo")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as MemorialItem[];
    },
  });

  const { data: plantas = [] } = usePlantas();
  const { data: categoriasPlantas = [] } = useCategoriasPlantas();
  const categoriasMap: Record<string, string> = {};
  categoriasPlantas.forEach((c) => { categoriasMap[c.id] = c.nome; });
  const { data: insumosRaw = [] } = useInsumos();
  const insumos = insumosRaw.map((i: any) => ({
    id: i.id,
    nome: i.nome,
    categoria: i.categoria,
    unidade: i.unidade,
  }));

  const isEditing = editingItems !== null;
  const displayItems = isEditing ? editingItems : items;

  const plantaItems = displayItems.filter((i) => i.tipo === "planta");
  const insumoItems = displayItems.filter((i) => i.tipo === "insumo");

  const startEditing = () => setEditingItems([...items]);
  const cancelEditing = () => setEditingItems(null);

  const makeNewItem = (tipo: string): MemorialItem => ({
    id: `new-${Date.now()}-${Math.random()}`,
    projeto_id: projetoId,
    tipo,
    nome_popular: "",
    nome_cientifico: "",
    altura_m: null,
    quantidade: 1,
    unidade: "un",
    ordem: 0,
    planta_id: null,
    insumo_id: null,
    categoria: "",
    dap: "",
  });

  const addPlanta = () => {
    if (!editingItems) return;
    setEditingItems([...editingItems, makeNewItem("planta")]);
  };

  const addInsumo = () => {
    if (!editingItems) return;
    setEditingItems([...editingItems, makeNewItem("insumo")]);
  };

  const getGlobalIndex = (tipo: string, localIdx: number): number => {
    const filtered = editingItems!.map((item, i) => ({ item, i })).filter((x) => x.item.tipo === tipo);
    return filtered[localIdx]?.i ?? -1;
  };

  const updateItem = (tipo: string) => (localIdx: number, field: keyof MemorialItem, value: string | number | null) => {
    setEditingItems((prev) => {
      if (!prev) return prev;

      const filtered = prev
        .map((item, i) => ({ item, i }))
        .filter((x) => x.item.tipo === tipo);
      const globalIdx = filtered[localIdx]?.i ?? -1;
      if (globalIdx === -1) return prev;

      const updated = [...prev];
      updated[globalIdx] = { ...updated[globalIdx], [field]: value };
      return updated;
    });
  };

  const removeItem = (tipo: string) => (localIdx: number) => {
    if (!editingItems) return;
    const globalIdx = getGlobalIndex(tipo, localIdx);
    if (globalIdx === -1) return;
    setEditingItems(editingItems.filter((_, i) => i !== globalIdx));
  };

  const handleSave = async () => {
    if (!editingItems) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from("memorial_descritivo")
        .delete()
        .eq("projeto_id", projetoId);
      if (deleteError) throw deleteError;

      if (editingItems.length > 0) {
        const toInsert = editingItems.map((item, idx) => ({
          projeto_id: projetoId,
          tipo: item.tipo,
          nome_popular: item.nome_popular,
          nome_cientifico: item.nome_cientifico || "",
          altura_m: item.altura_m,
          quantidade: item.quantidade || 1,
          unidade: item.unidade || "un",
          ordem: idx,
          planta_id: item.planta_id || null,
          insumo_id: item.insumo_id || null,
          categoria: item.categoria || "",
          dap: item.dap || "",
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

  const isEmpty = plantaItems.length === 0 && insumoItems.length === 0;

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
      ) : isEmpty && !isEditing ? (
        <div className="text-center py-6">
          <p className="text-muted-foreground text-sm mb-3">Nenhum item no memorial descritivo</p>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => { startEditing(); }}>
              <Plus className="w-4 h-4" /> Começar memorial
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <PlantasSection
            items={plantaItems}
            isEditing={isEditing}
            onUpdate={updateItem("planta")}
            onRemove={removeItem("planta")}
            onAdd={addPlanta}
            plantas={plantas}
            categoriasMap={categoriasMap}
          />

          <InsumosSection
            items={insumoItems}
            isEditing={isEditing}
            onUpdate={updateItem("insumo")}
            onRemove={removeItem("insumo")}
            onAdd={addInsumo}
            insumos={insumos}
          />
        </div>
      )}
    </section>
  );
}
