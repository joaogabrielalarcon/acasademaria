import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  MessageCircle,
  Plus,
  Phone,
  CalendarDays,
  Flame,
  FileText,
  ClipboardList,
  Newspaper,
  Handshake,
  Sparkles,
  User,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  ExternalLink,
  Archive,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Chip } from "@/components/primitives/Chip";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { InlineField } from "@/components/primitives/InlineField";
import { FeedItem } from "@/components/blocks/FeedItem";
import { useProjeto } from "@/hooks/useProjetos";
import { useCliente } from "@/hooks/useCliente";
import { useColaboradoresAtivosBasico } from "@/hooks/useColaboradores";
import {
  FUNIL_STATUS,
  funilLabel,
  useTarefasProjeto,
  useCriarTarefa,
  useFeedProjeto,
  useRegistrarFeed,
  usePropostasDoProjeto,
  useAtualizarProjeto,
} from "@/hooks/usePainelProjeto";
import { useArquivarProjeto } from "@/hooks/useProjetosPipeline";
import { ClienteDrawer, useClienteDrawer } from "@/components/projeto/painel/ClienteDrawer";
import { cn } from "@/lib/utils";

/* ---------- helpers ---------- */

const fmtDate = (d?: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

function farolPrazo(prazo?: string | null): { tone: "danger" | "attention" | "warn" | "ok" | "muted"; label: string } {
  if (!prazo) return { tone: "muted", label: "sem prazo" };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(prazo + "T00:00:00");
  const diff = Math.round((d.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return { tone: "danger", label: `atrasado ${Math.abs(diff)}d` };
  if (diff === 0) return { tone: "attention", label: "hoje" };
  if (diff <= 3) return { tone: "warn", label: `em ${diff}d` };
  return { tone: "ok", label: fmtDate(prazo) };
}

const TONE_CHIP: Record<string, "default" | "outline" | "navy" | "active"> = {
  muted: "outline",
  navy: "navy",
  primary: "active",
  ok: "navy",
  danger: "active",
};

/* ---------- página ---------- */

export default function PainelProjeto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reduce = useReducedMotion();

  const { data: projeto, isLoading, error } = useProjeto(id);
  const { data: cliente } = useCliente(projeto?.cliente_id);
  const { data: colaboradores = [] } = useColaboradoresAtivosBasico();

  const drawer = useClienteDrawer();
  const [tab, setTab] = useState("resumo");

  const atualizar = useAtualizarProjeto();
  const arquivarProjeto = useArquivarProjeto();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !projeto) {
    return (
      <AppLayout>
        <SurfaceCard className="max-w-2xl mx-auto text-center py-10">
          <AlertTriangle className="w-8 h-8 text-attention mx-auto mb-3" />
          <h2 className="font-serif text-2xl text-foreground">Não consegui abrir este projeto</h2>
          <p className="text-muted-foreground mt-2">Pode ter sido removido ou você não tem acesso.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </SurfaceCard>
      </AppLayout>
    );
  }

  const statusMeta = FUNIL_STATUS.find((s) => s.value === projeto.status) ?? FUNIL_STATUS[0];
  const respNome = colaboradores.find((c) => c.id === projeto.responsavel_id)?.nome ?? null;

  const trocarStatus = (novo: string) => {
    if (novo === projeto.status) return;
    atualizar.mutate(
      {
        id: projeto.id,
        patch: { status: novo },
        feed: {
          cliente_id: projeto.cliente_id,
          titulo: `Status: ${funilLabel(projeto.status)} → ${funilLabel(novo)}`,
          dados: { de: projeto.status, para: novo },
        },
      },
      {
        onSuccess: () => toast({ title: "Status atualizado", description: funilLabel(novo) }),
        onError: (e: any) => toast({ title: "Não foi possível", description: e.message, variant: "destructive" }),
      },
    );
  };

  const salvarCampo = (patch: Record<string, any>, feedTitulo: string) =>
    atualizar.mutateAsync({
      id: projeto.id,
      patch,
      feed: { cliente_id: projeto.cliente_id, titulo: feedTitulo, dados: patch },
    });

  const contatoWhats = cliente?.telefone ? `https://wa.me/${cliente.telefone.replace(/\D/g, "")}` : null;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/projetos/${projeto.id}`}>
              Ver execução <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Cabeçalho fixo */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          className="sticky top-2 z-20"
        >
          <SurfaceCard className="pl-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-[34px] leading-tight text-foreground">{projeto.titulo}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[14px] text-muted-foreground">
                  {cliente && (
                    <button
                      onClick={() => drawer.push(cliente.id)}
                      className="text-foreground font-medium hover:text-primary transition-colors"
                    >
                      {cliente.nome}
                    </button>
                  )}
                  {cliente?.condominio && <span>· {cliente.condominio}</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Chip variant="outline">{projeto.tipo === "manutencao" ? "Manutenção" : "Implantação"}</Chip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
                          statusMeta.tone === "primary"
                            ? "bg-primary text-primary-foreground"
                            : statusMeta.tone === "danger"
                            ? "bg-attention-soft text-attention"
                            : statusMeta.tone === "ok"
                            ? "bg-navy-soft text-accent"
                            : "bg-navy-soft text-accent",
                        )}
                      >
                        {statusMeta.label}
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Mover no funil</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {FUNIL_STATUS.map((s) => (
                        <DropdownMenuItem key={s.value} onClick={() => trocarStatus(s.value)}>
                          <span className={cn("w-2 h-2 rounded-full mr-2", s.value === projeto.status ? "bg-primary" : "bg-muted-foreground/40")} />
                          {s.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {contatoWhats && (
                <Button asChild variant="outline" size="sm">
                  <a href={contatoWhats} target="_blank" rel="noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </a>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 mt-5 pt-4 border-t border-border/60">
              <InlineField
                label="Substatus"
                value={projeto.substatus ?? ""}
                emptyLabel="definir"
                onSave={async (v) => {
                  await salvarCampo({ substatus: v || null }, `Substatus: ${v || "removido"}`);
                }}
              />
              <InlineField
                label="Temperatura"
                value={projeto.temperatura ?? ""}
                emptyLabel="definir"
                onSave={async (v) => {
                  const val = v.toLowerCase();
                  const ok = ["quente", "morno", "frio", ""].includes(val);
                  if (!ok) {
                    toast({ title: "Use: quente, morno ou frio", variant: "destructive" });
                    return;
                  }
                  await salvarCampo({ temperatura: val || null }, `Temperatura: ${val || "removida"}`);
                }}
              />
              <InlineField
                label="Prometido ao cliente"
                value={projeto.data_prometida_cliente ? fmtDate(projeto.data_prometida_cliente) : ""}
                placeholder="dd/mm/aaaa"
                emptyLabel="informar"
                onSave={async (v) => {
                  const iso = parseDateBR(v);
                  if (v && !iso) {
                    toast({ title: "Data inválida", description: "Use dd/mm/aaaa", variant: "destructive" });
                    return;
                  }
                  await salvarCampo({ data_prometida_cliente: iso }, `Prometido ao cliente: ${v || "removido"}`);
                }}
              />
              <InlineField
                label="Meta interna"
                value={projeto.data_alvo_interna ? fmtDate(projeto.data_alvo_interna) : ""}
                placeholder="dd/mm/aaaa"
                emptyLabel="informar"
                onSave={async (v) => {
                  const iso = parseDateBR(v);
                  if (v && !iso) {
                    toast({ title: "Data inválida", description: "Use dd/mm/aaaa", variant: "destructive" });
                    return;
                  }
                  await salvarCampo({ data_alvo_interna: iso }, `Meta interna: ${v || "removida"}`);
                }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="type-label">Responsável</span>
              <Select
                value={projeto.responsavel_id ?? "__none__"}
                onValueChange={async (v) => {
                  const val = v === "__none__" ? null : v;
                  const nome = colaboradores.find((c) => c.id === val)?.nome ?? "removido";
                  await salvarCampo({ responsavel_id: val }, `Responsável: ${nome}`);
                }}
              >
                <SelectTrigger className="h-8 w-[220px] text-[13px]">
                  <SelectValue placeholder="Definir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {respNome && <span className="text-[13px] text-muted-foreground">Atual: {respNome}</span>}
            </div>
          </SurfaceCard>
        </motion.div>

        {/* Abas */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start bg-muted/50">
            <TabsTrigger value="resumo"><Sparkles className="w-4 h-4 mr-2" />Resumo</TabsTrigger>
            <TabsTrigger value="tarefas"><ClipboardList className="w-4 h-4 mr-2" />Tarefas</TabsTrigger>
            <TabsTrigger value="feed"><Newspaper className="w-4 h-4 mr-2" />Feed</TabsTrigger>
            <TabsTrigger value="proposta"><FileText className="w-4 h-4 mr-2" />Proposta</TabsTrigger>
            <TabsTrigger value="relacionamento"><Handshake className="w-4 h-4 mr-2" />Relacionamento</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="mt-5">
            <TabResumo projetoId={projeto.id} clienteId={projeto.cliente_id} onOpenTab={setTab} projeto={projeto} />
          </TabsContent>
          <TabsContent value="tarefas" className="mt-5">
            <TabTarefas projetoId={projeto.id} clienteId={projeto.cliente_id} colaboradores={colaboradores} />
          </TabsContent>
          <TabsContent value="feed" className="mt-5">
            <TabFeed projetoId={projeto.id} clienteId={projeto.cliente_id} />
          </TabsContent>
          <TabsContent value="proposta" className="mt-5">
            <TabProposta projetoId={projeto.id} clienteId={projeto.cliente_id} />
          </TabsContent>
          <TabsContent value="relacionamento" className="mt-5">
            <TabRelacionamento projeto={projeto} onSalvar={salvarCampo} />
          </TabsContent>
        </Tabs>
      </div>

      <ClienteDrawer
        clienteId={drawer.current}
        open={drawer.open}
        onOpenChange={drawer.setOpen}
        breadcrumbFrom={projeto.titulo}
      />
    </AppLayout>
  );
}

function parseDateBR(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/* ---------- Aba: Resumo ---------- */

function TabResumo({
  projetoId,
  clienteId,
  projeto,
  onOpenTab,
}: {
  projetoId: string;
  clienteId: string;
  projeto: any;
  onOpenTab: (t: string) => void;
}) {
  const { data: tarefas = [], isLoading: lt } = useTarefasProjeto(projetoId);
  const { data: feed = [], isLoading: lf } = useFeedProjeto(projetoId, clienteId);
  const { data: propostas = [] } = usePropostasDoProjeto(projetoId);

  const abertas = tarefas.filter((t) => !t.arquivada && !t.status_saida);
  const atrasadas = abertas.filter((t) => t.prazo_final && new Date(t.prazo_final) < new Date(new Date().toDateString()));
  const proxima = [...abertas].sort((a, b) => {
    if (!a.prazo_final) return 1;
    if (!b.prazo_final) return -1;
    return a.prazo_final.localeCompare(b.prazo_final);
  })[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SurfaceCard className="lg:col-span-2">
        <SurfaceCardHeader label="Próximo passo" />
        {lt ? (
          <Skeleton className="h-16 w-full" />
        ) : proxima ? (
          <button
            onClick={() => onOpenTab("tarefas")}
            className="w-full text-left rounded-lg p-3 -m-3 hover:bg-primary-soft transition-colors"
          >
            <p className="font-serif text-xl text-foreground">{proxima.titulo}</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              {proxima.responsavel_nome ?? "Sem dono"} · {farolPrazo(proxima.prazo_final).label}
            </p>
          </button>
        ) : (
          <EmptyMini
            titulo="Sem próximo passo definido"
            desc="Crie uma tarefa para não perder a bola."
            cta={{ label: "+ tarefa", onClick: () => onOpenTab("tarefas") }}
          />
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceCardHeader label="Panorama" />
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Abertas" value={abertas.length} onClick={() => onOpenTab("tarefas")} />
          <Metric label="Atrasadas" value={atrasadas.length} tone={atrasadas.length ? "danger" : "muted"} onClick={() => onOpenTab("tarefas")} />
          <Metric label="Propostas" value={propostas.length} onClick={() => onOpenTab("proposta")} />
        </div>
      </SurfaceCard>

      <SurfaceCard className="lg:col-span-2">
        <SurfaceCardHeader label="Últimas movimentações" action={
          <button className="text-[13px] text-primary hover:underline" onClick={() => onOpenTab("feed")}>
            ver tudo
          </button>
        } />
        {lf ? (
          <Skeleton className="h-24 w-full" />
        ) : feed.length === 0 ? (
          <EmptyMini titulo="Nada por aqui ainda" desc="Cada mudança de status vira um registro do feed." />
        ) : (
          <ul className="divide-y divide-border/60 -mx-2">
            {feed.slice(0, 5).map((e) => (
              <li key={e.id} className="px-2 py-2.5">
                <p className="text-[14px] text-foreground">{e.titulo}</p>
                <p className="text-[12px] text-muted-foreground">
                  {fmtDateTime(e.created_at)} {e.usuario_nome ? `· ${e.usuario_nome}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceCardHeader label="Datas" />
        <ul className="space-y-2 text-[14px]">
          <DataRow label="Prometido ao cliente" value={fmtDate(projeto.data_prometida_cliente)} />
          <DataRow label="Meta interna" value={fmtDate(projeto.data_alvo_interna)} />
          <DataRow label="Próximo contato" value={fmtDate(projeto.proximo_contato_em)} />
          <DataRow label="Retorno prometido" value={fmtDate(projeto.data_retorno_prometida)} />
        </ul>
      </SurfaceCard>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium tabular-nums">{value}</span>
    </li>
  );
}

function Metric({ label, value, onClick, tone = "muted" }: { label: string; value: number; onClick?: () => void; tone?: "muted" | "danger" }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-3 bg-muted/40 hover:bg-primary-soft transition-colors text-left"
    >
      <div className={cn("text-3xl font-semibold tabular-nums", tone === "danger" && value > 0 ? "text-attention" : "text-foreground")}>{value}</div>
      <div className="type-label mt-1">{label}</div>
    </button>
  );
}

function EmptyMini({ titulo, desc, cta }: { titulo: string; desc: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="text-center py-6">
      <Circle className="w-6 h-6 mx-auto text-muted-foreground/60" />
      <p className="mt-2 font-medium text-foreground">{titulo}</p>
      <p className="text-[13px] text-muted-foreground">{desc}</p>
      {cta && (
        <Button variant="outline" size="sm" className="mt-3" onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}

/* ---------- Aba: Tarefas ---------- */

function TabTarefas({
  projetoId,
  clienteId,
  colaboradores,
}: {
  projetoId: string;
  clienteId: string;
  colaboradores: { id: string; nome: string }[];
}) {
  const { data: tarefas = [], isLoading, error } = useTarefasProjeto(projetoId);
  const criar = useCriarTarefa();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [responsavel, setResponsavel] = useState<string>("");
  const [prazo, setPrazo] = useState("");

  const abertas = tarefas.filter((t) => !t.arquivada);

  const submit = async () => {
    if (!titulo.trim()) return toast({ title: "Dê um título à tarefa", variant: "destructive" });
    if (!responsavel) return toast({ title: "Tarefa precisa de dono", description: "Escolha quem fica responsável.", variant: "destructive" });
    const iso = prazo ? parseDateBR(prazo) : null;
    if (prazo && !iso) return toast({ title: "Prazo inválido", description: "Use dd/mm/aaaa", variant: "destructive" });
    try {
      await criar.mutateAsync({ projeto_id: projetoId, cliente_id: clienteId, titulo: titulo.trim(), responsavel_atual_id: responsavel, prazo_final: iso });
      toast({ title: "Tarefa criada" });
      setOpen(false);
      setTitulo("");
      setResponsavel("");
      setPrazo("");
    } catch (e: any) {
      toast({ title: "Não foi possível criar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <SurfaceCard padded={false} className="pl-1">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="font-serif text-2xl text-foreground">Tarefas deste projeto</h3>
          <p className="text-[13px] text-muted-foreground">Toda tarefa tem dono e prazo próprios.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> tarefa
        </Button>
      </div>

      {isLoading ? (
        <div className="px-5 pb-5"><Skeleton className="h-24 w-full" /></div>
      ) : error ? (
        <ErrorMini onRetry={() => window.location.reload()} />
      ) : abertas.length === 0 ? (
        <div className="px-5 pb-8">
          <EmptyMini titulo="Nenhuma tarefa por aqui" desc="Comece pelo que trava o projeto agora." cta={{ label: "+ primeira tarefa", onClick: () => setOpen(true) }} />
        </div>
      ) : (
        <div className="border-t border-border/60">
          {abertas.map((t) => {
            const farol = farolPrazo(t.prazo_final);
            return (
              <Link
                key={t.id}
                to={`/agenda?tarefa=${t.id}`}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-b-0 hover:bg-primary-soft/40 transition-colors",
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{t.titulo}</p>
                  <p className="text-[12px] text-muted-foreground truncate">
                    {t.responsavel_nome ?? <span className="text-attention font-medium">Sem dono</span>}
                    {t.prioridade && ` · ${t.prioridade}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium tabular-nums",
                    farol.tone === "danger" && "bg-attention-soft text-attention",
                    farol.tone === "attention" && "bg-primary text-primary-foreground",
                    farol.tone === "warn" && "bg-muted text-foreground",
                    farol.tone === "ok" && "bg-navy-soft text-accent",
                    farol.tone === "muted" && "bg-muted text-muted-foreground",
                  )}
                >
                  <CalendarDays className="w-3 h-3" />
                  {farol.label}
                </span>
                <Chip variant={t.status_saida ? "outline" : "navy"}>
                  {t.status_saida ? "Fechada" : "Aberta"}
                </Chip>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="type-label">Título</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: enviar proposta revisada" autoFocus />
            </div>
            <div>
              <label className="type-label">Responsável (obrigatório)</label>
              <Select value={responsavel} onValueChange={setResponsavel}>
                <SelectTrigger><SelectValue placeholder="Escolher dono" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="type-label">Prazo</label>
              <Input value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="dd/mm/aaaa" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} loading={criar.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SurfaceCard>
  );
}

/* ---------- Aba: Feed ---------- */

function TabFeed({ projetoId, clienteId }: { projetoId: string; clienteId: string }) {
  const { data: feed = [], isLoading, error } = useFeedProjeto(projetoId, clienteId);
  const registrar = useRegistrarFeed();
  const { toast } = useToast();
  const [texto, setTexto] = useState("");
  const [intercorrencia, setIntercorrencia] = useState(false);

  const submit = async () => {
    const t = texto.trim();
    if (!t) return;
    try {
      await registrar.mutateAsync({
        projeto_id: projetoId,
        cliente_id: clienteId,
        tipo: intercorrencia ? "intercorrencia" : "nota",
        titulo: t,
        dados: { intercorrencia },
      });
      setTexto("");
      setIntercorrencia(false);
      toast({ title: "Registro adicionado" });
    } catch (e: any) {
      toast({ title: "Não foi possível registrar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <SurfaceCard padded={false}>
        {isLoading ? (
          <div className="p-5"><Skeleton className="h-32 w-full" /></div>
        ) : error ? (
          <ErrorMini onRetry={() => window.location.reload()} />
        ) : feed.length === 0 ? (
          <div className="p-6">
            <EmptyMini titulo="Nada registrado ainda" desc="Mudanças de status entram aqui automaticamente. Adicione notas de reunião e contatos." />
          </div>
        ) : (
          <ul className="divide-y divide-border/60 p-2">
            {feed.map((e) => {
              const isIntercorrencia = e.tipo === "intercorrencia" || e.dados?.intercorrencia;
              const midia: string[] = Array.isArray(e.dados?.midia) ? e.dados.midia : [];
              return (
                <li key={e.id}>
                  <FeedItem
                    icon={iconeFeed(e.tipo)}
                    title={e.titulo}
                    meta={`${fmtDateTime(e.created_at)}${e.usuario_nome ? ` · ${e.usuario_nome}` : ""}`}
                    media={midia}
                    hasIssue={!!isIntercorrencia}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceCardHeader label="Novo registro" />
        <div className="space-y-3">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O que aconteceu? Reunião, ligação, decisão..."
            rows={5}
          />
          <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={intercorrencia}
              onChange={(e) => setIntercorrencia(e.target.checked)}
              className="rounded border-border"
            />
            Marcar como intercorrência
          </label>
          <Button className="w-full" onClick={submit} disabled={!texto.trim()} loading={registrar.isPending}>
            <Plus className="w-4 h-4 mr-1.5" /> registro
          </Button>
          <p className="text-[12px] text-muted-foreground">Anexo de mídia chega em breve — o feed já mostra imagens vindas de outras telas.</p>
        </div>
      </SurfaceCard>
    </div>
  );
}

function iconeFeed(tipo: string) {
  const map: Record<string, JSX.Element> = {
    projeto_alteracao: <Flame className="w-4 h-4" />,
    intercorrencia: <AlertTriangle className="w-4 h-4" />,
    nota: <MessageCircle className="w-4 h-4" />,
    contato: <Phone className="w-4 h-4" />,
  };
  return map[tipo] ?? <Circle className="w-4 h-4" />;
}

/* ---------- Aba: Proposta ---------- */

function TabProposta({ projetoId, clienteId }: { projetoId: string; clienteId: string }) {
  const { data: propostas = [], isLoading, refetch } = usePropostasDoProjeto(projetoId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!titulo.trim()) return toast({ title: "Dê um título à proposta", variant: "destructive" });
    setSalvando(true);
    try {
      const codigo = `P-${Date.now().toString().slice(-6)}`;
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("propostas").insert({
        cliente_id: clienteId,
        projeto_id: projetoId,
        codigo,
        titulo: titulo.trim(),
        valor: valor ? Number(valor.replace(/\./g, "").replace(",", ".")) : null,
      });
      if (error) throw error;
      toast({ title: "Proposta criada", description: codigo });
      setTitulo("");
      setValor("");
      setOpen(false);
      refetch();
    } catch (e: any) {
      toast({ title: "Não foi possível criar", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SurfaceCard padded={false}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="font-serif text-2xl text-foreground">Propostas do projeto</h3>
          <p className="text-[13px] text-muted-foreground">O construtor completo continua no orçamento; aqui você registra e acompanha.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> proposta
        </Button>
      </div>

      {isLoading ? (
        <div className="px-5 pb-5"><Skeleton className="h-16 w-full" /></div>
      ) : propostas.length === 0 ? (
        <div className="px-5 pb-8">
          <EmptyMini titulo="Nenhuma proposta ainda" desc="Registre a primeira quando enviar ao cliente." cta={{ label: "+ proposta", onClick: () => setOpen(true) }} />
        </div>
      ) : (
        <ul className="border-t border-border/60">
          {propostas.map((p: any) => (
            <li key={p.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-border/40 last:border-0">
              <span className="text-[12px] font-medium text-muted-foreground tabular-nums">{p.codigo}</span>
              <span className="text-foreground font-medium truncate">{p.titulo}</span>
              <Chip variant="outline">{p.status ?? "rascunho"}</Chip>
              <span className="tabular-nums text-foreground">
                {p.valor != null ? p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova proposta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="type-label">Título</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="type-label">Valor (opcional)</label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} loading={salvando}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SurfaceCard>
  );
}

/* ---------- Aba: Relacionamento ---------- */

function TabRelacionamento({
  projeto,
  onSalvar,
}: {
  projeto: any;
  onSalvar: (patch: Record<string, any>, feed: string) => Promise<any>;
}) {
  const { toast } = useToast();
  const [nota, setNota] = useState("");
  const [proximo, setProximo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const registrar = useRegistrarFeed();

  const registrarContato = async () => {
    if (!nota.trim()) return toast({ title: "Descreva o contato", variant: "destructive" });
    setSalvando(true);
    try {
      await registrar.mutateAsync({
        projeto_id: projeto.id,
        cliente_id: projeto.cliente_id,
        tipo: "contato",
        titulo: nota.trim(),
      });
      if (proximo) {
        const iso = parseDateBR(proximo);
        if (!iso) throw new Error("Data inválida (use dd/mm/aaaa)");
        await onSalvar({ proximo_contato_em: iso }, `Próximo contato: ${proximo}`);
      }
      setNota("");
      setProximo("");
      toast({ title: "Contato registrado" });
    } catch (e: any) {
      toast({ title: "Não foi possível", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SurfaceCard>
        <SurfaceCardHeader label="Situação" />
        <div className="space-y-1">
          <InlineField
            label="Temperatura"
            value={projeto.temperatura ?? ""}
            emptyLabel="definir"
            onSave={async (v) => {
              const val = v.toLowerCase();
              if (!["quente", "morno", "frio", ""].includes(val)) {
                toast({ title: "Use: quente, morno ou frio", variant: "destructive" });
                return;
              }
              await onSalvar({ temperatura: val || null }, `Temperatura: ${val || "removida"}`);
            }}
          />
          <InlineField
            label="Próximo contato"
            value={projeto.proximo_contato_em ? fmtDate(projeto.proximo_contato_em) : ""}
            emptyLabel="agendar"
            placeholder="dd/mm/aaaa"
            onSave={async (v) => {
              const iso = parseDateBR(v);
              if (v && !iso) {
                toast({ title: "Data inválida", variant: "destructive" });
                return;
              }
              await onSalvar({ proximo_contato_em: iso }, `Próximo contato: ${v || "removido"}`);
            }}
          />
          <InlineField
            label="Retorno prometido"
            value={projeto.data_retorno_prometida ? fmtDate(projeto.data_retorno_prometida) : ""}
            emptyLabel="informar"
            placeholder="dd/mm/aaaa"
            onSave={async (v) => {
              const iso = parseDateBR(v);
              if (v && !iso) {
                toast({ title: "Data inválida", variant: "destructive" });
                return;
              }
              await onSalvar({ data_retorno_prometida: iso }, `Retorno prometido: ${v || "removido"}`);
            }}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceCardHeader label="Registrar contato" />
        <div className="space-y-3">
          <Textarea rows={4} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Falei com o cliente sobre..." />
          <div>
            <label className="type-label">Próximo contato (opcional)</label>
            <Input value={proximo} onChange={(e) => setProximo(e.target.value)} placeholder="dd/mm/aaaa" />
          </div>
          <Button className="w-full" onClick={registrarContato} loading={salvando}>
            <Phone className="w-4 h-4 mr-1.5" /> registrar contato
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}

function ErrorMini({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-8 px-5">
      <AlertTriangle className="w-6 h-6 mx-auto text-attention" />
      <p className="mt-2 font-medium text-foreground">Alguma coisa não carregou</p>
      <p className="text-[13px] text-muted-foreground">Tente novamente em instantes.</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Tentar de novo</Button>
    </div>
  );
}
