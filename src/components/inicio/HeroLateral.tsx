import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Cake,
  Calendar,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Sun,
} from "lucide-react";
import {
  addDays,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

/** Coluna lateral da faixa-herói: Clima (topo) + Aniversários & Eventos (2 semanas). */
type ClimaData = {
  cidade: string | null;
  atual: { temperatura: number | null; codigo: number | null };
  hoje: {
    max: number | null;
    min: number | null;
    chuva_mm: number | null;
    chuva_prob: number | null;
    codigo: number | null;
  };
};

type ItemAgenda = {
  id: string;
  data: string; // ISO YYYY-MM-DD
  titulo: string;
  tipo: "aniversario" | "evento";
  href: string;
  demo?: boolean;
};

const SEDE = { lat: -23.5505, lon: -46.6333, nome: "São Paulo" };
const STORAGE_KEY = "clima:coords";

function iconePorCodigo(codigo: number | null) {
  if (codigo === null) return Cloud;
  if (codigo === 0) return Sun;
  if (codigo <= 2) return CloudSun;
  if (codigo === 3) return Cloud;
  if (codigo >= 45 && codigo <= 48) return Cloud;
  if (codigo >= 51 && codigo <= 67) return CloudRain;
  if (codigo >= 71 && codigo <= 77) return CloudSnow;
  if (codigo >= 80 && codigo <= 82) return CloudRain;
  if (codigo >= 95) return CloudLightning;
  return Cloud;
}

/* ── Bloco Clima (compacto, sem cartão) ────────────────────────────── */
function ClimaBloco() {
  const [dados, setDados] = useState<ClimaData | null>(null);
  const [origem, setOrigem] = useState<"local" | "sede">("sede");
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");

  const carregar = async (lat: number, lon: number, marca: "local" | "sede") => {
    try {
      const base = import.meta.env.VITE_SUPABASE_URL as string;
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch(`${base}/functions/v1/clima?lat=${lat}&lon=${lon}`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as ClimaData;
      setDados(json);
      setOrigem(marca);
      setEstado("ok");
    } catch {
      setEstado("erro");
    }
  };

  useEffect(() => {
    const saved = (() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as { lat: number; lon: number }) : null;
      } catch {
        return null;
      }
    })();
    if (saved) return void carregar(saved.lat, saved.lon, "local");
    if (!("geolocation" in navigator)) return void carregar(SEDE.lat, SEDE.lon, "sede");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          );
        } catch {}
        carregar(pos.coords.latitude, pos.coords.longitude, "local");
      },
      () => carregar(SEDE.lat, SEDE.lon, "sede"),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  if (estado === "erro") return null;
  const Icon = iconePorCodigo(dados?.hoje.codigo ?? dados?.atual.codigo ?? null);
  const cor = "hsl(var(--hero-band-fg))";
  const corSuave = "hsl(var(--hero-band-fg) / 0.72)";

  if (estado !== "ok" || !dados) {
    return (
      <div className="flex items-center gap-2 text-[12.5px]" style={{ color: corSuave }}>
        <Cloud className="w-4 h-4 opacity-70" />
        <span>Carregando clima…</span>
      </div>
    );
  }

  return (
    <Link
      to="/clima"
      aria-label="Clima de hoje, ver semana"
      className="group flex items-center gap-3 rounded-lg -mx-2 px-2 py-1 hover:bg-white/[0.06] transition-colors"
    >
      <Icon className="w-9 h-9 shrink-0" style={{ color: cor }} />
      <div className="flex flex-col leading-tight min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-sans tabular-nums text-[24px] font-semibold"
            style={{ color: cor }}
          >
            {dados.atual.temperatura !== null ? `${Math.round(dados.atual.temperatura)}°` : "—"}
          </span>
          <span className="font-sans tabular-nums text-[11.5px]" style={{ color: corSuave }}>
            {dados.hoje.min !== null ? Math.round(dados.hoje.min) : "—"}° ·{" "}
            {dados.hoje.max !== null ? Math.round(dados.hoje.max) : "—"}°
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] mt-0.5" style={{ color: corSuave }}>
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {dados.cidade || SEDE.nome}
              {origem === "sede" && " · sede"}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            <span className="font-sans tabular-nums">{dados.hoje.chuva_prob ?? 0}%</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Bloco Aniversários + Eventos (2 semanas) ─────────────────────── */
const DEMO_ANIVERSARIOS: ItemAgenda[] = [
  {
    id: "demo-b1",
    data: format(new Date(), "yyyy-MM-dd"),
    titulo: "Juliana Falconi (Cliente)",
    tipo: "aniversario",
    href: "/clientes",
    demo: true,
  },
];

function AgendaBloco() {
  const hoje = useMemo(() => new Date(), []);
  const inicio = useMemo(() => startOfWeek(hoje, { weekStartsOn: 1 }), [hoje]);
  const fim = useMemo(() => endOfWeek(addDays(inicio, 7), { weekStartsOn: 1 }), [inicio]);

  const [eventos, setEventos] = useState<ItemAgenda[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("calendario_eventos")
          .select("id, titulo, data, tipo")
          .gte("data", format(inicio, "yyyy-MM-dd"))
          .lte("data", format(fim, "yyyy-MM-dd"))
          .order("data", { ascending: true });
        setEventos(
          (data || []).map((e: any) => ({
            id: e.id,
            data: e.data,
            titulo: e.titulo,
            tipo: "evento",
            href: "/calendario",
          })),
        );
      } catch {
        setEventos([]);
      }
    })();
  }, [inicio, fim]);

  const itens = useMemo<ItemAgenda[]>(() => {
    const arr = [...eventos, ...DEMO_ANIVERSARIOS].filter((i) => {
      const d = parseISO(i.data);
      return d >= inicio && d <= fim;
    });
    return arr.sort((a, b) => a.data.localeCompare(b.data));
  }, [eventos, inicio, fim]);

  const proxSemInicio = useMemo(() => addDays(inicio, 7), [inicio]);
  const grupoAtual = itens.filter((i) => parseISO(i.data) < proxSemInicio);
  const grupoProx = itens.filter((i) => parseISO(i.data) >= proxSemInicio);

  const cor = "hsl(var(--hero-band-fg))";
  const corSuave = "hsl(var(--hero-band-fg) / 0.7)";

  const render = (grupo: ItemAgenda[]) =>
    grupo.length === 0 ? (
      <p className="text-[12px] italic" style={{ color: "hsl(var(--hero-band-fg) / 0.55)" }}>
        Sem compromissos
      </p>
    ) : (
      <ul className="flex flex-col gap-1.5">
        {grupo.slice(0, 4).map((i) => {
          const d = parseISO(i.data);
          const eHoje = isSameDay(d, hoje);
          const Icon = i.tipo === "aniversario" ? Cake : Calendar;
          return (
            <li key={i.id}>
              <Link
                to={i.href}
                className="flex items-start gap-2 text-[12.5px] hover:opacity-90 transition-opacity"
                style={{ color: cor }}
              >
                <Icon
                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                  style={{
                    color:
                      i.tipo === "aniversario"
                        ? "hsl(var(--rose-foreground))"
                        : "hsl(var(--hero-band-fg) / 0.8)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="font-sans tabular-nums text-[11px] uppercase tracking-wide shrink-0"
                      style={{ color: corSuave }}
                    >
                      {eHoje ? "Hoje" : format(d, "EEE dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="truncate">{i.titulo}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div
          className="text-[10.5px] uppercase tracking-[0.14em] mb-1.5"
          style={{ color: corSuave }}
        >
          Esta semana
        </div>
        {render(grupoAtual)}
      </div>
      <div>
        <div
          className="text-[10.5px] uppercase tracking-[0.14em] mb-1.5"
          style={{ color: corSuave }}
        >
          Próxima semana
        </div>
        {render(grupoProx)}
      </div>
    </div>
  );
}

export function HeroLateral() {
  return (
    <div className="flex flex-col gap-4 min-w-0 w-full">
      <ClimaBloco />
      <div
        aria-hidden
        className="h-px w-full"
        style={{ background: "hsl(var(--hero-band-fg) / 0.14)" }}
      />
      <AgendaBloco />
    </div>
  );
}
