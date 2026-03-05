import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface MafeProjetoOption {
  id: string;
  titulo: string;
  cliente_id: string;
  status: string;
  clientes?: {
    nome: string;
  } | null;
}

interface MafeProjetoPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projetos: MafeProjetoOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (projeto: MafeProjetoOption) => void;
  isLoading: boolean;
}

export function MafeProjetoPicker({
  open,
  onOpenChange,
  projetos,
  search,
  onSearchChange,
  onSelect,
  isLoading,
}: MafeProjetoPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Qual projeto você quer registrar?</DialogTitle>
          <DialogDescription>
            Escolha o projeto para abrir a Mafe do diário no contexto certo.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar projeto ou cliente"
            className="pl-9"
          />
        </div>

        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : projetos.length === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Nenhum projeto encontrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente outro nome ou verifique se você tem acesso ao projeto.</p>
            </div>
          ) : (
            projetos.map((projeto) => (
              <button
                key={projeto.id}
                type="button"
                onClick={() => onSelect(projeto)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary/30 hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{projeto.titulo}</p>
                    <p className="truncate text-sm text-muted-foreground">{projeto.clientes?.nome || "Cliente sem nome"}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="pointer-events-none shrink-0">
                    Abrir
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
