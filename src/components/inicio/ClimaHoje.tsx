import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Cloud,
  CloudRain,
  CloudSun,
  Sun,
  CloudSnow,
  CloudLightning,
  Droplets,
  MapPin,
  ArrowRight,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

export function ClimaHoje() {
  const [estado, setEstado] = useState<
    "pedindo" | "carregando" | "ok" | "erro"
  >("pedindo");
  const [dados, setDados] = useState<ClimaData | null>(null);
  const [origem, setOrigem] = useState<"local" | "sede">("sede");

  const carregar = async (lat: number, lon: number, marca: "local" | "sede") => {
    setEstado("carregando");
    try {
      const base = import.meta.env.VITE_SUPABASE_URL as string;
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const url = `${base}/functions/v1/clima?lat=${lat}&lon=${lon}`;
      const res = await fetch(url, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      });
      if (!res.ok) throw new Error("clima indisponível");
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
        return raw ? JSON.parse(raw) as { lat: number; lon: number } : null;
      } catch { return null; }
    })();

    if (saved) {
      carregar(saved.lat, saved.lon, "local");
      return;
    }

    if (!("geolocation" in navigator)) {
      carregar(SEDE.lat, SEDE.lon, "sede");
      return;
    }

    setEstado("pedindo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ lat: latitude, lon: longitude }),
          );
        } catch {}
        carregar(latitude, longitude, "local");
      },
      () => carregar(SEDE.lat, SEDE.lon, "sede"),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  const Icon = iconePorCodigo(dados?.hoje.codigo ?? dados?.atual.codigo ?? null);

  return (
    <div
      className={cn(
        "rounded-lg bg-card shadow-e2 card-filete px-4 py-3 flex flex-col gap-2 min-w-[240px]",
      )}
      aria-label="Clima de hoje"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
          Clima de hoje
        </span>
        <Link
          to="/clima"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          ver semana <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {estado === "pedindo" && (
        <p className="text-[12px] text-muted-foreground">Pedindo sua localização…</p>
      )}
      {estado === "carregando" && (
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      )}
      {estado === "erro" && (
        <p className="text-[12px] text-muted-foreground">
          Não consegui carregar o clima agora. Tente daqui a pouco.
        </p>
      )}
      {estado === "ok" && dados && (
        <>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-navy-soft text-accent flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-sans tabular-nums text-[22px] font-semibold text-foreground leading-none">
                  {dados.atual.temperatura !== null
                    ? `${Math.round(dados.atual.temperatura)}°`
                    : "—"}
                </span>
                <span className="text-[11.5px] font-sans tabular-nums text-muted-foreground">
                  {dados.hoje.min !== null ? Math.round(dados.hoje.min) : "—"}° ·{" "}
                  {dados.hoje.max !== null ? Math.round(dados.hoje.max) : "—"}°
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">
                  {dados.cidade || SEDE.nome}
                  {origem === "sede" && " · sede"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Droplets className="w-3.5 h-3.5" />
            <span className="font-sans tabular-nums">
              {dados.hoje.chuva_prob ?? 0}%
            </span>
            <span>·</span>
            <span className="font-sans tabular-nums">
              {(dados.hoje.chuva_mm ?? 0).toString().replace(".", ",")} mm
            </span>
          </div>
        </>
      )}
    </div>
  );
}
