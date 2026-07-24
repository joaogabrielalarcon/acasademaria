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
          className="inline-flex items-center gap-2 h-8 pl-2.5 pr-3.5 rounded-full text-[13px] shadow-e1 transition-colors hover:brightness-95"
          style={{
            background: "hsl(var(--rose-foreground))",
            color: "hsl(var(--foreground))",
          }}
          title={`${a.nome} · ${a.relacao}`}
        >
          <Cake className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
          <span className="truncate max-w-[280px]">
            Hoje: <span className="font-semibold">{a.nome}</span>
            <span className="opacity-75"> ({a.relacao})</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
