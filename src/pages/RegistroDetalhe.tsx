import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin,
  Users, 
  User, 
  Briefcase, 
  Package,
  Loader2,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Play
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RegistroCompleto {
  id: string;
  data_servico: string;
  tipo: string;
  status: string;
  descricao: string;
  solicitante: string | null;
  observacoes_internas: string | null;
  midia: { url: string; type?: string }[] | null;
  cliente: {
    id: string;
    nome: string;
  };
  trecho: {
    nome: string;
  } | null;
  proposta: {
    codigo: string;
    titulo: string;
  } | null;
  categorias: { id: string; nome: string; cor: string }[];
  equipePresente: string[];
  executores: string[];
  insumos: { nome: string; quantidade: number; unidade: string }[];
}

const tipoLabels: Record<string, string> = {
  manutenção: "Manutenção",
  manutencao: "Manutenção",
  implantação: "Implantação",
  implantacao: "Implantação",
  entrega: "Entrega",
  visita_tecnica: "Visita Técnica",
  recebimento: "Recebimento",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  realizado: { label: "Realizado", className: "bg-green-500/20 text-green-700 border-green-500/30" },
  agendado: { label: "Agendado", className: "bg-blue-500/20 text-blue-700 border-blue-500/30" },
  cancelado: { label: "Cancelado", className: "bg-red-500/20 text-red-700 border-red-500/30" },
};

export default function RegistroDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Buscar registro completo
  const { data: registro, isLoading, error } = useQuery({
    queryKey: ["registro-detalhe", id],
    queryFn: async () => {
      if (!id) return null;

      // Buscar registro
      const { data: reg, error: regError } = await supabase
        .from("registros")
        .select(`
          id,
          data_servico,
          tipo,
          status,
          descricao,
          solicitante,
          observacoes_internas,
          midia,
          cliente_id,
          trecho_id,
          proposta_id,
          categorias_ids,
          equipe_presente_ids,
          executores_ids
        `)
        .eq("id", id)
        .single();

      if (regError) throw regError;
      if (!reg) return null;

      // Buscar cliente
      const { data: cliente } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("id", reg.cliente_id)
        .single();

      // Buscar trecho se existir
      let trecho = null;
      if (reg.trecho_id) {
        const { data: t } = await supabase
          .from("trechos")
          .select("nome")
          .eq("id", reg.trecho_id)
          .single();
        trecho = t;
      }

      // Buscar proposta se existir
      let proposta = null;
      if (reg.proposta_id) {
        const { data: p } = await supabase
          .from("propostas")
          .select("codigo, titulo")
          .eq("id", reg.proposta_id)
          .single();
        proposta = p;
      }

      // Buscar categorias
      let categorias: { id: string; nome: string; cor: string }[] = [];
      if (reg.categorias_ids && reg.categorias_ids.length > 0) {
        const { data: cats } = await supabase
          .from("categorias_servico")
          .select("id, nome, cor")
          .in("id", reg.categorias_ids);
        categorias = cats || [];
      }

      // Buscar colaboradores para nomes
      const allIds = [...(reg.equipe_presente_ids || []), ...(reg.executores_ids || [])];
      let colaboradorMap = new Map<string, string>();
      if (allIds.length > 0) {
        const { data: cols } = await supabase
          .from("colaboradores")
          .select("id, nome")
          .in("id", allIds);
        colaboradorMap = new Map((cols || []).map(c => [c.id, c.nome]));
      }

      // Buscar insumos
      let insumos: { nome: string; quantidade: number; unidade: string }[] = [];
      const { data: regInsumos } = await supabase
        .from("registro_insumos")
        .select("quantidade, insumo_id")
        .eq("registro_id", id);

      if (regInsumos && regInsumos.length > 0) {
        const insumoIds = regInsumos.map(ri => ri.insumo_id);
        const { data: insumosData } = await supabase
          .from("insumos")
          .select("id, nome, unidade")
          .in("id", insumoIds);

        const insumoMap = new Map((insumosData || []).map(i => [i.id, { nome: i.nome, unidade: i.unidade }]));
        insumos = regInsumos.map(ri => {
          const ins = insumoMap.get(ri.insumo_id);
          return {
            nome: ins?.nome || "Insumo",
            quantidade: ri.quantidade,
            unidade: ins?.unidade || "un",
          };
        });
      }

      // Parse midia
      let midiaArray: { url: string; type?: string }[] = [];
      if (reg.midia) {
        if (Array.isArray(reg.midia)) {
          midiaArray = reg.midia.map((m: any) => {
            if (typeof m === 'string') return { url: m };
            return m;
          });
        }
      }

      return {
        id: reg.id,
        data_servico: reg.data_servico,
        tipo: reg.tipo,
        status: reg.status,
        descricao: reg.descricao,
        solicitante: reg.solicitante,
        observacoes_internas: reg.observacoes_internas,
        midia: midiaArray,
        cliente: cliente || { id: reg.cliente_id, nome: "Cliente" },
        trecho,
        proposta,
        categorias,
        equipePresente: (reg.equipe_presente_ids || []).map((id: string) => colaboradorMap.get(id) || "Desconhecido"),
        executores: (reg.executores_ids || []).map((id: string) => colaboradorMap.get(id) || "Desconhecido"),
        insumos,
      } as RegistroCompleto;
    },
    enabled: !!id,
  });

  const handleCancelar = async () => {
    if (!id) return;
    
    try {
      await supabase
        .from("registros")
        .update({ status: "cancelado" })
        .eq("id", id);
      
      toast({
        title: "Registro cancelado",
        description: "O registro foi marcado como cancelado.",
      });
      navigate(-1);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o registro.",
        variant: "destructive",
      });
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    if (registro?.midia) {
      setLightboxIndex((prev) => (prev + 1) % registro.midia!.length);
    }
  };

  const prevImage = () => {
    if (registro?.midia) {
      setLightboxIndex((prev) => (prev - 1 + registro.midia!.length) % registro.midia!.length);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Error or not found
  if (error || !registro) {
    return (
      <AppLayout>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Link>
        <div className="text-center py-24">
          <h2 className="text-xl font-semibold text-foreground mb-2">Registro não encontrado</h2>
          <p className="text-muted-foreground">O registro solicitado não existe ou foi removido.</p>
        </div>
      </AppLayout>
    );
  }

  const statusInfo = statusConfig[registro.status] || statusConfig.realizado;

  return (
    <AppLayout>
      {/* Back Button */}
      <Link 
        to={`/clientes/${registro.cliente.id}?tab=diario`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para {registro.cliente.nome}</span>
      </Link>

      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className={statusInfo.className}>
                {statusInfo.label}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(registro.data_servico).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {tipoLabels[registro.tipo] || registro.tipo}
            </h1>
            {registro.trecho && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {registro.trecho.nome}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" disabled>
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
            {registro.status !== "cancelado" && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={handleCancelar}
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* Categorias */}
        {registro.categorias.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {registro.categorias.map((cat) => (
              <span 
                key={cat.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: `${cat.cor}20`,
                  color: cat.cor,
                  border: `1px solid ${cat.cor}40`
                }}
              >
                {cat.nome}
              </span>
            ))}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descrição */}
            <section className="card-botanical p-5">
              <h2 className="font-semibold text-foreground mb-3">Descrição do Serviço</h2>
              <p className="text-foreground whitespace-pre-wrap">{registro.descricao}</p>
            </section>

            {/* Observações Internas */}
            {registro.observacoes_internas && (
              <section className="card-botanical p-5 bg-muted/30">
                <h2 className="font-semibold text-foreground mb-3">Observações Internas</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{registro.observacoes_internas}</p>
              </section>
            )}

            {/* Mídia */}
            {registro.midia && registro.midia.length > 0 && (
              <section className="card-botanical p-5">
                <h2 className="font-semibold text-foreground mb-3">
                  Fotos e Vídeos ({registro.midia.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {registro.midia.map((m, idx) => {
                    const isVideo = m.type?.startsWith('video') || m.url.match(/\.(mp4|webm|mov)$/i);
                    return (
                      <button
                        key={idx}
                        onClick={() => openLightbox(idx)}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                      >
                        {isVideo ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/10">
                            <Play className="w-10 h-10 text-white drop-shadow-lg" />
                            <video src={m.url} className="absolute inset-0 w-full h-full object-cover -z-10" />
                          </div>
                        ) : (
                          <img 
                            src={m.url} 
                            alt={`Mídia ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Proposta vinculada */}
            {registro.proposta && (
              <section className="card-botanical p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Proposta</h3>
                <p className="text-foreground font-medium">
                  {registro.proposta.codigo}
                </p>
                <p className="text-sm text-muted-foreground">{registro.proposta.titulo}</p>
              </section>
            )}

            {/* Equipe */}
            {registro.equipePresente.length > 0 && (
              <section className="card-botanical p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Equipe do Dia
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {registro.equipePresente.map((nome, idx) => (
                    <span key={idx} className="text-sm bg-muted px-2 py-0.5 rounded">
                      {nome}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Executores */}
            {registro.executores.length > 0 && (
              <section className="card-botanical p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  Executores
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {registro.executores.map((nome, idx) => (
                    <span key={idx} className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {nome}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Solicitante */}
            {registro.solicitante && (
              <section className="card-botanical p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  Solicitante
                </h3>
                <p className="text-foreground">{registro.solicitante}</p>
              </section>
            )}

            {/* Insumos */}
            {registro.insumos.length > 0 && (
              <section className="card-botanical p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  Insumos Utilizados
                </h3>
                <ul className="space-y-1">
                  {registro.insumos.map((ins, idx) => (
                    <li key={idx} className="text-sm text-foreground">
                      {ins.nome} — {ins.quantidade} {ins.unidade}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {registro.midia && registro.midia.length > 0 && (
            <div className="relative">
              {/* Navigation */}
              {registro.midia.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              
              {/* Content */}
              <div className="flex items-center justify-center min-h-[60vh]">
                {registro.midia[lightboxIndex]?.type?.startsWith('video') || 
                 registro.midia[lightboxIndex]?.url.match(/\.(mp4|webm|mov)$/i) ? (
                  <video 
                    src={registro.midia[lightboxIndex].url}
                    controls
                    className="max-w-full max-h-[80vh]"
                  />
                ) : (
                  <img 
                    src={registro.midia[lightboxIndex]?.url}
                    alt={`Mídia ${lightboxIndex + 1}`}
                    className="max-w-full max-h-[80vh] object-contain"
                  />
                )}
              </div>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {lightboxIndex + 1} / {registro.midia.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
