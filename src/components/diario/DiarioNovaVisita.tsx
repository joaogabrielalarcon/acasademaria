import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircleMore } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MafeDiarioChat } from "@/components/diario/MafeDiarioChat";
import { Button } from "@/components/ui/button";

interface DiarioNovaVisitaProps {
  scopeProjectId?: string;
  scopedClienteId?: string;
  editingRecord?: unknown;
  onSaved?: () => void;
  onCancelEdit?: () => void;
}

export function DiarioNovaVisita({ scopeProjectId, scopedClienteId, editingRecord, onSaved, onCancelEdit }: DiarioNovaVisitaProps) {
  const [open, setOpen] = useState(Boolean(scopeProjectId));

  const { data: context, isLoading } = useQuery({
    queryKey: ["diario-nova-visita-context", scopeProjectId, scopedClienteId],
    enabled: !!scopeProjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, titulo, cliente_id, clientes(nome)")
        .eq("id", scopeProjectId)
        .maybeSingle();

      if (error) throw error;

      return {
        projetoId: data?.id || scopeProjectId || "",
        projetoNome: data?.titulo || "Projeto",
        clienteNome: (data as any)?.clientes?.nome || "Cliente",
        clienteId: data?.cliente_id || scopedClienteId || "",
      };
    },
  });

  useEffect(() => {
    if (scopeProjectId) setOpen(true);
  }, [scopeProjectId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) onCancelEdit?.();
  };

  return (
    <div className="card-botanical p-5 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground">Registrar visita com a Mafe</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O formulário estático foi substituído por um fluxo conversacional guiado, com coleta passo a passo e salvamento após confirmação.
          </p>
        </div>

        <Button variant="terracota" onClick={() => setOpen(true)} disabled={!context?.projetoId || isLoading}>
          <MessageCircleMore className="h-4 w-4" />
          Abrir chat
        </Button>
      </div>

      {editingRecord ? (
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          A edição agora acontece pelo novo fluxo da Mafe. Abra o chat para registrar novamente a visita.
        </div>
      ) : null}

      {context?.projetoId ? (
        <MafeDiarioChat
          open={open}
          onOpenChange={handleOpenChange}
          projetoId={context.projetoId}
          projetoNome={context.projetoNome}
          clienteNome={context.clienteNome}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  );
}
