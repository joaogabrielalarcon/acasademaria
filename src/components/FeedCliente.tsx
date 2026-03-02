import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  FolderKanban,
  DollarSign,
  Building2,
  Loader2,
  User,
  Clock,
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FeedClienteProps {
  clienteId: string;
}

const tipoConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  registro: {
    label: "Registro",
    icon: <FileText className="w-3.5 h-3.5" />,
    color: "bg-green-500/20 text-green-700 dark:text-green-300",
  },
  proposta: {
    label: "Proposta",
    icon: <DollarSign className="w-3.5 h-3.5" />,
    color: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  },
  projeto: {
    label: "Projeto",
    icon: <FolderKanban className="w-3.5 h-3.5" />,
    color: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  },
  cliente: {
    label: "Cadastro",
    icon: <Building2 className="w-3.5 h-3.5" />,
    color: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  },
};

const acaoIcon: Record<string, React.ReactNode> = {
  criado: <Plus className="w-3 h-3" />,
  atualizado: <Pencil className="w-3 h-3" />,
  excluido: <Trash2 className="w-3 h-3" />,
  status_alterado: <ArrowRightLeft className="w-3 h-3" />,
};

export function FeedCliente({ clienteId }: FeedClienteProps) {
  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ["cliente-atividades", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_atividades")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  // Fetch profile names for usuario_ids
  const userIds = [...new Set(atividades.map((a) => a.usuario_id).filter(Boolean))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-feed", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", userIds as string[]);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p.nome]));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (atividades.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Nenhuma atividade registrada ainda. As movimentações aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  // Group by date
  const grouped = new Map<string, typeof atividades>();
  atividades.forEach((a) => {
    const dateKey = format(new Date(a.created_at), "yyyy-MM-dd");
    const existing = grouped.get(dateKey) || [];
    existing.push(a);
    grouped.set(dateKey, existing);
  });

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateKey, items]) => (
        <div key={dateKey}>
          {/* Date Header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-semibold text-foreground">
              {format(new Date(dateKey), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Items */}
          <div className="space-y-2 pl-2">
            {items.map((atividade) => {
              const tipo = tipoConfig[atividade.tipo] || tipoConfig.registro;
              const userName = atividade.usuario_id
                ? profileMap.get(atividade.usuario_id) || "Usuário"
                : "Sistema";
              const time = format(new Date(atividade.created_at), "HH:mm");

              return (
                <article
                  key={atividade.id}
                  className="card-botanical p-3 animate-fade-in flex items-start gap-3"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tipo.color}`}>
                    {tipo.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{atividade.descricao}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {userName}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {time}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${tipo.color}`}>
                        {acaoIcon[atividade.acao] || acaoIcon.atualizado}
                        {tipo.label}
                      </Badge>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
