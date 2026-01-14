import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Upload, Plus, Wrench } from "lucide-react";
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

// Mock de máquinas (conectar ao banco depois)
const mockMaquinas = [
  { id: "1", nome: "Roçadeira Stihl FS 220", categoria: "roçadeira" },
  { id: "2", nome: "Soprador Stihl BR 600", categoria: "soprador" },
  { id: "3", nome: "Motosserra Stihl MS 170", categoria: "motosserra" },
  { id: "4", nome: "Cortador de Grama Honda HRX 217", categoria: "cortador" },
  { id: "5", nome: "Podador de Cerca Viva Stihl HS 45", categoria: "podador" },
  { id: "6", nome: "Pulverizador Jacto PJH 20", categoria: "pulverizador" },
];

// Mock de categorias de serviço (conectar ao banco depois)
const mockCategoriasServico = [
  { id: "1", nome: "Manutenção" },
  { id: "2", nome: "Poda" },
  { id: "3", nome: "Irrigação" },
  { id: "4", nome: "Plantio" },
  { id: "5", nome: "Adubação" },
  { id: "6", nome: "Implantação" },
  { id: "7", nome: "Visita Técnica" },
  { id: "8", nome: "Entrega" },
  { id: "9", nome: "Limpeza" },
  { id: "10", nome: "Controle de Pragas" },
];

const periodoOptions = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "dia_inteiro", label: "Dia Inteiro" },
];

const unidadeOptions = [
  { value: "un", label: "un (unidade)" },
  { value: "kg", label: "kg (quilograma)" },
  { value: "g", label: "g (grama)" },
  { value: "L", label: "L (litro)" },
  { value: "mL", label: "mL (mililitro)" },
  { value: "m", label: "m (metro)" },
  { value: "m²", label: "m² (metro quadrado)" },
  { value: "m³", label: "m³ (metro cúbico)" },
  { value: "sacos", label: "sacos" },
  { value: "mudas", label: "mudas" },
  { value: "caixas", label: "caixas" },
  { value: "pacotes", label: "pacotes" },
  { value: "galões", label: "galões" },
  { value: "horas", label: "horas" },
];

interface InsumoSelecionado {
  insumoId: string;
  nome: string;
  quantidade: number;
  unidade: string;
}

interface MaquinaSelecionada {
  maquinaId: string;
  nome: string;
  horasUtilizadas: number;
  observacao: string;
}

export interface ServicoData {
  id: string;
  categoriasIds: string[];
  periodo: string;
  trechoId: string;
  executoresIds: string[];
  solicitante: string;
  solicitanteOutro: string;
  insumos: InsumoSelecionado[];
  maquinas: MaquinaSelecionada[];
  descricao: string;
  observacoesInternas: string;
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
  const [novoInsumoUnidade, setNovoInsumoUnidade] = useState("");
  const [novaMaquinaId, setNovaMaquinaId] = useState("");
  const [novaMaquinaHoras, setNovaMaquinaHoras] = useState("");

  const toggleExecutor = (id: string) => {
    if (!equipePresenteIds.includes(id)) return;
    const newExecutores = servico.executoresIds.includes(id)
      ? servico.executoresIds.filter((e) => e !== id)
      : [...servico.executoresIds, id];
    onUpdate(servico.id, { executoresIds: newExecutores });
  };

  const addCategoria = (id: string) => {
    if (!id || servico.categoriasIds.includes(id)) return;
    onUpdate(servico.id, { categoriasIds: [...servico.categoriasIds, id] });
  };

  const removeCategoria = (id: string) => {
    onUpdate(servico.id, { categoriasIds: servico.categoriasIds.filter((c) => c !== id) });
  };

  const addInsumo = () => {
    if (!novoInsumoId || !novoInsumoQtd || !novoInsumoUnidade) return;
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
          unidade: novoInsumoUnidade,
        },
      ],
    });
    setNovoInsumoId("");
    setNovoInsumoQtd("");
    setNovoInsumoUnidade("");
  };

  // Ao selecionar um insumo, preencher a unidade sugerida
  const handleInsumoSelect = (insumoId: string) => {
    setNovoInsumoId(insumoId);
    const insumo = mockInsumos.find((i) => i.id === insumoId);
    if (insumo) {
      setNovoInsumoUnidade(insumo.unidade);
    }
  };

  const removeInsumo = (insumoId: string) => {
    onUpdate(servico.id, {
      insumos: servico.insumos.filter((i) => i.insumoId !== insumoId),
    });
  };

  const addMaquina = () => {
    if (!novaMaquinaId || !novaMaquinaHoras) return;
    const maquina = mockMaquinas.find((m) => m.id === novaMaquinaId);
    if (!maquina) return;
    if (servico.maquinas.some((m) => m.maquinaId === novaMaquinaId)) return;

    onUpdate(servico.id, {
      maquinas: [
        ...servico.maquinas,
        {
          maquinaId: maquina.id,
          nome: maquina.nome,
          horasUtilizadas: parseFloat(novaMaquinaHoras),
          observacao: "",
        },
      ],
    });
    setNovaMaquinaId("");
    setNovaMaquinaHoras("");
  };

  const removeMaquina = (maquinaId: string) => {
    onUpdate(servico.id, {
      maquinas: servico.maquinas.filter((m) => m.maquinaId !== maquinaId),
    });
  };

  const categoriasLabel = servico.categoriasIds
    .map((id) => mockCategoriasServico.find((c) => c.id === id)?.nome)
    .filter(Boolean)
    .join(", ");

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
                {index + 1} - Serviço
              </span>
              {categoriasLabel && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  — {categoriasLabel.substring(0, 40)}{categoriasLabel.length > 40 ? "..." : ""}
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
            {/* Categorias do Serviço */}
            <div className="space-y-2">
              <Label>Categorias do Serviço *</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select onValueChange={addCategoria} value="">
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCategoriasServico
                      .filter((cat) => !servico.categoriasIds.includes(cat.id))
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {servico.categoriasIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {servico.categoriasIds.map((catId) => {
                    const cat = mockCategoriasServico.find((c) => c.id === catId);
                    return cat ? (
                      <Badge
                        key={catId}
                        variant="secondary"
                        className="flex items-center gap-1 cursor-pointer hover:bg-destructive/20"
                        onClick={() => removeCategoria(catId)}
                      >
                        {cat.nome}
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Período e Trecho */}
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Select value={novoInsumoId} onValueChange={handleInsumoSelect}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Buscar insumo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockInsumos.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome}
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
                <Select value={novoInsumoUnidade} onValueChange={setNovoInsumoUnidade}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Unid." />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadeOptions.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInsumo}
                  disabled={!novoInsumoId || !novoInsumoQtd || !novoInsumoUnidade}
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

            {/* Máquinas Utilizadas */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Máquinas utilizadas
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={novaMaquinaId} onValueChange={setNovaMaquinaId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar máquina..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockMaquinas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Horas"
                  className="w-24"
                  value={novaMaquinaHoras}
                  onChange={(e) => setNovaMaquinaHoras(e.target.value)}
                  min="0"
                  step="0.5"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMaquina}
                  disabled={!novaMaquinaId || !novaMaquinaHoras}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {servico.maquinas.length > 0 && (
                <div className="space-y-1 mt-2">
                  {servico.maquinas.map((maquina) => (
                    <div
                      key={maquina.maquinaId}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{maquina.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary">
                          {maquina.horasUtilizadas}h
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeMaquina(maquina.maquinaId)}
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
    categoriasIds: [],
    periodo: "",
    trechoId: "",
    executoresIds: [],
    solicitante: "",
    solicitanteOutro: "",
    insumos: [],
    maquinas: [],
    descricao: "",
    observacoesInternas: "",
    midia: [],
  };
}
