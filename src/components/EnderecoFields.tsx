import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCEP, capitalizeWords } from "@/hooks/useInputMasks";

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export interface EnderecoValue {
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

interface Props {
  value: EnderecoValue;
  onChange: (next: EnderecoValue) => void;
  /** Inclui CEP no topo (default true) */
  showCep?: boolean;
}

// Cache de cidades por UF
const cidadesCache: Record<string, string[]> = {};

export function EnderecoFields({ value, onChange, showCep = true }: Props) {
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);

  const set = (patch: Partial<EnderecoValue>) => onChange({ ...value, ...patch });

  // Carrega cidades ao mudar UF
  useEffect(() => {
    const uf = value.estado;
    if (!uf || uf.length !== 2) {
      setCidades([]);
      return;
    }
    if (cidadesCache[uf]) {
      setCidades(cidadesCache[uf]);
      return;
    }
    let cancel = false;
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const list = (data || []).map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
        cidadesCache[uf] = list;
        if (!cancel) setCidades(list);
      })
      .catch(() => !cancel && setCidades([]));
    return () => {
      cancel = true;
    };
  }, [value.estado]);

  // Lookup CEP via ViaCEP
  const handleCepBlur = async () => {
    const digits = (value.cep || "").replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const d = await r.json();
      if (d && !d.erro) {
        set({
          rua: d.logradouro || value.rua,
          bairro: d.bairro || value.bairro,
          cidade: d.localidade || value.cidade,
          estado: d.uf || value.estado,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoadingCep(false);
    }
  };

  return (
    <div className="space-y-3">
      {showCep && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-foreground">CEP</Label>
            <Input
              value={value.cep || ""}
              onChange={(e) => set({ cep: formatCEP(e.target.value) })}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              maxLength={9}
              disabled={loadingCep}
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div className="space-y-1.5">
          <Label className="text-foreground">Rua / Logradouro</Label>
          <Input
            value={value.rua || ""}
            onChange={(e) => set({ rua: e.target.value })}
            placeholder="Av. Brasil"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground">Número</Label>
          <Input
            value={value.numero || ""}
            onChange={(e) => set({ numero: e.target.value })}
            placeholder="123"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-foreground">Bairro</Label>
          <Input
            value={value.bairro || ""}
            onChange={(e) => set({ bairro: e.target.value })}
            placeholder="Centro"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground">UF</Label>
          <select
            value={value.estado || ""}
            onChange={(e) => set({ estado: e.target.value, cidade: "" })}
            className="flex h-10 w-full rounded-md border border-primary bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Selecione...</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-foreground">
          Cidade {value.estado ? `(${cidades.length} disponíveis em ${value.estado})` : ""}
        </Label>
        <Input
          list={value.estado ? `cidades-${value.estado}` : undefined}
          value={value.cidade || ""}
          onChange={(e) => set({ cidade: capitalizeWords(e.target.value) })}
          placeholder={value.estado ? "Digite ou selecione" : "Selecione a UF primeiro"}
          disabled={!value.estado}
        />
        {value.estado && (
          <datalist id={`cidades-${value.estado}`}>
            {cidades.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  );
}

/** Compõe endereço completo a partir das partes */
export function composeEndereco(v: EnderecoValue): string {
  const linha1 = [v.rua, v.numero].filter(Boolean).join(", ");
  const linha2 = [v.bairro, v.cidade].filter(Boolean).join(" - ");
  const linha3 = v.estado || "";
  const cep = v.cep ? `CEP ${v.cep}` : "";
  return [linha1, linha2, linha3, cep].filter(Boolean).join(", ");
}
