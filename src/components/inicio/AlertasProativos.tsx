import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { AlertBar } from "@/components/blocks/AlertBar";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Sprout } from "lucide-react";

export function AlertasProativos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  // Colaborador do usuário
  const { data: colab } = useQuery({
    queryKey: ["colab-me-alertas", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: liberacoes = [] } = useQuery({
    queryKey: ["alertas-liberacoes", colab?.id],
    enabled: !!colab?.id,
    queryFn: async () => {
      const in15 = new Date();
      in15.setDate(in15.getDate() + 15);
      const { data, error } = await supabase
        .from("colaborador_liberacoes")
        .select("id, colaborador_id, condominio_id, data_validade, condominios(nome), colaboradores!inner(nome)")
        .eq("colaborador_id", colab!.id)
        .lte("data_validade", in15.toISOString().slice(0, 10))
        .gte("data_validade", today.toISOString().slice(0, 10));
      if (error) return [];
      return data as any[];
    },
  });

  const { data: retornos = [] } = useQuery({
    queryKey: ["alertas-retornos", colab?.id],
    enabled: !!colab?.id,
    queryFn: async () => {
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      const { data, error } = await supabase
        .from("projetos")
        .select("id, titulo, data_retorno_prometida, clientes(nome)")
        .eq("responsavel_id", colab!.id)
        .not("data_retorno_prometida", "is", null)
        .lte("data_retorno_prometida", in7.toISOString().slice(0, 10))
        .gte("data_retorno_prometida", today.toISOString().slice(0, 10));
      if (error) return [];
      return data as any[];
    },
  });

  const { data: prazos = [] } = useQuery({
    queryKey: ["alertas-prazos", colab?.id],
    enabled: !!colab?.id,
    queryFn: async () => {
      const in3 = new Date();
      in3.setDate(in3.getDate() + 3);
      const { data, error } = await supabase
        .from("demandas")
        .select("id, titulo, prazo_final")
        .eq("responsavel_atual_id", colab!.id)
        .eq("arquivada", false)
        .not("prazo_final", "is", null)
        .lte("prazo_final", in3.toISOString().slice(0, 10))
        .gte("prazo_final", today.toISOString().slice(0, 10));
      if (error) return [];
      return data as any[];
    },
  });

  const contagem = (d: string) => {
    const dias = differenceInCalendarDays(parseISO(d), today);
    if (dias === 0) return "vence hoje";
    if (dias === 1) return "falta 1 dia";
    return `faltam ${dias} dias`;
  };

  const total = liberacoes.length + retornos.length + prazos.length;

  return (
    <SurfaceCard padded>
      <SurfaceCardHeader label="Precisa da sua atenção" />
      {total === 0 ? (
        <div className="flex items-center gap-3 py-4 text-muted-foreground">
          <Sprout className="w-5 h-5 text-sage" />
          <span className="type-body">Nada urgente por aqui.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {liberacoes.map((l) => {
            const dias = differenceInCalendarDays(parseISO(l.data_validade), today);
            return (
              <motion.div
                key={"lib-" + l.id}
                animate={dias === 0 ? { scale: [1, 1.02, 1] } : undefined}
                transition={{ repeat: Infinity, duration: 2.4 }}
              >
                <AlertBar
                  tone={dias === 0 ? "danger" : "attention"}
                  title={`Liberação em ${l.condominios?.nome || "condomínio"} — ${contagem(l.data_validade)}`}
                  onClick={() => navigate("/equipe")}
                />
              </motion.div>
            );
          })}
          {retornos.map((p) => (
            <AlertBar
              key={"ret-" + p.id}
              tone="warn"
              title={`Retorno prometido: ${p.clientes?.nome || p.titulo} — ${contagem(p.data_retorno_prometida)}`}
              onClick={() => navigate("/crm")}
            />
          ))}
          {prazos.map((d) => (
            <AlertBar
              key={"prz-" + d.id}
              tone="attention"
              title={`Prazo interno: ${d.titulo} — ${contagem(d.prazo_final)}`}
              onClick={() => navigate("/agenda")}
            />
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
