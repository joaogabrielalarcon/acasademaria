import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRightLeft,
  Building2,
  CalendarDays,
  Clock,
  DollarSign,
  FileText,
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { DiarioVisitaCard } from "@/components/diario/DiarioVisitaCard";
import { fetchDiarioVisitasDetalhes } from "@/lib/diario-visitas";

interface FeedClienteProps {
  clienteId: string;
}

interface ClienteFeedEventoRow {
  id: string;
  cliente_id: string;
  tipo: string;
  titulo: string;
  usuario_nome: string | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  visivel_cliente: boolean;
  dados: Record<string, unknown> | null;
  created_at: string;
}

interface ClienteAtividadeRow {
  id: string;
  cliente_id: string;
  tipo: string;
  acao: string;
  descricao: string;
  usuario_id: string | null;
  created_at: string;
}

type FeedItem =
  | {
      id: string;
      created_at: string;
      kind: "visita";
      visitId: string;
      title: string;
      userName: string | null;
    }
  | {
      id: string;
      created_at: string;
      kind: "evento";
      tipo: string;
      title: string;
      userName: string | null;
    }
  | {
      id: string;
      created_at: string;
      kind: "atividade";
      tipo: string;
      acao: string;
      description: string;
      userId: string | null;
    };

const semanticEventConfig: Record<string, { label: string; icon: ReactNode; className: string }> = {
  visita_diario: {
    label: "Visita",
    icon: <CalendarDays className="w-3.5 h-3.5" />,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  projeto_criado: {
    label: "Projeto",
    icon: <FolderKanban className="w-3.5 h-3.5" />,
    className: "bg-secondary text-secondary-foreground border-border",
  },
  projeto_status: {
    label: "Projeto",
    icon: <FolderKanban className="w-3.5 h-3.5" />,
    className: "bg-secondary text-secondary-foreground border-border",
  },
  proposta: {
    label: "Proposta",
    icon: <DollarSign className="w-3.5 h-3.5" />,
    className: "bg-accent text-accent-foreground border-border",
  },
};

const legacyTypeConfig: Record<string, { label: string; icon: ReactNode; className: string }> = {
  registro: {
    label: "Registro",
    icon: <FileText className="w-3.5 h-3.5" />,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  proposta: {
    label: "Proposta",
    icon: <DollarSign className="w-3.5 h-3.5" />,
    className: "bg-accent text-accent-foreground border-border",
  },
  projeto: {
    label: "Projeto",
    icon: <FolderKanban className="w-3.5 h-3.5" />,
    className: "bg-secondary text-secondary-foreground border-border",
  },
  cliente: {
    label: "Cadastro",
    icon: <Building2 className="w-3.5 h-3.5" />,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const acaoIcon: Record<string, ReactNode> = {
  criado: <Plus className="w-3 h-3" />,
  atualizado: <Pencil className="w-3 h-3" />,
  excluido: <Trash2 className="w-3 h-3" />,
  status_alterado: <ArrowRightLeft className="w-3 h-3" />,
};

const fallbackEventConfig = {
  label: "Evento",
  icon: <Building2 className="w-3.5 h-3.5" />,
  className: "bg-muted text-muted-foreground border-border",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function GenericFeedCard({
  icon,
  className,
  title,
  badgeLabel,
  time,
  userName,
}: {
  icon: ReactNode;
  className: string;
  title: string;
  badgeLabel: string;
  time: string;
  userName: string;
}) {
  return (
    <article className="card-botanical p-3 animate-fade-in flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${className}`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" />
            {userName}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {time}
          </span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${className}`}>
            {badgeLabel}
          </Badge>
        </div>
      </div>
    </article>
  );
}

export function FeedCliente({ clienteId }: FeedClienteProps) {
  const { data: feedData, isLoading } = useQuery({
    queryKey: ["cliente-feed", clienteId],
    queryFn: async () => {
      const [eventsResult, atividadesResult] = await Promise.all([
        supabase
          .from("cliente_feed_eventos" as never)
          .select("*")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("cliente_atividades")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (atividadesResult.error) throw atividadesResult.error;

      return {
        events: ((eventsResult.data as unknown as ClienteFeedEventoRow[]) ?? []),
        atividades: (atividadesResult.data ?? []) as ClienteAtividadeRow[],
      };
    },
    enabled: !!clienteId,
  });

  const items = useMemo<FeedItem[]>(() => {
    const events = (feedData?.events || []).map((event) => {
      if (event.tipo === "visita_diario" && event.referencia_id) {
        return {
          id: `feed-${event.id}`,
          created_at: event.created_at,
          kind: "visita",
          visitId: event.referencia_id,
          title: event.titulo,
          userName: event.usuario_nome,
        } satisfies FeedItem;
      }

      return {
        id: `feed-${event.id}`,
        created_at: event.created_at,
        kind: "evento",
        tipo: event.tipo,
        title: event.titulo,
        userName: event.usuario_nome,
      } satisfies FeedItem;
    });

    const atividades = (feedData?.atividades || []).map((atividade) => ({
      id: `legacy-${atividade.id}`,
      created_at: atividade.created_at,
      kind: "atividade",
      tipo: atividade.tipo,
      acao: atividade.acao,
      description: atividade.descricao,
      userId: atividade.usuario_id,
    }) satisfies FeedItem);

    return [...events, ...atividades].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }, [feedData]);

  const visitIds = useMemo(
    () => items.filter((item): item is Extract<FeedItem, { kind: "visita" }> => item.kind === "visita").map((item) => item.visitId),
    [items],
  );

  const userIds = useMemo(
    () => Array.from(new Set(items.filter((item): item is Extract<FeedItem, { kind: "atividade" }> => item.kind === "atividade").map((item) => item.userId).filter(Boolean))) as string[],
    [items],
  );

  const { data: visitas = [] } = useQuery({
    queryKey: ["cliente-feed-visitas", visitIds],
    queryFn: () => fetchDiarioVisitasDetalhes({ visitaIds: visitIds }),
    enabled: visitIds.length > 0,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-feed", userIds],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome").in("id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  const visitMap = useMemo(() => new Map(visitas.map((visita) => [visita.id, visita])), [visitas]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.nome])), [profiles]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Nenhuma atividade registrada ainda. As movimentações aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  const grouped = new Map<string, FeedItem[]>();
  items.forEach((item) => {
    const dateKey = format(new Date(item.created_at), "yyyy-MM-dd");
    const existing = grouped.get(dateKey) || [];
    existing.push(item);
    grouped.set(dateKey, existing);
  });

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateKey, groupedItems]) => (
        <div key={dateKey}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-semibold text-foreground">
              {format(new Date(dateKey), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3 pl-2">
            {groupedItems.map((item) => {
              const time = format(new Date(item.created_at), "HH:mm");

              if (item.kind === "visita") {
                const visita = visitMap.get(item.visitId);
                if (visita) {
                  return (
                    <DiarioVisitaCard
                      key={item.id}
                      visita={visita}
                      hideInternalNotes
                      footerLink={`/projetos/${visita.projeto_id}?tab=diario`}
                    />
                  );
                }

                const semanticConfig = semanticEventConfig.visita_diario;
                return (
                  <GenericFeedCard
                    key={item.id}
                    icon={semanticConfig.icon}
                    className={semanticConfig.className}
                    title={item.title}
                    badgeLabel={semanticConfig.label}
                    time={time}
                    userName={item.userName || "Equipe MFM"}
                  />
                );
              }

              if (item.kind === "evento") {
                const semanticConfig = semanticEventConfig[item.tipo] || fallbackEventConfig;
                return (
                  <GenericFeedCard
                    key={item.id}
                    icon={semanticConfig.icon}
                    className={semanticConfig.className}
                    title={item.title}
                    badgeLabel={semanticConfig.label}
                    time={time}
                    userName={item.userName || "Equipe MFM"}
                  />
                );
              }

              const legacyConfig = legacyTypeConfig[item.tipo] || fallbackEventConfig;
              const actionIcon = acaoIcon[item.acao] || acaoIcon.atualizado;
              const userName = item.userId ? profileMap.get(item.userId) || "Usuário" : "Sistema";

              return (
                <article key={item.id} className="card-botanical p-3 animate-fade-in flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${legacyConfig.className}`}>
                    {legacyConfig.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {userName}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {time}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${legacyConfig.className}`}>
                        {actionIcon}
                        {legacyConfig.label}
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
