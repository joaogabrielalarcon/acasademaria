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

/** Versão inline do clima para dentro da faixa-herói verde.
 *  Sem cartão: só ícone + números em creme, alinhado à direita. */
export function ClimaHeroInline() {
  const [estado, setEstado] = useState<"pedindo" | "carregando" | "ok" | "erro">(
    "pedindo",
  );
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
        return raw ? (JSON.parse(raw) as { lat: number; lon: number }) : null;
      } catch {
        return null;
      }
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

  if (estado === "erro") return null;

  const Icon = iconePorCodigo(dados?.hoje.codigo ?? dados?.atual.codigo ?? null);
  const cor = "hsl(var(--hero-band-fg))";
  const corSuave = "hsl(var(--hero-band-fg) / 0.78)";

  if (estado !== "ok" || !dados) {
    return (
      <div
        className="flex items-center gap-2 text-[12.5px]"
        style={{ color: corSuave }}
      >
        <Cloud className="w-4 h-4 opacity-70" />
        <span>Carregando clima…</span>
      </div>
    );
  }

  return (
    <Link
      to="/clima"
      className="group inline-flex items-center gap-3 rounded-lg px-2 -mx-2 py-1 hover:bg-white/[0.06] transition-colors"
      aria-label="Clima de hoje, ver semana"
    >
      <Icon className="w-8 h-8 shrink-0" style={{ color: cor }} />
      <div className="flex flex-col leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-sans tabular-nums text-[22px] font-semibold"
            style={{ color: cor }}
          >
            {dados.atual.temperatura !== null
              ? `${Math.round(dados.atual.temperatura)}°`
              : "—"}
          </span>
          <span
            className="font-sans tabular-nums text-[11.5px]"
            style={{ color: corSuave }}
          >
            {dados.hoje.min !== null ? Math.round(dados.hoje.min) : "—"}° ·{" "}
            {dados.hoje.max !== null ? Math.round(dados.hoje.max) : "—"}°
          </span>
        </div>
        <div
          className="flex items-center gap-2 text-[11px] mt-0.5"
          style={{ color: corSuave }}
        >
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[140px]">
              {dados.cidade || SEDE.nome}
              {origem === "sede" && " · sede"}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            <span className="font-sans tabular-nums">
              {dados.hoje.chuva_prob ?? 0}%
            </span>
          </span>
        </div>
      </div>
      <ArrowRight
        className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity"
        style={{ color: cor }}
      />
    </Link>
  );
}
