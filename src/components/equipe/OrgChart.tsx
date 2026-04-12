import { useMemo } from "react";
import { UserCircle, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Colaborador } from "@/hooks/useColaboradores";
import { Area } from "@/hooks/useAreas";

interface OrgChartProps {
  colaboradores: Colaborador[];
  areas: Area[];
}

function PersonCard({ person }: { person: Colaborador }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {person.foto_url ? (
          <img src={person.foto_url} alt={person.nome} className="w-full h-full object-cover" />
        ) : (
          <UserCircle className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight truncate">{person.nome}</p>
        {person.cargo && <p className="text-[11px] text-muted-foreground leading-tight">{person.cargo}</p>}
      </div>
      {person.possui_cnh && (
        <Badge variant="outline" className="text-[10px] py-0 px-1 gap-0.5 flex-shrink-0">
          <Car className="w-2.5 h-2.5" />{person.tipo_cnh}
        </Badge>
      )}
      {!person.ativo && (
        <Badge variant="secondary" className="text-[10px] py-0 flex-shrink-0">Inativo</Badge>
      )}
    </div>
  );
}

function GroupBox({ title, cor, children }: { title: string; cor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="px-4 py-2 rounded-lg font-semibold text-sm shadow-sm border border-border flex items-center gap-2 mb-1"
        style={{ backgroundColor: cor ? `${cor}20` : undefined, borderColor: cor || undefined }}
      >
        {cor && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cor }} />}
        {title}
      </div>
      <div className="w-px h-3 bg-border" />
      <div className="space-y-1.5 w-full">{children}</div>
    </div>
  );
}

function Connector({ vertical = 4 }: { vertical?: number }) {
  return <div className="w-px bg-border mx-auto" style={{ height: `${vertical * 4}px` }} />;
}

export function OrgChart({ colaboradores, areas }: OrgChartProps) {
  const structure = useMemo(() => {
    const areasMap = new Map(areas.map(a => [a.id, a]));

    // Classify colaboradores by area name
    const byAreaKey: Record<string, Colaborador[]> = {
      diretoria: [],
      administrativo: [],
      campo: [],
      arquitetura: [],
      outros: [],
    };

    colaboradores.forEach(c => {
      const area = c.area_id ? areasMap.get(c.area_id) : null;
      const nome = area?.nome?.toLowerCase() || "";
      if (nome.includes("diret") || nome.includes("direção")) {
        byAreaKey.diretoria.push(c);
      } else if (nome.includes("administrativ")) {
        byAreaKey.administrativo.push(c);
      } else if (nome.includes("campo")) {
        byAreaKey.campo.push(c);
      } else if (nome.includes("arquitetura") || nome.includes("criativ")) {
        byAreaKey.arquitetura.push(c);
      } else {
        byAreaKey.outros.push(c);
      }
    });

    // Find area colors
    const getAreaCor = (keyword: string) => {
      const area = areas.find(a => a.nome?.toLowerCase().includes(keyword));
      return area?.cor || "#22c55e";
    };

    // Split campo into sub-equipes
    const campoManutenção = byAreaKey.campo.filter(c => c.sub_equipe === "manutencao");
    const campoImplantação = byAreaKey.campo.filter(c => c.sub_equipe === "implantacao");
    const campoOutros = byAreaKey.campo.filter(c => c.sub_equipe !== "manutencao" && c.sub_equipe !== "implantacao");

    // Group by cargo within each group
    const groupByCargo = (list: Colaborador[]) => {
      const map = new Map<string, Colaborador[]>();
      list.forEach(c => {
        const key = c.cargo || "Sem cargo";
        const arr = map.get(key) || [];
        arr.push(c);
        map.set(key, arr);
      });
      return Array.from(map.entries());
    };

    return {
      diretoria: byAreaKey.diretoria,
      administrativo: groupByCargo(byAreaKey.administrativo),
      campo: {
        manutencao: groupByCargo(campoManutenção),
        implantacao: groupByCargo(campoImplantação),
        outros: groupByCargo(campoOutros),
      },
      arquitetura: groupByCargo(byAreaKey.arquitetura),
      outros: groupByCargo(byAreaKey.outros),
      cores: {
        diretoria: getAreaCor("diret"),
        administrativo: getAreaCor("administrativ"),
        campo: getAreaCor("campo"),
        arquitetura: getAreaCor("arquitetura"),
      },
    };
  }, [colaboradores, areas]);

  const renderCargoGroup = (cargos: [string, Colaborador[]][]) => (
    <div className="space-y-2">
      {cargos.map(([cargo, members]) => (
        <div key={cargo}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">{cargo}</p>
          <div className="space-y-1">
            {members.map(c => <PersonCard key={c.id} person={c} />)}
          </div>
        </div>
      ))}
    </div>
  );

  // Identify directors by cargo keywords
  const diretorExecutivo = structure.diretoria.find(c =>
    c.cargo?.toLowerCase().includes("executiv") || c.cargo?.toLowerCase().includes("ceo")
  );
  const diretoraCriativa = structure.diretoria.find(c =>
    c.cargo?.toLowerCase().includes("criativ") || c.cargo?.toLowerCase().includes("design")
  );
  const outrosDiretores = structure.diretoria.filter(c => c !== diretorExecutivo && c !== diretoraCriativa);

  return (
    <div className="overflow-x-auto pb-8">
      <div className="min-w-[700px] flex flex-col items-center gap-0">

        {/* NÍVEL 1 — Empresa */}
        <div className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-md">
          A Casa de Maria
        </div>
        <Connector vertical={4} />

        {/* NÍVEL 2 — Diretoria lado a lado */}
        <div className="flex items-start justify-center gap-16 relative">
          {/* Linha horizontal conectora */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border" style={{ width: "calc(100% - 80px)" }} />

          {/* Diretor Executivo */}
          <div className="flex flex-col items-center relative">
            <Connector vertical={3} />
            {diretorExecutivo ? (
              <div className="px-4 py-2.5 rounded-lg border-2 shadow-sm bg-card text-center" style={{ borderColor: structure.cores.diretoria }}>
                <p className="font-semibold text-sm text-foreground">{diretorExecutivo.nome}</p>
                <p className="text-xs text-muted-foreground">{diretorExecutivo.cargo || "Diretor Executivo"}</p>
              </div>
            ) : (
              <div className="px-4 py-2.5 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">Diretor Executivo</p>
              </div>
            )}
          </div>

          {/* Outros diretores */}
          {outrosDiretores.map(d => (
            <div key={d.id} className="flex flex-col items-center">
              <Connector vertical={3} />
              <div className="px-4 py-2.5 rounded-lg border-2 shadow-sm bg-card text-center" style={{ borderColor: structure.cores.diretoria }}>
                <p className="font-semibold text-sm text-foreground">{d.nome}</p>
                <p className="text-xs text-muted-foreground">{d.cargo || "—"}</p>
              </div>
            </div>
          ))}

          {/* Diretora Criativa */}
          <div className="flex flex-col items-center">
            <Connector vertical={3} />
            {diretoraCriativa ? (
              <div className="px-4 py-2.5 rounded-lg border-2 shadow-sm bg-card text-center" style={{ borderColor: structure.cores.diretoria }}>
                <p className="font-semibold text-sm text-foreground">{diretoraCriativa.nome}</p>
                <p className="text-xs text-muted-foreground">{diretoraCriativa.cargo || "Diretora Criativa"}</p>
              </div>
            ) : (
              <div className="px-4 py-2.5 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">Diretora Criativa</p>
              </div>
            )}
          </div>
        </div>

        {/* NÍVEL 3 — Administrativo | Coord. Campo | Arquitetura */}
        <Connector vertical={4} />
        <div className="flex items-start justify-center gap-12 relative w-full">
          {/* Linha horizontal */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border" style={{ width: "calc(100% - 120px)" }} />

          {/* Administrativo — ligado ao Diretor Executivo */}
          <div className="flex flex-col items-center min-w-[180px]">
            <Connector vertical={3} />
            <GroupBox title="Administrativo" cor={structure.cores.administrativo}>
              {structure.administrativo.length > 0 ? renderCargoGroup(structure.administrativo) : (
                <p className="text-xs text-muted-foreground text-center py-2">Sem membros</p>
              )}
            </GroupBox>
          </div>

          {/* Coordenadora de Campo — centro, ligada às duas diretorias */}
          <div className="flex flex-col items-center min-w-[200px]">
            <Connector vertical={3} />
            <div className="px-4 py-2 rounded-lg border-2 shadow-sm bg-card text-center mb-1" style={{ borderColor: structure.cores.campo }}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coordenação de Campo</p>
              {/* Show the coordinator if identifiable */}
              {(() => {
                const coord = structure.diretoria.length === 0
                  ? colaboradores.find(c => c.cargo?.toLowerCase().includes("coordenador") && c.area_id && areas.find(a => a.id === c.area_id)?.nome?.toLowerCase().includes("campo"))
                  : null;
                // Actually search in campo team for coordinator
                const coordCampo = colaboradores.find(c =>
                  (c.cargo?.toLowerCase().includes("coordenad") || c.cargo?.toLowerCase().includes("gestor") || c.cargo?.toLowerCase().includes("gestora")) &&
                  c.area_id && areas.find(a => a.id === c.area_id)?.nome?.toLowerCase().includes("campo")
                );
                if (coordCampo) {
                  return (
                    <div className="flex items-center gap-2 mt-1 justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {coordCampo.foto_url ? (
                          <img src={coordCampo.foto_url} alt={coordCampo.nome} className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground">{coordCampo.nome}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Time de Campo below */}
            <Connector vertical={3} />
            <div className="flex items-start gap-6">
              {/* Manutenção */}
              <div className="flex flex-col items-center min-w-[160px]">
                <GroupBox title="Manutenção" cor={structure.cores.campo}>
                  {structure.campo.manutencao.length > 0 ? renderCargoGroup(structure.campo.manutencao) : (
                    <p className="text-xs text-muted-foreground text-center py-2">Sem membros</p>
                  )}
                </GroupBox>
              </div>

              {/* Implantação */}
              <div className="flex flex-col items-center min-w-[160px]">
                <GroupBox title="Implantação" cor={structure.cores.campo}>
                  {structure.campo.implantacao.length > 0 ? renderCargoGroup(structure.campo.implantacao) : (
                    <p className="text-xs text-muted-foreground text-center py-2">Sem membros</p>
                  )}
                </GroupBox>
              </div>
            </div>

            {/* Campo sem sub-equipe */}
            {structure.campo.outros.length > 0 && (
              <>
                <Connector vertical={2} />
                <GroupBox title="Sem sub-equipe" cor={structure.cores.campo}>
                  {renderCargoGroup(structure.campo.outros)}
                </GroupBox>
              </>
            )}
          </div>

          {/* Arquitetura — ligado à Diretora Criativa */}
          <div className="flex flex-col items-center min-w-[180px]">
            <Connector vertical={3} />
            <GroupBox title="Arquitetura" cor={structure.cores.arquitetura}>
              {structure.arquitetura.length > 0 ? renderCargoGroup(structure.arquitetura) : (
                <p className="text-xs text-muted-foreground text-center py-2">Sem membros</p>
              )}
            </GroupBox>
          </div>
        </div>

        {/* Outros sem área */}
        {structure.outros.length > 0 && (
          <>
            <Connector vertical={4} />
            <GroupBox title="Outros">
              {renderCargoGroup(structure.outros)}
            </GroupBox>
          </>
        )}
      </div>
    </div>
  );
}
