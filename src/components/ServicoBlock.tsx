import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Mock data (mover para hooks/context depois)
const mockColaboradores = [
  { id: "1", nome: "João Silva" },
  { id: "2", nome: "Maria Santos" },
  { id: "3", nome: "Pedro Oliveira" },
  { id: "4", nome: "Maria Fernanda" },
];

const mockSolicitantes = [
  { id: "prop-1", nome: "Roberto Silveira", tipo: "proprietario" },
  { id: "prop-2", nome: "Ana Silveira", tipo: "proprietario" },
  { id: "func-1", nome: "José Carlos (Caseiro)", tipo: "funcionario" },
  { id: "func-2", nome: "Maria (Governanta)", tipo: "funcionario" },
];

const mockInsumos = [
  { id: "1", nome: "Adubo NPK 10-10-10", categoria: "adubo", unidade: "kg" },
  { id: "2", nome: "Terra vegetal", categoria: "substrato", unidade: "sacos" },
  { id: "3", nome: "Calcário dolomítico", categoria: "adubo", unidade: "kg" },
  { id: "4", nome: "Casca de pinus", categoria: "substrato", unidade: "sacos" },
  { id: "5", nome: "Muda de Ipe", categoria: "planta", unidade: "un" },
  { id: "6", nome: "Palmeira Imperial", categoria: "planta", unidade: "un" },
  { id: "7", nome: "Forração Amendoim", categoria: "planta", unidade: "mudas" },
  { id: "8", nome: "Roçadeira", categoria: "ferramenta", unidade: "un" },
  { id: "9", nome: "Soprador", categoria: "maquina", unidade: "un" },
];

const mockTrechos = [
  { id: "1", nome: "Jardim Frontal", clienteId: "1" },
  { id: "2", nome: "Piscina", clienteId: "1" },
  { id: "3", nome: "Horta", clienteId: "2" },
  { id: "4", nome: "Área de lazer", clienteId: "1" },
];

const tipoOptions = [
  { value: "manutencao", label: "Manutenção" },
  { value: "implantacao", label: "Implantação" },
  { value: "entrega", label: "Entrega" },
  { value: "visita_tecnica", label: "Visita Técnica" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
];

const periodoOptions = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "dia_inteiro", label: "Dia Inteiro" },
];

interface InsumoSelecionado {
  insumoId: string;
  nome: string;
  quantidade: number;
  unidade: string;
}

export interface ServicoData {
  id: string;
  tipo: string;
  periodo: string;
  trechoId: string;
  executoresIds: string[];
  solicitante: string;
  solicitanteOutro: string;
  insumos: InsumoSelecionado[];
  descricao: string;
  observacoesInternas: string;
  tags: string;
  midia: File[];
}

interface ServicoBlockProps {
  servico: ServicoData;
  index: number;
  equipePresenteIds: string[];
  onUpdate: (id: string, data: Partial<ServicoData>) => void;
  onRemove: (id: string) => void;
  isOnly: boolean;
}

export function ServicoBlock({
  servico,
  index,
  equipePresenteIds,
  onUpdate,
  onRemove,
  isOnly,
}: ServicoBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [novoInsumoId, setNovoInsumoId] = useState("");
  const [novoInsumoQtd, setNovoInsumoQtd] = useState("");

  const toggleExecutor = (id: string) => {
    if (!equipePresenteIds.includes(id)) return;
    const newExecutores = servico.executoresIds.includes(id)
      ? servico.executoresIds.filter((e) => e !== id)
      : [...servico.executoresIds, id];
    onUpdate(servico.id, { executoresIds: newExecutores });
  };

  const addInsumo = () => {
    if (!novoInsumoId || !novoInsumoQtd) return;
    const insumo = mockInsumos.find((i) => i.id === novoInsumoId);
    if (!insumo) return;
    if (servico.insumos.some((i) => i.insumoId === novoInsumoId)) return;

    onUpdate(servico.id, {
      insumos: [
        ...servico.insumos,
        {
          insumoId: insumo.id,
          nome: insumo.nome,
          quantidade: parseFloat(novoInsumoQtd),
          unidade: insumo.unidade,
        },
      ],
    });
    setNovoInsumoId("");
    setNovoInsumoQtd("");
  };

  const removeInsumo = (insumoId: string) => {
    onUpdate(servico.id, {
      insumos: servico.insumos.filter((i) => i.insumoId !== insumoId),
    });
  };

  const tipoLabel = tipoOptions.find((t) => t.value === servico.tipo)?.label || "Serviço";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-primary/20 rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-semibold">
                {index + 1}
              </span>
              <span className="font-medium text-foreground">
                {servico.tipo ? tipoLabel : `Serviço ${index + 1}`}
              </span>
              {servico.descricao && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  — {servico.descricao.substring(0, 40)}...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(servico.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="p-4 space-y-4 border-t border-primary/10">
            {/* Tipo de Serviço, Período e Trecho */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select
                  value={servico.tipo}
                  onValueChange={(value) => onUpdate(servico.id, { tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={servico.periodo}
                  onValueChange={(value) => onUpdate(servico.id, { periodo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Quando foi feito?" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodoOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Área / Trecho</Label>
                <Select
                  value={servico.trechoId}
                  onValueChange={(value) => onUpdate(servico.id, { trechoId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Onde foi realizado?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Área geral / Todo o jardim</SelectItem>
                    {mockTrechos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Responsáveis pela Execução */}
            {equipePresenteIds.length > 0 && (
              <div className="space-y-2">
                <Label>Responsáveis pela execução</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Quem executou este serviço específico?
                </p>
                <div className="flex flex-wrap gap-2">
                  {mockColaboradores
                    .filter((c) => equipePresenteIds.includes(c.id))
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleExecutor(c.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          servico.executoresIds.includes(c.id)
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {c.nome}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Solicitante */}
            <div className="space-y-2">
              <Label>Solicitante do serviço</Label>
              <Select
                value={servico.solicitante}
                onValueChange={(value) => onUpdate(servico.id, { solicitante: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o solicitante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Serviço de rotina (sem solicitação)</SelectItem>
                  {mockSolicitantes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                      {s.tipo === "proprietario" && " (Proprietário)"}
                    </SelectItem>
                  ))}
                  <SelectItem value="outro">Outro (especificar)</SelectItem>
                </SelectContent>
              </Select>
              {servico.solicitante === "outro" && (
                <Input
                  placeholder="Nome do solicitante..."
                  value={servico.solicitanteOutro}
                  onChange={(e) =>
                    onUpdate(servico.id, { solicitanteOutro: e.target.value })
                  }
                  className="mt-2"
                />
              )}
            </div>

            {/* Insumos */}
            <div className="space-y-2">
              <Label>Insumos utilizados</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={novoInsumoId} onValueChange={setNovoInsumoId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Buscar insumo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockInsumos.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome} ({i.unidade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Qtd"
                  className="w-20"
                  value={novoInsumoQtd}
                  onChange={(e) => setNovoInsumoQtd(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInsumo}
                  disabled={!novoInsumoId || !novoInsumoQtd}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {servico.insumos.length > 0 && (
                <div className="space-y-1 mt-2">
                  {servico.insumos.map((insumo) => (
                    <div
                      key={insumo.insumoId}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                    >
                      <span>{insumo.nome}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary">
                          {insumo.quantidade} {insumo.unidade}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeInsumo(insumo.insumoId)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição do que foi feito *</Label>
              <Textarea
                placeholder="Descreva o serviço realizado..."
                rows={3}
                value={servico.descricao}
                onChange={(e) => onUpdate(servico.id, { descricao: e.target.value })}
              />
            </div>

            {/* Observações Internas */}
            <div className="space-y-2">
              <Label>Observações internas</Label>
              <Textarea
                placeholder="Notas internas sobre este serviço..."
                rows={2}
                value={servico.observacoesInternas}
                onChange={(e) =>
                  onUpdate(servico.id, { observacoesInternas: e.target.value })
                }
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                placeholder="poda, irrigação, plantio..."
                value={servico.tags}
                onChange={(e) => onUpdate(servico.id, { tags: e.target.value })}
              />
              {servico.tags && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {servico.tags.split(",").map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Upload de Mídia */}
            <div className="space-y-2">
              <Label>Fotos e Vídeos</Label>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  Arraste fotos ou vídeos aqui
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP, MP4, MOV (máx. 250MB cada)
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  Selecionar Arquivos
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function createEmptyServico(): ServicoData {
  return {
    id: crypto.randomUUID(),
    tipo: "",
    periodo: "",
    trechoId: "",
    executoresIds: [],
    solicitante: "",
    solicitanteOutro: "",
    insumos: [],
    descricao: "",
    observacoesInternas: "",
    tags: "",
    midia: [],
  };
}
