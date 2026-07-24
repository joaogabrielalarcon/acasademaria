import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Cake } from "lucide-react";

type Aniversariante = {
  id: string;
  nome: string;
  relacao: string;
  href: string;
  demo?: boolean;
};

/** Chip discreto de aniversariantes do dia. Sem dados = null.
 *  Placeholder demo enquanto backend não tem a agregação.
 *  Para "ligar" real: substituir DEMO por hook que consulta clientes/colaboradores por data_nascimento. */
const DEMO: Aniversariante[] = [
  { id: "demo", nome: "Juliana Falconi", relacao: "Cliente", href: "/clientes", demo: true },
];

export function Aniversariantes() {
  const lista = useMemo(() => DEMO, []);
  if (!lista.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {lista.map((a) => (
        <Link
          key={a.id}
          to={a.href}
          className="inline-flex items-center gap-1.5 h-7 pl-2 pr-3 rounded-full bg-white/[0.10] hover:bg-white/[0.16] border border-white/[0.14] text-[12.5px] transition-colors"
          style={{ color: "hsl(var(--hero-band-fg))" }}
          title={`${a.nome} — ${a.relacao}`}
        >
          <Cake className="w-3.5 h-3.5" />
          <span className="truncate max-w-[240px]">
            Hoje: <span className="font-medium">{a.nome}</span> ({a.relacao})
          </span>
        </Link>
      ))}
    </div>
  );
}
