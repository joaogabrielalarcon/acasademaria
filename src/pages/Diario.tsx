import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DiarioManutencaoModule } from "@/components/diario/DiarioManutencaoModule";
import { useAuth, useUserRoles } from "@/hooks/useAuth";

export default function Diario() {
  const { user } = useAuth();
  const { data: roles = [], isLoading } = useUserRoles(user?.id);
  const canAccess = roles.some((role) => ["admin", "gestao_campo", "responsavel_obra", "operador_campo"].includes(role.role));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Diário</h1>
          <p className="text-muted-foreground">Registre visitas de manutenção com apoio da IA e acompanhe o histórico da equipe.</p>
        </header>

        {canAccess ? (
          <DiarioManutencaoModule />
        ) : (
          <div className="card-botanical p-8 text-center">
            <h2 className="font-display text-lg font-semibold">Sem acesso ao Diário</h2>
            <p className="mt-2 text-sm text-muted-foreground">Seu perfil não possui permissão para usar este módulo.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
