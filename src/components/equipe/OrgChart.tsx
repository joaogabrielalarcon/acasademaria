import { useMemo } from "react";
import { UserCircle, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Colaborador } from "@/hooks/useColaboradores";
import { Area } from "@/hooks/useAreas";

interface OrgChartProps {
  colaboradores: Colaborador[];
  areas: Area[];
}

export function OrgChart({ colaboradores, areas }: OrgChartProps) {
  const areasMap = new Map(areas.map(a => [a.id, a]));

  const tree = useMemo(() => {
    const grouped = new Map<string, Colaborador[]>();
    const semArea: Colaborador[] = [];

    colaboradores.forEach((c) => {
      if (c.area_id) {
        const list = grouped.get(c.area_id) || [];
        list.push(c);
        grouped.set(c.area_id, list);
      } else {
        semArea.push(c);
      }
    });

    const result = areas
      .filter(a => grouped.has(a.id))
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      .map(area => ({
        area,
        membros: grouped.get(area.id) || [],
        isCampo: area.nome?.toLowerCase().includes("campo"),
      }));

    if (semArea.length > 0) {
      result.push({
        area: { id: "sem-area", nome: "Sem Área", cor: "#9ca3af", ativo: true, ordem: 999, descricao: null } as Area,
        membros: semArea,
        isCampo: false,
      });
    }

    return result;
  }, [colaboradores, areas]);

  const getSubGroups = (membros: Colaborador[], isCampo: boolean) => {
    if (isCampo) {
      const subEquipes = new Map<string, Colaborador[]>();
      membros.forEach(c => {
        const key = c.sub_equipe === "implantacao" ? "Implantação" : c.sub_equipe === "manutencao" ? "Manutenção" : "Não definido";
        const list = subEquipes.get(key) || [];
        list.push(c);
        subEquipes.set(key, list);
      });
      return Array.from(subEquipes.entries()).map(([name, members]) => {
        const cargos = new Map<string, Colaborador[]>();
        members.forEach(c => {
          const cargo = c.cargo || "Sem cargo";
          const list = cargos.get(cargo) || [];
          list.push(c);
          cargos.set(cargo, list);
        });
        return { name, cargos: Array.from(cargos.entries()) };
      });
    } else {
      const cargos = new Map<string, Colaborador[]>();
      membros.forEach(c => {
        const cargo = c.cargo || "Sem cargo";
        const list = cargos.get(cargo) || [];
        list.push(c);
        cargos.set(cargo, list);
      });
      return [{ name: null as string | null, cargos: Array.from(cargos.entries()) }];
    }
  };

  return (
    <div className="space-y-8 overflow-x-auto pb-4">
      {/* Empresa no topo */}
      <div className="flex justify-center">
        <div className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-md">
          A Casa de Maria
        </div>
      </div>

      {/* Linha conectora */}
      <div className="flex justify-center">
        <div className="w-px h-6 bg-border" />
      </div>

      {/* Áreas */}
      <div className="flex flex-wrap justify-center gap-8">
        {tree.map(({ area, membros, isCampo }) => {
          const subGroups = getSubGroups(membros, isCampo);

          return (
            <div key={area.id} className="flex flex-col items-center min-w-[200px]">
              {/* Area header */}
              <div
                className="px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm border border-border flex items-center gap-2"
                style={{ backgroundColor: `${area.cor}20`, borderColor: area.cor || undefined }}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: area.cor || "#22c55e" }} />
                {area.nome}
                <Badge variant="secondary" className="text-xs ml-1">{membros.length}</Badge>
              </div>

              {/* Connector */}
              <div className="w-px h-4 bg-border" />

              {/* Sub-groups */}
              <div className="space-y-3 w-full">
                {subGroups.map((sg, sgIdx) => (
                  <div key={sgIdx} className="flex flex-col items-center">
                    {sg.name && (
                      <>
                        <div className="px-3 py-1.5 rounded-md bg-muted text-sm font-medium text-foreground border border-border">
                          {sg.name}
                        </div>
                        <div className="w-px h-3 bg-border" />
                      </>
                    )}

                    {/* Cargos */}
                    <div className="space-y-2 w-full">
                      {sg.cargos.map(([cargo, members]) => (
                        <div key={cargo} className="rounded-lg border border-border bg-card p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {cargo}
                          </p>
                          <div className="space-y-1.5">
                            {members.map(c => (
                              <div key={c.id} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {c.foto_url ? (
                                    <img src={c.foto_url} alt={c.nome} className="w-full h-full object-cover" />
                                  ) : (
                                    <UserCircle className="w-4 h-4 text-primary" />
                                  )}
                                </div>
                                <span className="text-sm text-foreground">{c.nome}</span>
                                {c.possui_cnh && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 gap-0.5">
                                    <Car className="w-2.5 h-2.5" />{c.tipo_cnh}
                                  </Badge>
                                )}
                                {!c.ativo && (
                                  <Badge variant="secondary" className="text-[10px] py-0">Inativo</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
