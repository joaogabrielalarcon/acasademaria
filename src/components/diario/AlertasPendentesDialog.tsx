import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { useResolveDiarioAlerta, usePendingDiarioAlertas } from "@/hooks/useDiarioAlertas";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AlertasPendentesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatAlertDate(value: string) {
  return format(new Date(value), "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
}

export function AlertasPendentesDialog({ open, onOpenChange }: AlertasPendentesDialogProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: alertas = [], isLoading } = usePendingDiarioAlertas(open);
  const resolveMutation = useResolveDiarioAlerta();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alertas pendentes</DialogTitle>
          <DialogDescription>
            Pendências geradas pelas observações internas das visitas do diário.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : alertas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/40 px-5 py-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-4 text-base font-medium text-foreground">Nenhum alerta pendente.</p>
            <p className="mt-1 text-sm text-muted-foreground">Quando surgir uma pendência no diário, ela aparece aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <article key={alerta.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                        Pendente
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatAlertDate(alerta.created_at)}</span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-foreground">
                      {alerta.projetos?.titulo || "Projeto sem título"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {alerta.clientes?.nome || "Cliente não identificado"}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{alerta.descricao}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:w-48">
                    <Button variant="outline" asChild>
                      <Link to={`/projetos/${alerta.projeto_id}?tab=diario`} onClick={() => onOpenChange(false)}>
                        <ExternalLink className="h-4 w-4" />
                        Ver no diário
                      </Link>
                    </Button>
                    <Button
                      variant="success"
                      onClick={() =>
                        resolveMutation.mutate({
                          alertaId: alerta.id,
                          resolvidoPorNome: profile?.nome || user?.email || "Coordenação de Campo",
                        })
                      }
                      disabled={resolveMutation.isPending}
                    >
                      {resolveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Marcar como resolvido
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
