import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { capitalizeWords } from "@/hooks/useInputMasks";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  Check,
  Copy,
  Upload,
  Sparkles,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Minus,
  FileText,
  UserPlus,
  ChevronDown,
  ChevronUp,
  PackageX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FornecedorPopover } from "@/components/orcamento/FornecedorPopover";
import { MercadoInlineEditor, parseMercados } from "@/components/orcamento/MercadoInlineEditor";
import { AtualizarCotacaoPopover } from "@/components/orcamento/AtualizarCotacaoPopover";
import { MafeFAB } from "@/components/orcamento/MafeFAB";
import { Etapa4MarkupBlocoA, useEtapa4Validacao } from "@/components/orcamento/Etapa4MarkupBlocoA";
import { Etapa6AjustesItem } from "@/components/orcamento/Etapa6AjustesItem";
import { Etapa6ResumoDRE } from "@/components/orcamento/Etapa6ResumoDRE";
import { ResumoCorrenteRail } from "@/components/orcamento/ResumoCorrenteRail";
import { EditarMercadoDialog } from "@/components/orcamento/EditarMercadoDialog";
import {
  IndisponibilidadeDialog,
  useIndisponibilidades,
  DesfazerIndisponibilidadeButton,
} from "@/components/orcamento/IndisponibilidadeDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState, ErrorState } from "@/components/ui/list-states";
import { MobileCardList } from "@/components/ui/mobile-card-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AtualizarCotacoesPanel, type FornecedorAtualizacaoItem } from "@/components/orcamento/AtualizarCotacoesPanel";
import { IAChatPanel, type IAChatItemContexto } from "@/components/orcamento/IAChatPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResumoFornecedoresDialog, type ResumoItem } from "@/components/orcamento/ResumoFornecedoresDialog";
import { ImportarRespostaFornecedorDialog } from "@/components/orcamento/ImportarRespostaFornecedorDialog";
import { NovaVersaoDialog } from "@/components/orcamento/NovaVersaoDialog";
import { VersoesDialog } from "@/components/orcamento/VersoesDialog";
import { History, GitBranch } from "lucide-react";
import { EnderecoFields, composeEndereco } from "@/components/EnderecoFields";
import { Star, Filter, MessageCircle, Lock, Crown, ChevronsUp, ChevronsDown, Zap, Store, AlertCircle, RotateCcw } from "lucide-react";
import { MemorialItensTable } from "@/components/orcamento/MemorialItensTable";
import { VirtualWindowList } from "@/components/orcamento/VirtualWindowList";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPorteMetros, parsePorteMetros } from "@/lib/porte";

const CATEGORIAS_ITEM = [
  "Árvores",
  "Arbustos e Herbáceas",
  "Forrações",
  "Trepadeiras",
  "Palmeiras",
  "Gramado",
  "Vasos",
];

const UNIDADES_ITEM = ["UNID", "M²", "CX", "SACO", "POTE", "TOUCEIRA", "BANDEJA", "ROLO", "METRO"];

const normalizarNomeCatalogo = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

interface ItemMemorial {
  nome_popular: string;
  nome_cientifico: string | null;
  planta_id?: string | null;
  insumo_id?: string | null;
  porte: string;
  quantidade: number;
  unidade: string;
  categoria: string;
  confianca: "alta" | "media" | "baixa";
}

interface TipoProposta {
  id: string;
  sigla: string;
  nome_completo: string;
}

// Refatoração: fluxo de 7 → 6 etapas.
// "Insumos" deixou de ser etapa separada (foi fundido em Fornecedores).
// "Cotação" foi substituída por "Markup e Margens" (placeholder até nova lógica).
const ETAPAS = [
  "Informações Iniciais",
  "Memorial Descritivo",
  "Fornecedores",
  "Markup e Margens",
  "Mão de Obra, Fretes e Transporte",
  "Resumo Final",
];

const TIPOS_CLIENTE = [
  { value: "residencial", label: "Residencial" },
  { value: "condominio", label: "Condomínio" },
  { value: "resort", label: "Resort" },
  { value: "hotel", label: "Hotel" },
  { value: "comercial", label: "Comercial" },
];

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const REQUIRED_FIELDS: Array<keyof typeof initialForm> = [
  "tipo_proposta_id",
  "cliente_id",
  "local_id",
  "tipo_cliente",
  "cidade",
  "estado",
  "area_m2",
];

const initialForm = {
  tipo_proposta_id: "",
  tipo_proposta_sigla: "",
  codigo: "",
  cliente_id: "",
  local_id: "",
  local_endereco: "",
  tipo_cliente: "",
  cidade: "",
  estado: "",
  area_m2: "",
  perfil_markup_id: "",
  prazo_validade_dias: 20 as number | string,
  obs_interna: "",
  obs_proposta: "",
  data_envio: "",
  responsavel_id: "",
};

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [etapaAtual, setEtapaAtual] = useState(1);
  const [form, setForm] = useState({ ...initialForm });

  // Etapa 2 — Memorial
  const [memorialModo, setMemorialModo] = useState<"pdf" | "texto">("pdf");
  const [memorialTexto, setMemorialTexto] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfCarregado, setPdfCarregado] = useState(false);
  const [processandoPdf, setProcessandoPdf] = useState(false);
  const [itensMaterial, setItensMaterial] = useState<ItemMemorial[]>([]);
  const [extracaoErro, setExtracaoErro] = useState<string | null>(null);
  const [extracaoElapsed, setExtracaoElapsed] = useState(0);
  const [filtroBaixaConfianca, setFiltroBaixaConfianca] = useState(false);

  // Etapa 3 — Fornecedores
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState<
    Record<number, string[]>
  >({});
  const [novoFornModalOpen, setNovoFornModalOpen] = useState(false);
  const [novoFornItemIdx, setNovoFornItemIdx] = useState<number | null>(null);
  const [novoForn, setNovoForn] = useState({ nome: "", contato: "", cidade: "", cadastrarItem: true });

  // Etapa 4 — Cotação
  type CotacaoLinha = {
    valor_unitario: string;
    porte_ofertado: string;
    disponivel: "sim" | "nao" | "nc";
    status_selecao: "principal" | "backup1" | "backup2" | "descartado";
    obs: string;
  };
  const [cotacoes, setCotacoes] = useState<Record<number, Record<string, CotacaoLinha>>>({});
  const [margensSeg, setMargensSeg] = useState<Record<number, number>>({});
  const [cardsColapsados, setCardsColapsados] = useState<Record<number, boolean>>({});

  // Filtros e ações da Etapa 3 / 4
  type OrdemForn = "preco" | "data" | "porte" | "nota";
  const [ordemFornec, setOrdemFornec] = useState<Record<number, OrdemForn>>({});
  const [filtroMercado, setFiltroMercado] = useState<Record<number, string>>({});
  const [filtroPorte, setFiltroPorte] = useState<Record<number, string>>({});
  const [resumoOpen, setResumoOpen] = useState(false);
  const [importarFornId, setImportarFornId] = useState<string | null>(null);

  // Etapa 3 — refactor: expansão por item, ordenação por preço/data/mercado, modal mercado obrigatório
  const [expandirMaiores, setExpandirMaiores] = useState<Record<number, boolean>>({});
  const [expandirMenores, setExpandirMenores] = useState<Record<number, boolean>>({});
  type OrdemTab3Chave = "data" | "preco" | "mercado" | "nota" | "porte_asc" | "porte_desc";
  type FiltrosTab3 = {
    primaria: OrdemTab3Chave;
    secundaria: OrdemTab3Chave | "nenhuma";
    mercados: string[]; // multi-select; vazio = todos
    somenteRecentes: boolean; // últimos 6 meses
  };
  const filtroPadraoTab3: FiltrosTab3 = { primaria: "data", secundaria: "nenhuma", mercados: [], somenteRecentes: false };
  const [filtrosTab3, setFiltrosTab3] = useState<Record<number, FiltrosTab3>>({});
  const [soSemFornecedor, setSoSemFornecedor] = useState(false);
  // Colapso por bloco de item na Etapa 3 (persistido na sessão por orçamento)
  const blocosStorageKey = `orc:${id || "novo"}:blocosColapsados`;
  const [blocosColapsados, setBlocosColapsados] = useState<Record<number, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = sessionStorage.getItem(blocosStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(blocosStorageKey, JSON.stringify(blocosColapsados));
    } catch {}
  }, [blocosColapsados, blocosStorageKey]);

  // Sub-PR 2B/2C — sub-aba dentro da Etapa 3 (Comparativo / Atualizar Cotações)
  const [tabEtapa3, setTabEtapa3] = useState<"comparativo" | "atualizar">("comparativo");

  // Sub-PR 2C — IA chat panel state (por fornecedor)
  const [iaChatTarget, setIaChatTarget] = useState<{
    fornecedorId: string;
    fornecedorNome: string;
    mercado?: string | null;
  } | null>(null);

  // Modal inline para preencher Mercado de fornecedor sem sair da etapa
  const [mercadoInlineDialog, setMercadoInlineDialog] = useState<{
    open: boolean;
    fornecedorId: string | null;
    fornecedorNome: string | null;
    mercadoAtual: string | null;
  }>({ open: false, fornecedorId: null, fornecedorNome: null, mercadoAtual: null });
  // Modal de validação ao avançar para Etapa 4
  const [validacaoEtapa4Open, setValidacaoEtapa4Open] = useState(false);
  // Validação inline da Etapa 1: só destaca campos depois que o usuário tenta avançar
  const [mostrarErrosEtapa1, setMostrarErrosEtapa1] = useState(false);
  // Versionamento
  const [novaVersaoOpen, setNovaVersaoOpen] = useState(false);
  const [versoesOpen, setVersoesOpen] = useState(false);
  const [mercadoModal, setMercadoModal] = useState<{
    open: boolean;
    fornecedorId: string | null;
    nome: string;
    valor: string;
    selecionados: string[];
    draft: string;
    confirmarNovo: string | null;
    pendente: { itemIdx: number; papel: "principal" | "backup1" | "backup2" } | null;
  }>({ open: false, fornecedorId: null, nome: "", valor: "", selecionados: [], draft: "", confirmarNovo: null, pendente: null });

  // Etapa 5 — Insumos
  type InsumoCalc = { tipo: string; nome: string; quantidade: number; unidade: string };
  type InsumoAdicional = {
    nome: string;
    fornecedor_id: string;
    quantidade_esperada: string;
    unidade: string;
    margem: string;
    valor_unitario: string;
    obs_interna: string;
    obs_proposta: string;
  };
  const [insumosCalc, setInsumosCalc] = useState<InsumoCalc[]>([]);
  const [insumosAdicionais, setInsumosAdicionais] = useState<InsumoAdicional[]>([]);
  const [insumosCalculados, setInsumosCalculados] = useState(false);

  const { data: coeficientes = [] } = useQuery({
    queryKey: ["coeficientes-insumos-vigentes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("coeficientes_insumos")
        .select("*")
        .eq("vigente", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: fornecedoresLista = [] } = useQuery({
    queryKey: ["fornecedores-ativos-lista"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fornecedores")
        .select("id, nome, mercado")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const tipoCoefDoItem = (it: ItemMemorial): string | null => {
    const cat = (it.categoria || "").toLowerCase();
    const porte = (it.porte || "").toLowerCase();
    if (cat.includes("forra")) return "forracao";
    if (cat.includes("arbusto") || cat.includes("herb")) {
      const alturaMatch = porte.match(/([\d.,]+)\s*m/);
      const altura = alturaMatch ? parseFloat(alturaMatch[1].replace(",", ".")) : NaN;
      if (porte.includes("peq") || (!isNaN(altura) && altura < 0.5)) return "arbusto_pequeno";
      return "arbusto_medio";
    }
    if (cat.includes("árvore") || cat.includes("arvore")) return "arvore_dap15";
    if (cat.includes("gramado")) return "gramado";
    if (cat.includes("palmeira")) return "palmeira_grande";
    return null;
  };

  // Calcular insumos automaticamente ao entrar na Etapa 5 (uma vez, permitindo edição)
  useEffect(() => {
    // Insumos foram fundidos na etapa Fornecedores (etapa 3 no novo fluxo).
    if (etapaAtual !== 3 || insumosCalculados) return;
    if (!coeficientes || coeficientes.length === 0) return;

    const acc = { mo: 0, terra: 0, adubo: 0, munck: 0, corda: 0 };
    itensMaterial.forEach((it, idx) => {
      const tipo = tipoCoefDoItem(it);
      if (!tipo) return;
      const coef = (coeficientes as any[]).find((c) => c.tipo_planta === tipo);
      if (!coef) return;
      const margem = margensSeg[idx] ?? 0;
      const qtdOrcar = Math.ceil((Number(it.quantidade) || 0) * (1 + margem / 100));
      acc.mo += qtdOrcar * Number(coef.mo_por_unidade || 0);
      acc.terra += qtdOrcar * Number(coef.terra_por_unidade || 0);
      acc.adubo += qtdOrcar * Number(coef.adubo_por_unidade || 0);
      acc.munck += qtdOrcar * Number(coef.munck_por_unidade || 0);
      acc.corda += qtdOrcar * Number(coef.corda_por_unidade || 0);
    });

    const linhas: InsumoCalc[] = [
      { tipo: "mo", nome: "MO (Mão de obra plantio)", quantidade: +acc.mo.toFixed(2), unidade: "dias" },
      { tipo: "terra", nome: "Terra", quantidade: +acc.terra.toFixed(2), unidade: "m³" },
      { tipo: "adubo", nome: "Adubo", quantidade: +acc.adubo.toFixed(2), unidade: "kits" },
      { tipo: "munck", nome: "Munck", quantidade: +acc.munck.toFixed(2), unidade: "dias" },
      { tipo: "corda", nome: "Corda", quantidade: +acc.corda.toFixed(2), unidade: "m" },
    ].filter((l) => l.quantidade > 0);

    setInsumosCalc(linhas);
    setInsumosCalculados(true);
  }, [etapaAtual, coeficientes, itensMaterial, margensSeg, insumosCalculados]);

  const INSUMOS_SUGERIDOS = [
    "Torta de mamona", "Yoorin", "K-forte", "Algen (Lithothamnium)",
    "Bokashi", "Terra preta", "Substrato", "Adubo preparado",
    "Pedrisco Palha nº3", "Seixo Bege", "Corda (10mm)", "Bidin",
    "Limitador", "Lona",
  ];
  const UNIDADES_INSUMO = ["m³", "saco", "tonelada", "metro", "rolo", "unidade", "kg"];

  const toggleInsumoSugerido = (nome: string) => {
    setInsumosAdicionais((prev) => {
      const idx = prev.findIndex((i) => i.nome === nome);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [
        ...prev,
        {
          nome,
          fornecedor_id: "",
          quantidade_esperada: "",
          unidade: "unidade",
          margem: "0",
          valor_unitario: "",
          obs_interna: "",
          obs_proposta: "",
        },
      ];
    });
  };

  const updateInsumoAdic = (idx: number, patch: Partial<InsumoAdicional>) => {
    setInsumosAdicionais((prev) => prev.map((i, j) => (j === idx ? { ...i, ...patch } : i)));
  };

  const addInsumoCustom = () => {
    setInsumosAdicionais((prev) => [
      ...prev,
      {
        nome: "",
        fornecedor_id: "",
        quantidade_esperada: "",
        unidade: "unidade",
        margem: "0",
        valor_unitario: "",
        obs_interna: "",
        obs_proposta: "",
      },
    ]);
  };

  const insumosSemQtd = insumosAdicionais.filter(
    (i) => i.nome && (!i.quantidade_esperada || Number(i.quantidade_esperada) <= 0),
  );

  // ============ Etapa 6 — Mão de obra, fretes, transporte, indiretos ============
  type MoLinha = {
    colaborador_id?: string;
    colaborador_nome?: string;
    cargo_id: string;
    cargo_nome: string;
    qtd: string;
    dias: string;
    salario_mensal: string;
    salario_diario: string;
  };
  type FreteLinha = {
    transportador_id: string;
    transportador_nome: string;
    modo_transp: "cad" | "livre";
    percurso: string;
    valor_unitario: string;
    qtd_esperada: string;
    margem: string;
  };
  type TranspEquipeLinha = {
    tipo: "MFM" | "Moto" | "Carro";
    valor_km: string;
    dias: string;
    km: string;
  };
  const TIPOS_INDIRETO = [
    { value: "refeicao_almoco_janta", label: "Refeição almoço+janta", padrao: 30 },
    { value: "cafe_manha", label: "Café da manhã", padrao: 15 },
    { value: "escritorio", label: "Custo escritório", padrao: 0 },
    { value: "maria_fernanda", label: "Maria Fernanda", padrao: 0 },
    { value: "administrativo", label: "Administrativo", padrao: 0 },
    { value: "outros", label: "Outros", padrao: 0 },
  ];
  type CustoIndiretoLinha = {
    tipo: string;
    descricao: string;
    valor_unitario: string;
    quantidade: string;
  };

  const [moLinhas, setMoLinhas] = useState<MoLinha[]>([]);
  const [fretes, setFretes] = useState<FreteLinha[]>([]);
  const [transporte, setTransporte] = useState<TranspEquipeLinha[]>([
    { tipo: "MFM", valor_km: "2.12", dias: "", km: "" },
    { tipo: "Moto", valor_km: "0.60", dias: "", km: "" },
    { tipo: "Carro", valor_km: "1.00", dias: "", km: "" },
  ]);
  const [custosIndiretos, setCustosIndiretos] = useState<CustoIndiretoLinha[]>([]);
  const [aliquotaMes, setAliquotaMes] = useState<number>(8.09);
  const [aliquotaProdutos, setAliquotaProdutos] = useState<number>(13.5);
  const [tipoNf, setTipoNf] = useState<"pj" | "cpf">("pj");
  const [openBlocoMo, setOpenBlocoMo] = useState(true);
  const [openBlocoFretes, setOpenBlocoFretes] = useState(true);
  const [openBlocoTransp, setOpenBlocoTransp] = useState(true);
  const [openBlocoIndir, setOpenBlocoIndir] = useState(true);

  const { data: cargosMo = [] } = useQuery({
    queryKey: ["cargos-mo-ativos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cargos_mo")
        .select("id, nome, salario_mensal, salario_diario")
        .eq("ativo", true)
        .order("nome");
      if (error) {
        console.warn("[cargos_mo] erro:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: colaboradoresAtivos = [] } = useQuery({
    queryKey: ["colaboradores-ativos-mo"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("colaboradores_basico")
        .select("id, nome, cargo")
        .eq("ativo", true)
        .order("nome");
      if (error) {
        console.warn("[colaboradores] erro:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: transportadoras = [] } = useQuery({
    queryKey: ["transportadoras"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fornecedores")
        .select("id, nome")
        .eq("status", "ativo")
        .eq("categoria_fornecedor", "Transportadora")
        .order("nome");
      if (error) {
        console.warn("[transportadoras] erro:", error);
        return [];
      }
      return data || [];
    },
  });

  const addMoLinha = () =>
    setMoLinhas((p) => [
      ...p,
      { cargo_id: "", cargo_nome: "", qtd: "1", dias: "", salario_mensal: "0", salario_diario: "0" },
    ]);
  const updateMoLinha = (idx: number, patch: Partial<MoLinha>) =>
    setMoLinhas((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeMoLinha = (idx: number) => setMoLinhas((p) => p.filter((_, i) => i !== idx));

  const custoMoBruto = useMemo(
    () =>
      moLinhas.reduce(
        (s, l) =>
          s +
          (Number(l.qtd) || 0) * (Number(l.dias) || 0) * (Number(l.salario_diario) || 0),
        0,
      ),
    [moLinhas],
  );
  const valorNfMo = useMemo(() => {
    const aliq = Number(aliquotaMes) || 0;
    const denom = tipoNf === "pj" ? (100 - (aliq + 11)) / 100 : (100 - aliq) / 100;
    if (denom <= 0) return 0;
    return custoMoBruto / denom;
  }, [custoMoBruto, aliquotaMes, tipoNf]);

  const addFrete = () =>
    setFretes((p) => [
      ...p,
      {
        transportador_id: "",
        transportador_nome: "",
        modo_transp: "cad",
        percurso: "",
        valor_unitario: "",
        qtd_esperada: "",
        margem: "0",
      },
    ]);
  const updateFrete = (idx: number, patch: Partial<FreteLinha>) =>
    setFretes((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeFrete = (idx: number) => setFretes((p) => p.filter((_, i) => i !== idx));

  const totalFretes = useMemo(
    () =>
      fretes.reduce((s, f) => {
        const qtd = Math.ceil((Number(f.qtd_esperada) || 0) * (1 + (Number(f.margem) || 0) / 100));
        return s + qtd * (Number(f.valor_unitario) || 0);
      }, 0),
    [fretes],
  );

  const updateTransporte = (idx: number, patch: Partial<TranspEquipeLinha>) =>
    setTransporte((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const totalTransporte = useMemo(
    () =>
      transporte.reduce(
        (s, t) => s + (Number(t.valor_km) || 0) * (Number(t.dias) || 0) * (Number(t.km) || 0),
        0,
      ),
    [transporte],
  );

  const addIndireto = () =>
    setCustosIndiretos((p) => [
      ...p,
      { tipo: "outros", descricao: "", valor_unitario: "0", quantidade: "1" },
    ]);
  const updateIndireto = (idx: number, patch: Partial<CustoIndiretoLinha>) =>
    setCustosIndiretos((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeIndireto = (idx: number) =>
    setCustosIndiretos((p) => p.filter((_, i) => i !== idx));
  const totalIndiretos = useMemo(
    () =>
      custosIndiretos.reduce(
        (s, c) => s + (Number(c.valor_unitario) || 0) * (Number(c.quantidade) || 0),
        0,
      ),
    [custosIndiretos],
  );

  // Custo diário (R$/dia) de cargos administrativos para Bloco D — Custos Indiretos
  const cargoDiarioPorTipo = useMemo(() => {
    const arr = (cargosMo as any[]) || [];
    const findBy = (frags: string[]) =>
      arr.find((c) => {
        const n = String(c.nome || "").toLowerCase();
        return frags.every((f) => n.includes(f));
      });
    const mfm = findBy(["maria", "fernanda"]);
    const adm = findBy(["administrativ"]);
    return {
      maria_fernanda: Number(mfm?.salario_diario) || 0,
      administrativo: Number(adm?.salario_diario) || 0,
    } as Record<string, number>;
  }, [cargosMo]);

  // Ao entrar na Etapa 5, garante linhas Maria Fernanda e Administrativo no Bloco D
  // com valor_unitario puxado de cargos_mo. Roda apenas uma vez por sessão.
  const indiretosSeedRef = useRef(false);
  useEffect(() => {
    if (etapaAtual !== 5) return;
    if (indiretosSeedRef.current) return;
    if ((cargosMo as any[]).length === 0) return;
    indiretosSeedRef.current = true;
    setCustosIndiretos((prev) => {
      const next = [...prev];
      const ensure = (tipo: "maria_fernanda" | "administrativo", descricao: string) => {
        if (next.some((c) => c.tipo === tipo)) return;
        const valor = cargoDiarioPorTipo[tipo] || 0;
        if (valor <= 0) return;
        next.push({
          tipo,
          descricao,
          valor_unitario: String(valor),
          quantidade: "0",
        });
      };
      ensure("maria_fernanda", "Maria Fernanda envolvida (dias)");
      ensure("administrativo", "Administrativo envolvido (dias)");
      return next;
    });
  }, [etapaAtual, cargosMo, cargoDiarioPorTipo]);

  const totalEtapa6 = valorNfMo + totalFretes + totalTransporte + totalIndiretos;
  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ============ Etapa 7 — Resumo financeiro ============
  const CATEGORIAS_PLANTAS = [
    "Árvores",
    "Arbustos e Herbáceas",
    "Forrações",
    "Gramado",
    "Palmeiras",
    "Trepadeiras",
    "Vasos",
  ];
  const CATEGORIAS_OUTROS = ["Insumos", "Fretes", "Mão de Obra", "Transporte", "Custos Indiretos"];
  const CATEGORIAS_RESUMO = [...CATEGORIAS_PLANTAS, ...CATEGORIAS_OUTROS];

  // Markup vem do banco (orcamento_categorias_markup), gravado na Etapa 4.
  // Esta é a ÚNICA fonte de markup do orçamento.
  const markupCategoriasQuery = useQuery({
    queryKey: ["orcamento-categorias-markup-resumo", id],
    queryFn: async () => {
      if (!id) return [] as any[];
      const { data, error } = await (supabase as any)
        .from("orcamento_categorias_markup")
        .select("categoria, markup_pct, margem_pct, piso_margem_pct, ajustado_manualmente, perfil_id_aplicado")
        .eq("orcamento_id", id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });
  const markupsCategoria = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    ((markupCategoriasQuery.data as any[]) || []).forEach((r) => {
      out[r.categoria] = Number(r.markup_pct) || 0;
    });
    return out;
  }, [markupCategoriasQuery.data]);
  const pisosCategoria = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    ((markupCategoriasQuery.data as any[]) || []).forEach((r) => {
      if (r.piso_margem_pct != null) out[r.categoria] = Number(r.piso_margem_pct);
    });
    return out;
  }, [markupCategoriasQuery.data]);
  const [versoesPendentes, setVersoesPendentes] = useState<
    Array<{ campo_alterado: string; valor_anterior: string; valor_novo: string; motivo: string }>
  >([]);

  const [comissaoOn, setComissaoOn] = useState(false);
  const [comissaoTipo, setComissaoTipo] = useState<"vendas" | "indicacao">("vendas");
  const [comissaoPct, setComissaoPct] = useState<string>("0");
  const [comissaoBeneficiario, setComissaoBeneficiario] = useState("");
  const [comissaoAberta, setComissaoAberta] = useState(false);

  const [margemNegPct, setMargemNegPct] = useState<number>(0); // legado, mantido para compat
  const [negociacaoValor, setNegociacaoValor] = useState<number>(0);

  const [aprovarModal, setAprovarModal] = useState<{ open: boolean; valor: string; observacao: string }>({
    open: false,
    valor: "",
    observacao: "",
  });
  const [naoAprovarModal, setNaoAprovarModal] = useState<{ open: boolean; motivo: string }>({
    open: false,
    motivo: "",
  });
  const [savingFinal, setSavingFinal] = useState(false);

  const custoPorCategoria = useMemo(() => {
    const acc: Record<string, number> = {};
    CATEGORIAS_PLANTAS.forEach((c) => (acc[c] = 0));
    itensMaterial.forEach((it, idx) => {
      const cat = CATEGORIAS_PLANTAS.find(
        (c) => c.toLowerCase() === (it.categoria || "").toLowerCase(),
      );
      if (!cat) return;
      const itemCotacoes = cotacoes[idx] || {};
      const principal = Object.values(itemCotacoes).find((l) => l.status_selecao === "principal");
      if (!principal) return;
      const margem = margensSeg[idx] ?? 0;
      const qtdOrcar = Math.ceil((Number(it.quantidade) || 0) * (1 + margem / 100));
      acc[cat] += (Number(principal.valor_unitario) || 0) * qtdOrcar;
    });
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensMaterial, cotacoes, margensSeg]);

  const totalCustoPlantas = useMemo(
    () => Object.values(custoPorCategoria).reduce((s, v) => s + v, 0),
    [custoPorCategoria],
  );

  const totalCustoInsumos = useMemo(
    () =>
      insumosAdicionais.reduce((s, i) => {
        const qtdEsp = Number(i.quantidade_esperada) || 0;
        const margem = Number(i.margem) || 0;
        const qtd = Math.ceil(qtdEsp * (1 + margem / 100));
        return s + qtd * (Number(i.valor_unitario) || 0);
      }, 0),
    [insumosAdicionais],
  );

  const impostoProdutos = (totalCustoPlantas + totalCustoInsumos) * ((Number(aliquotaProdutos) || 0) / 100);

  const custoLinha = (cat: string) => {
    if (cat === "Insumos") return totalCustoInsumos;
    if (cat === "Fretes") return totalFretes;
    if (cat === "Mão de Obra") return valorNfMo;
    if (cat === "Transporte") return totalTransporte;
    if (cat === "Custos Indiretos") return totalIndiretos;
    return custoPorCategoria[cat] || 0;
  };

  const linhasResumo = useMemo(() => {
    return CATEGORIAS_RESUMO.map((cat) => {
      const custo = custoLinha(cat);
      const markup = markupsCategoria[cat] ?? 0;
      const venda = custo * (1 + markup / 100);
      const margemBruta = venda > 0 ? ((venda - custo) / venda) * 100 : 0;
      return { categoria: cat, custo, markup, venda, margemBruta };
    }).filter((l) => l.custo > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    markupsCategoria,
    custoPorCategoria,
    totalCustoInsumos,
    totalFretes,
    valorNfMo,
    totalTransporte,
    totalIndiretos,
  ]);

  const totaisResumo = useMemo(() => {
    const totalCusto = linhasResumo.reduce((s, l) => s + l.custo, 0);
    const totalVenda = linhasResumo.reduce((s, l) => s + l.venda, 0) + impostoProdutos;
    const margemBrutaVal = totalVenda - totalCusto;
    const markupMedio = totalCusto > 0 ? (totalVenda / totalCusto - 1) * 100 : 0;
    return { totalCusto, totalVenda, margemBrutaVal, markupMedio };
  }, [linhasResumo, impostoProdutos]);

  const valorComissao = comissaoOn
    ? ((Number(comissaoPct) || 0) * totaisResumo.totalVenda) / 100
    : 0;
  // Comissão é ACRESCIDA ao preço final (repasse ao cliente), preservando a margem da empresa.
  // Negociação é DILUÍDA proporcionalmente entre Produtos e Mão de Obra (com base no valor de venda).
  const vendaMo = useMemo(
    () => linhasResumo.filter((l) => l.categoria === "Mão de Obra").reduce((s, l) => s + l.venda, 0),
    [linhasResumo],
  );
  const vendaProdutos = Math.max(0, totaisResumo.totalVenda - vendaMo);
  const baseDiluicao = vendaProdutos + vendaMo;
  const shareProdutos = baseDiluicao > 0 ? vendaProdutos / baseDiluicao : 0;
  const shareMo = baseDiluicao > 0 ? vendaMo / baseDiluicao : 0;
  const negociacaoProdutos = (Number(negociacaoValor) || 0) * shareProdutos;
  const negociacaoMo = (Number(negociacaoValor) || 0) * shareMo;
  const totalClienteSemComissao = totaisResumo.totalVenda + (Number(negociacaoValor) || 0);
  const totalCliente = totalClienteSemComissao + valorComissao;
  const margemBrutaValFinal = totalClienteSemComissao - totaisResumo.totalCusto;
  const areaM2 = Number(form.area_m2) || 0;
  const custoPorM2 = areaM2 > 0 ? totaisResumo.totalCusto / areaM2 : 0;
  const margemBrutaPctTotal =
    totalClienteSemComissao > 0 ? (margemBrutaValFinal / totalClienteSemComissao) * 100 : 0;

  // Markup por categoria é gerenciado na Etapa 4 (Etapa4MarkupBlocoA).
  // Esta tela (Etapa 6) consome o valor pronto via markupCategoriasQuery.



  const persistirOrcamentoCompleto = async (
    statusFinal: string,
    extras?: Record<string, any>,
  ) => {
    setSavingFinal(true);
    try {
      const basePayload: any = {
        ...buildPayload(),
        status: statusFinal,
        aliquota_mes_pct: aliquotaMes,
        aliquota_produtos_pct: aliquotaProdutos,
        tipo_nf: tipoNf,
        margem_negociacao_pct: margemNegPct,
        negociacao_valor: negociacaoValor,
        ...(extras || {}),
      };
      if (statusFinal === "aguardando_aprovacao") {
        basePayload.data_envio = new Date().toISOString().slice(0, 10);
      }

      let orcId = id as string | undefined;
      if (isEdit && orcId) {
        const { error } = await (supabase as any)
          .from("orcamentos")
          .update(basePayload)
          .eq("id", orcId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("orcamentos")
          .insert(basePayload)
          .select("id")
          .single();
        if (error) throw error;
        orcId = data.id;
      }
      if (!orcId) throw new Error("Orçamento sem ID");

      const tabelas = [
        "orcamento_versoes",
        "orcamento_comissoes",
        "orcamento_custos_indiretos",
        "orcamento_transporte",
        "orcamento_mo",
        "orcamento_fretes",
        "orcamento_insumos",
      ];
      // Preserva overrides item-a-item (markup/preço/observação/auditoria) usando CHAVES ESTÁVEIS,
      // nunca a posição/ordem. Inserir, remover ou reordenar não troca override de lugar.
      const ovrCols = "markup_override_pct, preco_venda_override, ajuste_obs, ajustado_por, ajustado_em";
      const [
        { data: itensExistentes },
        { data: insumosExistentes },
        { data: fretesExistentes },
        { data: moExistentes },
        { data: transporteExistentes },
        { data: indiretosExistentes },
      ] = await Promise.all([
        (supabase as any).from("orcamento_itens")
          .select(`id, planta_id, insumo_id, nome_cientifico, nome_popular, porte_solicitado, ${ovrCols}`)
          .eq("orcamento_id", orcId),
        (supabase as any).from("orcamento_insumos")
          .select(`id, nome, fornecedor_id, ${ovrCols}`)
          .eq("orcamento_id", orcId),
        (supabase as any).from("orcamento_fretes")
          .select(`id, percurso, transportador, fornecedor_id, ${ovrCols}`)
          .eq("orcamento_id", orcId),
        (supabase as any).from("orcamento_mo")
          .select(`id, cargo_id, colaborador_id, ${ovrCols}`)
          .eq("orcamento_id", orcId),
        (supabase as any).from("orcamento_transporte")
          .select(`id, tipo, ${ovrCols}`)
          .eq("orcamento_id", orcId),
        (supabase as any).from("orcamento_custos_indiretos")
          .select(`id, tipo, descricao, ${ovrCols}`)
          .eq("orcamento_id", orcId),
      ]);

      const hasOverride = (r: any) =>
        r && (r.markup_override_pct != null || r.preco_venda_override != null);
      const pickOvr = (r: any) => ({
        markup_override_pct: r.markup_override_pct ?? null,
        preco_venda_override: r.preco_venda_override ?? null,
        ajuste_obs: r.ajuste_obs ?? null,
        ajustado_por: r.ajustado_por ?? null,
        ajustado_em: r.ajustado_em ?? null,
      });
      const buildOvrMap = (rows: any[] | null, keyFn: (r: any) => string) => {
        const m = new Map<string, any>();
        (rows || []).forEach((r) => {
          if (!hasOverride(r)) return;
          m.set(keyFn(r), pickOvr(r));
        });
        return m;
      };

      const itemKey = (r: { planta_id?: any; insumo_id?: any; nome_cientifico?: any; nome_popular?: any; porte_solicitado?: any }) => {
        if (r.planta_id) return `planta:${r.planta_id}`;
        if (r.insumo_id) return `insumo:${r.insumo_id}`;
        return `nome:${(r.nome_cientifico || r.nome_popular || "").toLowerCase().trim()}|${(r.porte_solicitado || "").toString().toLowerCase().trim()}`;
      };
      const insumoKey = (r: any) => `${(r.nome || "").toLowerCase().trim()}|${r.fornecedor_id || ""}`;
      const freteKey = (r: any) => `${(r.percurso || "").toLowerCase().trim()}|${r.fornecedor_id || ""}|${(r.transportador || "").toLowerCase().trim()}`;
      const moKey = (r: any) => `${r.cargo_id || ""}|${r.colaborador_id || ""}`;
      const transporteKey = (r: any) => `${(r.tipo || "").toLowerCase().trim()}`;
      const indiretoKey = (r: any) => `${(r.tipo || "").toLowerCase().trim()}|${(r.descricao || "").toLowerCase().trim()}`;

      const overridesItens = buildOvrMap(itensExistentes, itemKey);
      const overridesInsumos = buildOvrMap(insumosExistentes, insumoKey);
      const overridesFretes = buildOvrMap(fretesExistentes, freteKey);
      const overridesMo = buildOvrMap(moExistentes, moKey);
      const overridesTransporte = buildOvrMap(transporteExistentes, transporteKey);
      const overridesIndiretos = buildOvrMap(indiretosExistentes, indiretoKey);

      const idsItensExist = (itensExistentes || []).map((r: any) => r.id);
      if (idsItensExist.length > 0) {
        await (supabase as any).from("orcamento_cotacoes").delete().in("item_id", idsItensExist);
        await (supabase as any).from("orcamento_itens").delete().eq("orcamento_id", orcId);
      }
      for (const t of tabelas) {
        await (supabase as any).from(t).delete().eq("orcamento_id", orcId);
      }

      for (let idx = 0; idx < itensMaterial.length; idx++) {
        const it = itensMaterial[idx];
        const margem = margensSeg[idx] ?? 0;
        const qtdOrcar = Math.ceil((Number(it.quantidade) || 0) * (1 + margem / 100));
        const itemCotacoes = cotacoes[idx] || {};
        const principal = Object.entries(itemCotacoes).find(
          ([, l]) => l.status_selecao === "principal",
        );
        const principalForn = principal ? principal[0] : null;
        const principalLinha = principal ? principal[1] : null;
        const custoUnit = principalLinha ? Number(principalLinha.valor_unitario) || 0 : 0;
        const markupCat = markupsCategoria[it.categoria] ?? 0;
        const dbInfo = itemDbInfoByIdx[idx];
        const itKey = itemKey({
          planta_id: dbInfo?.item_tipo === "planta" ? dbInfo.item_id : null,
          insumo_id: dbInfo?.item_tipo === "insumo" ? dbInfo.item_id : null,
          nome_cientifico: it.nome_cientifico,
          nome_popular: it.nome_popular,
          porte_solicitado: it.porte,
        });
        const ovr = overridesItens.get(itKey);
        const markupEf = ovr?.markup_override_pct != null ? Number(ovr.markup_override_pct) : markupCat;
        const venda = ovr?.preco_venda_override != null
          ? Number(ovr.preco_venda_override)
          : custoUnit * (1 + markupEf / 100);

        const { data: itemRow, error: iErr } = await (supabase as any)
          .from("orcamento_itens")
          .insert({
            orcamento_id: orcId,
            planta_id: itemDbInfoByIdx[idx]?.item_tipo === "planta" ? itemDbInfoByIdx[idx].item_id : null,
            insumo_id: itemDbInfoByIdx[idx]?.item_tipo === "insumo" ? itemDbInfoByIdx[idx].item_id : null,
            categoria: it.categoria,
            nome_popular: it.nome_popular,
            nome_cientifico: it.nome_cientifico,
            porte_solicitado: it.porte,
            quantidade_esperada: it.quantidade,
            margem_seguranca_pct: margem,
            quantidade_orcar: qtdOrcar,
            unidade: it.unidade,
            fornecedor_escolhido_id: principalForn,
            custo_unitario: custoUnit,
            porte_fornecedor: principalLinha?.porte_ofertado || null,
            porte_divergente: principalLinha?.porte_ofertado
              ? (principalLinha.porte_ofertado || "").toLowerCase() !==
                (it.porte || "").toLowerCase()
              : false,
            markup_pct: markupEf,
            markup_override_pct: ovr?.markup_override_pct ?? null,
            preco_venda_override: ovr?.preco_venda_override ?? null,
            ajuste_obs: ovr?.ajuste_obs ?? null,
            ajustado_por: ovr?.ajustado_por ?? null,
            ajustado_em: ovr?.ajustado_em ?? null,
            preco_venda_unitario: venda,
            imposto_pct: 13.5,
            preco_venda_final: venda * 1.135,
            ordem: idx,
          })
          .select("id")
          .single();
        if (iErr) throw iErr;


        for (const [fornId, l] of Object.entries(itemCotacoes)) {
          await (supabase as any).from("orcamento_cotacoes").insert({
            item_id: itemRow.id,
            fornecedor_id: fornId,
            valor_unitario_cotado: Number(l.valor_unitario) || 0,
            porte_ofertado: l.porte_ofertado || null,
            disponivel: l.disponivel,
            status_selecao: l.status_selecao,
            obs: l.obs || null,
          });
        }
      }

      let ord = 0;
      for (const c of insumosCalc) {
        await (supabase as any).from("orcamento_insumos").insert({
          orcamento_id: orcId,
          nome: c.nome,
          quantidade_orcar: c.quantidade,
          unidade: c.unidade,
          valor_unitario: 0,
          valor_total: 0,
          calculado_automaticamente: true,
          ordem: ord++,
        });
      }
      for (const i of insumosAdicionais) {
        if (!i.nome) continue;
        const qtdEsp = Number(i.quantidade_esperada) || 0;
        const margem = Number(i.margem) || 0;
        const qtd = Math.ceil(qtdEsp * (1 + margem / 100));
        const vt = qtd * (Number(i.valor_unitario) || 0);
        const markupIns = markupsCategoria["Insumos"] ?? 0;
        const ovrIns = overridesInsumos.get(insumoKey({ nome: i.nome, fornecedor_id: i.fornecedor_id || null }));
        await (supabase as any).from("orcamento_insumos").insert({
          orcamento_id: orcId,
          nome: i.nome,
          fornecedor_id: i.fornecedor_id || null,
          quantidade_esperada: qtdEsp,
          margem_seguranca_pct: margem,
          quantidade_orcar: qtd,
          unidade: i.unidade,
          valor_unitario: Number(i.valor_unitario) || 0,
          valor_total: vt,
          markup_pct: markupIns,
          preco_venda_unitario:
            (Number(i.valor_unitario) || 0) * (1 + markupIns / 100),
          preco_venda_total: vt * (1 + markupIns / 100),
          calculado_automaticamente: false,
          obs_interna: i.obs_interna || null,
          obs_proposta: i.obs_proposta || null,
          ordem: ord++,
          ...(ovrIns || {}),
        });
      }

      for (const f of fretes) {
        const qtd = Math.ceil((Number(f.qtd_esperada) || 0) * (1 + (Number(f.margem) || 0) / 100));
        const ovrFr = overridesFretes.get(freteKey({
          percurso: f.percurso,
          fornecedor_id: f.modo_transp === "cad" ? (f.transportador_id || null) : null,
          transportador: f.transportador_nome,
        }));
        await (supabase as any).from("orcamento_fretes").insert({
          orcamento_id: orcId,
          fornecedor_id: f.modo_transp === "cad" ? (f.transportador_id || null) : null,
          transportador: f.transportador_nome || null,
          percurso: f.percurso || null,
          descricao_percurso: f.percurso || null,
          valor_unitario: Number(f.valor_unitario) || 0,
          qtd_esperada: Number(f.qtd_esperada) || 0,
          margem_seguranca_pct: Number(f.margem) || 0,
          qtd_orcar: qtd,
          valor_total: qtd * (Number(f.valor_unitario) || 0),
          ...(ovrFr || {}),
        });
      }

      for (const m of moLinhas) {
        const bruto =
          (Number(m.qtd) || 0) * (Number(m.dias) || 0) * (Number(m.salario_diario) || 0);
        const aliq = (aliquotaMes || 0) + (tipoNf === "pj" ? 11 : 0);
        const denom = (100 - aliq) / 100;
        const valNf = denom > 0 ? bruto / denom : 0;
        const ovrMo = overridesMo.get(moKey({ cargo_id: m.cargo_id, colaborador_id: m.colaborador_id }));
        await (supabase as any).from("orcamento_mo").insert({
          orcamento_id: orcId,
          colaborador_id: m.colaborador_id || null,
          cargo_id: m.cargo_id || null,
          qtd_funcionarios: Number(m.qtd) || 0,
          qtd_dias: Number(m.dias) || 0,
          salario_diario: Number(m.salario_diario) || 0,
          custo_total: bruto,
          aliquota_mes_pct: aliquotaMes,
          tipo_nf: tipoNf,
          valor_com_imposto: valNf,
          ...(ovrMo || {}),
        });
      }

      for (const t of transporte) {
        const sub =
          (Number(t.valor_km) || 0) * (Number(t.dias) || 0) * (Number(t.km) || 0);
        const ovrTr = overridesTransporte.get(transporteKey({ tipo: t.tipo }));
        await (supabase as any).from("orcamento_transporte").insert({
          orcamento_id: orcId,
          tipo: t.tipo,
          valor_km: Number(t.valor_km) || 0,
          qtd_dias: Number(t.dias) || 0,
          qtd_km: Number(t.km) || 0,
          subtotal: sub,
          ...(ovrTr || {}),
        });
      }

      for (const c of custosIndiretos) {
        const total = (Number(c.valor_unitario) || 0) * (Number(c.quantidade) || 0);
        const ovrCi = overridesIndiretos.get(indiretoKey({ tipo: c.tipo, descricao: c.descricao }));
        await (supabase as any).from("orcamento_custos_indiretos").insert({
          orcamento_id: orcId,
          tipo: c.tipo,
          descricao: c.descricao || null,
          valor_unitario: Number(c.valor_unitario) || 0,
          quantidade: Number(c.quantidade) || 0,
          total,
          ...(ovrCi || {}),
        });
      }

      if (comissaoOn && Number(comissaoPct) > 0) {
        await (supabase as any).from("orcamento_comissoes").insert({
          orcamento_id: orcId,
          tipo: comissaoTipo,
          percentual: Number(comissaoPct) || 0,
          beneficiario: comissaoBeneficiario || null,
          valor_calculado: valorComissao,
        });
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;
      for (const v of versoesPendentes) {
        await (supabase as any).from("orcamento_versoes").insert({
          orcamento_id: orcId,
          campo_alterado: v.campo_alterado,
          valor_anterior: v.valor_anterior,
          valor_novo: v.valor_novo,
          motivo: v.motivo,
          usuario_id: uid,
        });
      }
      setVersoesPendentes([]);

      // Snapshot imutável em momentos-chave: envio ao cliente e aprovação
      const tipoSnapshot =
        statusFinal === "aguardando_aprovacao"
          ? "envio"
          : statusFinal === "aprovado"
            ? "aprovacao"
            : null;
      if (tipoSnapshot) {
        const snapshot = {
          form,
          itensMaterial,
          cotacoes,
          margensSeg,
          insumosCalc,
          insumosAdicionais,
          fretes,
          moLinhas,
          transporte,
          custosIndiretos,
          markupsCategoria,
          aliquotaMes,
          aliquotaProdutos,
          tipoNf,
          comissao: comissaoOn
            ? { tipo: comissaoTipo, percentual: Number(comissaoPct) || 0, beneficiario: comissaoBeneficiario, valor: valorComissao }
            : null,
          margemNegPct,
          negociacaoValor,
          negociacaoDistribuicao: { produtos: negociacaoProdutos, mo: negociacaoMo },
          totais: {
            totalCusto: totaisResumo.totalCusto,
            totalVenda: totaisResumo.totalVenda,
            totalCliente,
            impostoProdutos,
            margemBrutaVal: margemBrutaValFinal,
            markupMedio: totaisResumo.markupMedio,
          },
          extras: extras || null,
        };
        await (supabase as any).from("orcamento_snapshots").insert({
          orcamento_id: orcId,
          tipo: tipoSnapshot,
          snapshot,
          created_by: uid,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      if (!isEdit) navigate(`/orcamentos/${orcId}`, { replace: true });
      return orcId;
    } finally {
      setSavingFinal(false);
    }
  };

  const handleSalvarRascunho = async () => {
    try {
      await persistirOrcamentoCompleto("rascunho");
      toast({ title: "Rascunho salvo com sucesso" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    }
  };

  const handleEnviarCliente = async () => {
    try {
      await persistirOrcamentoCompleto("aguardando_aprovacao");
      const validade = form.prazo_validade_dias ? Number(form.prazo_validade_dias) : 30;
      const dataValid = new Date();
      dataValid.setDate(dataValid.getDate() + validade);
      toast({
        title: "Orçamento enviado ao cliente",
        description: `Válido até ${dataValid.toLocaleDateString("pt-BR")}`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e?.message, variant: "destructive" });
    }
  };

  const handleAprovar = async () => {
    try {
      await persistirOrcamentoCompleto("aprovado", {
        valor_negociado_final: Number(aprovarModal.valor) || totalCliente,
        data_aprovacao: new Date().toISOString(),
        observacao_aprovacao: aprovarModal.observacao?.trim() || null,
        editavel: false,
      });
      if (form.cliente_id) {
        await (supabase as any)
          .from("crm_cards")
          .update({ status: "Aprovado" })
          .eq("cliente_id", form.cliente_id);
      }
      setAprovarModal({ open: false, valor: "", observacao: "" });
      toast({ title: "Orçamento aprovado com sucesso!" });
      setTimeout(() => navigate("/orcamentos"), 2000);
    } catch (e: any) {
      toast({ title: "Erro ao aprovar", description: e?.message, variant: "destructive" });
    }
  };

  const handleNaoAprovar = async () => {
    const motivo = naoAprovarModal.motivo.trim();
    if (!motivo) {
      toast({ title: "Informe o motivo da não aprovação", variant: "destructive" });
      return;
    }
    try {
      await persistirOrcamentoCompleto("nao_aprovado", {
        motivo_nao_aprovacao: motivo,
        data_nao_aprovacao: new Date().toISOString(),
        editavel: false,
      });
      setNaoAprovarModal({ open: false, motivo: "" });
      toast({ title: "Orçamento marcado como não aprovado" });
      setTimeout(() => navigate("/orcamentos"), 1500);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    }
  };

  const setCotacao = (itemIdx: number, fornId: string, patch: Partial<CotacaoLinha>) => {
    setCotacoes((prev) => {
      const itemMap = { ...(prev[itemIdx] || {}) };
      const atual: CotacaoLinha = itemMap[fornId] || {
        valor_unitario: "",
        porte_ofertado: "",
        disponivel: "nc",
        status_selecao: "descartado",
        obs: "",
      };
      itemMap[fornId] = { ...atual, ...patch };
      if (patch.status_selecao === "principal") {
        Object.keys(itemMap).forEach((k) => {
          if (k !== fornId && itemMap[k].status_selecao === "principal") {
            itemMap[k] = { ...itemMap[k], status_selecao: "backup1" };
          }
        });
      }
      return { ...prev, [itemIdx]: itemMap };
    });
  };
  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-proposta"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tipos_proposta")
        .select("id, sigla, nome_completo")
        .eq("ativo", true)
        .order("sigla");
      if (error) throw error;
      return (data || []) as TipoProposta[];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-list-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: locaisCliente = [] } = useQuery({
    queryKey: ["orc-locais-cliente", form.cliente_id],
    queryFn: async () => {
      if (!form.cliente_id) return [];
      const { data, error } = await (supabase as any)
        .from("locais_cliente")
        .select("id, nome, endereco_completo, tipo_pessoa, cidade, estado, tipo_cliente")
        .eq("cliente_id", form.cliente_id)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!form.cliente_id,
  });

  // Sincroniza endereço/cidade/estado a partir do local selecionado
  useEffect(() => {
    if (!form.local_id) return;
    const local = (locaisCliente as any[]).find((l) => l.id === form.local_id);
    if (!local) return;
    setForm((p) => ({
      ...p,
      local_endereco: local.endereco_completo || p.local_endereco,
      cidade: local.cidade ? capitalizeWords(local.cidade) : p.cidade,
      estado: local.estado || p.estado,
      tipo_cliente: local.tipo_cliente || p.tipo_cliente,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.local_id, locaisCliente]);

  // Limpa local_id se ele não pertence ao cliente atualmente selecionado
  useEffect(() => {
    if (!form.local_id) return;
    if (!(locaisCliente as any[]).some((l) => l.id === form.local_id)) {
      setForm((p) => ({ ...p, local_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locaisCliente]);

  const { data: perfisMarkup = [] } = useQuery({
    queryKey: ["perfis-markup-ativos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("perfis_markup")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-ativos-orc-orcamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, user_id")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      const list = data || [];
      const userIds = list.map((c) => c.user_id).filter(Boolean) as string[];
      if (userIds.length === 0) return [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      const allowed = new Set(["admin", "administrativo", "gestao_campo"]);
      const okUsers = new Set((roles || []).filter((r: any) => allowed.has(r.role)).map((r: any) => r.user_id));
      return list.filter((c: any) => c.user_id && okUsers.has(c.user_id));
    },
  });

  // Default responsável = usuário logado
  useEffect(() => {
    (async () => {
      if (form.responsavel_id || isEdit) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const match = (colaboradores as any[]).find((c) => c.user_id === user.id);
      if (match) setForm((p) => ({ ...p, responsavel_id: match.id }));
    })();
  }, [colaboradores, isEdit]);

  const { data: orcamento } = useQuery({
    queryKey: ["orcamento", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("orcamentos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (orcamento) {
      const sigla = (tipos as TipoProposta[]).find((t) => t.id === orcamento.tipo_proposta_id)?.sigla || "";
      setForm({
        tipo_proposta_id: orcamento.tipo_proposta_id || "",
        tipo_proposta_sigla: sigla,
        codigo: orcamento.codigo || "",
        cliente_id: orcamento.cliente_id || "",
        local_id: orcamento.local_id || "",
        local_endereco: orcamento.local_endereco || "",
        tipo_cliente: orcamento.tipo_cliente || "",
        cidade: orcamento.cidade ? capitalizeWords(orcamento.cidade) : "",
        estado: orcamento.estado || "",
        area_m2: orcamento.area_m2?.toString() || "",
        perfil_markup_id: orcamento.perfil_markup_id || "",
        prazo_validade_dias: orcamento.prazo_validade_dias ?? 20,
        obs_interna: orcamento.obs_interna || "",
        obs_proposta: orcamento.obs_proposta || "",
        data_envio: orcamento.data_envio || "",
        responsavel_id: orcamento.responsavel_id || "",
      });
      if (orcamento.aliquota_mes_pct != null) setAliquotaMes(Number(orcamento.aliquota_mes_pct));
      if ((orcamento as any).aliquota_produtos_pct != null) setAliquotaProdutos(Number((orcamento as any).aliquota_produtos_pct));
      if (orcamento.tipo_nf) setTipoNf(orcamento.tipo_nf);
      if (orcamento.margem_negociacao_pct != null) setMargemNegPct(Number(orcamento.margem_negociacao_pct));
      if ((orcamento as any).negociacao_valor != null) setNegociacaoValor(Number((orcamento as any).negociacao_valor));
    }
  }, [orcamento, tipos]);

  // === Hidratação dos dados do orçamento (itens, cotações, insumos, MO, fretes, etc.) ===
  const hidratadoRef = useRef(false);
  useQuery({
    queryKey: ["orcamento-hidratacao", id],
    enabled: isEdit && !!id && !hidratadoRef.current,
    queryFn: async () => {
      const [
        { data: itens },
        { data: insumosDb },
        { data: moDb },
        { data: fretesDb },
        { data: transpDb },
        { data: indirDb },
        { data: comDb },
      ] = await Promise.all([
        (supabase as any).from("orcamento_itens").select("*").eq("orcamento_id", id).order("ordem"),
        (supabase as any).from("orcamento_insumos").select("*").eq("orcamento_id", id).order("ordem"),
        (supabase as any).from("orcamento_mo").select("*").eq("orcamento_id", id),
        (supabase as any).from("orcamento_fretes").select("*").eq("orcamento_id", id),
        (supabase as any).from("orcamento_transporte").select("*").eq("orcamento_id", id),
        (supabase as any).from("orcamento_custos_indiretos").select("*").eq("orcamento_id", id),
        (supabase as any).from("orcamento_comissoes").select("*").eq("orcamento_id", id).maybeSingle(),
      ]);

      const itensList = itens || [];
      const itemIds = itensList.map((i: any) => i.id);
      let cotacoesDb: any[] = [];
      if (itemIds.length > 0) {
        const { data: cot } = await (supabase as any)
          .from("orcamento_cotacoes")
          .select("*")
          .in("item_id", itemIds);
        cotacoesDb = cot || [];
      }

      // itensMaterial + margensSeg + markupsCategoria
      const novosItens: ItemMemorial[] = itensList.map((i: any) => ({
        nome_popular: i.nome_popular || "",
        nome_cientifico: i.nome_cientifico || null,
        planta_id: i.planta_id || null,
        insumo_id: i.insumo_id || null,
        porte: i.porte_solicitado || "",
        quantidade: Number(i.quantidade_esperada) || 0,
        unidade: i.unidade || "UNID",
        categoria: i.categoria || "",
        confianca: "alta",
      }));
      const novasMargens: Record<number, number> = {};
      itensList.forEach((i: any, idx: number) => {
        novasMargens[idx] = Number(i.margem_seguranca_pct) || 0;
      });
      setItensMaterial(novosItens);
      setMargensSeg(novasMargens);
      // markup vem de orcamento_categorias_markup via markupCategoriasQuery
      if (novosItens.length > 0) setPdfCarregado(true);


      // cotacoes + fornecedoresSelecionados (por idx)
      const novasCot: Record<number, Record<string, CotacaoLinha>> = {};
      const novosForn: Record<number, string[]> = {};
      itensList.forEach((it: any, idx: number) => {
        const linhas = cotacoesDb.filter((c) => c.item_id === it.id);
        if (linhas.length === 0) return;
        novasCot[idx] = {};
        novosForn[idx] = [];
        linhas.forEach((l: any) => {
          if (!l.fornecedor_id) return;
          novasCot[idx][l.fornecedor_id] = {
            valor_unitario: l.valor_unitario_cotado != null ? String(l.valor_unitario_cotado) : "",
            porte_ofertado: l.porte_ofertado || "",
            disponivel: (l.disponivel as any) || "nc",
            status_selecao: (l.status_selecao as any) || "descartado",
            obs: l.obs || "",
          };
          if (l.status_selecao && l.status_selecao !== "descartado") {
            novosForn[idx].push(l.fornecedor_id);
          }
        });
      });
      setCotacoes(novasCot);
      setFornecedoresSelecionados(novosForn);

      // insumos
      const insAuto: InsumoCalc[] = [];
      const insAdic: InsumoAdicional[] = [];
      (insumosDb || []).forEach((i: any) => {
        if (i.calculado_automaticamente) {
          insAuto.push({
            tipo: i.nome,
            nome: i.nome,
            quantidade: Number(i.quantidade_orcar) || 0,
            unidade: i.unidade || "",
          });
        } else {
          insAdic.push({
            nome: i.nome || "",
            fornecedor_id: i.fornecedor_id || "",
            quantidade_esperada: i.quantidade_esperada != null ? String(i.quantidade_esperada) : "",
            unidade: i.unidade || "unidade",
            margem: i.margem_seguranca_pct != null ? String(i.margem_seguranca_pct) : "0",
            valor_unitario: i.valor_unitario != null ? String(i.valor_unitario) : "",
            obs_interna: i.obs_interna || "",
            obs_proposta: i.obs_proposta || "",
          });
        }
      });
      if (insAuto.length > 0) {
        setInsumosCalc(insAuto);
        setInsumosCalculados(true);
      }
      setInsumosAdicionais(insAdic);

      // MO
      setMoLinhas(
        (moDb || []).map((m: any) => {
          const diario = m.salario_diario != null ? Number(m.salario_diario) : 0;
          return {
            cargo_id: m.cargo_id || "",
            cargo_nome: "",
            qtd: m.qtd_funcionarios != null ? String(m.qtd_funcionarios) : "1",
            dias: m.qtd_dias != null ? String(m.qtd_dias) : "",
            salario_mensal: String(diario * 21),
            salario_diario: String(diario),
          };
        }),
      );

      // Fretes
      setFretes(
        (fretesDb || []).map((f: any) => ({
          transportador_id: f.fornecedor_id || "",
          transportador_nome: f.transportador || "",
          modo_transp: f.fornecedor_id ? "cad" : "livre",
          percurso: f.percurso || f.descricao_percurso || "",
          valor_unitario: f.valor_unitario != null ? String(f.valor_unitario) : "",
          qtd_esperada: f.qtd_esperada != null ? String(f.qtd_esperada) : "",
          margem: f.margem_seguranca_pct != null ? String(f.margem_seguranca_pct) : "0",
        })),
      );

      // Transporte equipe
      if ((transpDb || []).length > 0) {
        setTransporte(
          (transpDb as any[]).map((t: any) => ({
            tipo: (t.tipo as any) || "MFM",
            valor_km: t.valor_km != null ? String(t.valor_km) : "0",
            dias: t.qtd_dias != null ? String(t.qtd_dias) : "",
            km: t.qtd_km != null ? String(t.qtd_km) : "",
          })),
        );
      }

      // Custos indiretos
      setCustosIndiretos(
        (indirDb || []).map((c: any) => ({
          tipo: c.tipo || "outros",
          descricao: c.descricao || "",
          valor_unitario: c.valor_unitario != null ? String(c.valor_unitario) : "0",
          quantidade: c.quantidade != null ? String(c.quantidade) : "1",
        })),
      );

      // Comissão
      if (comDb) {
        setComissaoOn(true);
        setComissaoTipo((comDb.tipo as any) || "vendas");
        setComissaoPct(comDb.percentual != null ? String(comDb.percentual) : "0");
        setComissaoBeneficiario(comDb.beneficiario || "");
      }

      hidratadoRef.current = true;
      // Bloqueia o autosave inicial pra não sobrescrever durante o load
      firstAutoSaveRef.current = true;
      return true;
    },
  });

  // Geração automática do código — atômica, sem duplicação.
  // Usa RPC `gerar_codigo_orcamento(sigla)` que aplica advisory lock e calcula o próximo
  // sequencial dentro do mesmo sigla+mes+ano. Em caso de colisão (insert simultâneo que
  // venceu a corrida), re-tenta uma vez.
  const handleTipoPropostaChange = async (tipoId: string) => {
    const tipo = (tipos as TipoProposta[]).find((t) => t.id === tipoId);
    if (!tipo) return;
    const sigla = tipo.sigla;
    try {
      const { data: codigoGerado, error } = await (supabase as any).rpc(
        "gerar_codigo_orcamento",
        { p_sigla: sigla },
      );
      if (error) throw error;
      setForm((p) => ({
        ...p,
        tipo_proposta_id: tipoId,
        tipo_proposta_sigla: sigla,
        codigo: codigoGerado || "",
      }));
    } catch (e) {
      // fallback: usa contagem (mesmo padrão antigo) só pra não travar a tela
      const agora = new Date();
      const mes = String(agora.getMonth() + 1).padStart(2, "0");
      const ano = String(agora.getFullYear()).slice(-2);
      try {
        const { count } = await (supabase as any)
          .from("orcamentos")
          .select("*", { count: "exact", head: true })
          .like("codigo", `${sigla}%${mes}${ano}`);
        const sequencial = String((count || 0) + 1).padStart(2, "0");
        const codigo = `${sigla}${sequencial}${mes}${ano}`;
        setForm((p) => ({ ...p, tipo_proposta_id: tipoId, tipo_proposta_sigla: sigla, codigo }));
      } catch {
        setForm((p) => ({ ...p, tipo_proposta_id: tipoId, tipo_proposta_sigla: sigla }));
      }
    }
  };

  const camposObrigatoriosOk = useMemo(
    () => REQUIRED_FIELDS.every((k) => String((form as any)[k] ?? "").trim() !== ""),
    [form]
  );

  const buildPayload = () => ({
    codigo: form.codigo.trim() || null,
    tipo_proposta_id: form.tipo_proposta_id || null,
    cliente_id: form.cliente_id || null,
    local_id: form.local_id || null,
    local_endereco: form.local_endereco || null,
    tipo_cliente: form.tipo_cliente || null,
    cidade: form.cidade || null,
    estado: form.estado || null,
    area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
    perfil_markup_id: form.perfil_markup_id || null,
    prazo_validade_dias: form.prazo_validade_dias ? Number(form.prazo_validade_dias) : null,
    responsavel_id: form.responsavel_id || null,
    data_envio: form.data_envio || null,
    obs_interna: form.obs_interna || null,
    obs_proposta: form.obs_proposta || null,
    status: "rascunho" as const,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (isEdit) {
        const { error } = await (supabase as any).from("orcamentos").update(payload).eq("id", id);
        if (error) throw error;
        return id as string;
      }
      // Insert com retry contra duplicação de código (raça com outro orçamento).
      const tryInsert = async (p: any) => {
        const { data, error } = await (supabase as any)
          .from("orcamentos")
          .insert(p)
          .select("id")
          .single();
        return { data, error };
      };
      let { data, error } = await tryInsert(payload);
      if (error && (error.code === "23505" || /duplic/i.test(error.message || ""))) {
        // re-gera código atomicamente e tenta de novo
        try {
          const { data: novo } = await (supabase as any).rpc("gerar_codigo_orcamento", {
            p_sigla: form.tipo_proposta_sigla,
          });
          if (novo) {
            setForm((c) => ({ ...c, codigo: novo }));
            const r2 = await tryInsert({ ...payload, codigo: novo });
            data = r2.data;
            error = r2.error;
          }
        } catch {}
      }
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      toast({ title: "Rascunho salvo com sucesso" });
      if (!isEdit) navigate(`/orcamentos/${newId}`, { replace: true });
    },
    onError: (e: any) => {
      toast({
        title: "Erro ao salvar",
        description: e?.message || "Verifique os campos",
        variant: "destructive",
      });
    },
  });

  // === Auto-save silencioso ===
  // Salva o orçamento completo (informações iniciais + itens + cotações) automaticamente
  // sempre que dados-chave mudam, com debounce. Não exibe toast.
  const persistirRef = useRef(persistirOrcamentoCompleto);
  useEffect(() => {
    persistirRef.current = persistirOrcamentoCompleto;
  });
  const autoSaveInflightRef = useRef(false);
  const autoSavePendingRef = useRef(false);

  const triggerAutoSave = async () => {
    if (autoSaveInflightRef.current) {
      autoSavePendingRef.current = true;
      return;
    }
    autoSaveInflightRef.current = true;
    try {
      await persistirRef.current("rascunho");
    } catch (e) {
      console.warn("[autoSave] falhou:", e);
    } finally {
      autoSaveInflightRef.current = false;
      if (autoSavePendingRef.current) {
        autoSavePendingRef.current = false;
        triggerAutoSave();
      }
    }
  };

  const firstAutoSaveRef = useRef(true);
  useEffect(() => {
    if (firstAutoSaveRef.current) {
      firstAutoSaveRef.current = false;
      return;
    }
    // No modo edição, sempre auto-salva (o orçamento já existe).
    // No modo criação, espera os campos obrigatórios pra criar o registro inicial.
    if (!isEdit && !camposObrigatoriosOk) return;
    const t = setTimeout(() => {
      triggerAutoSave();
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(itensMaterial),
    JSON.stringify(cotacoes),
    JSON.stringify(fornecedoresSelecionados),
    JSON.stringify(margensSeg),
    JSON.stringify(markupsCategoria),
    aliquotaMes,
    aliquotaProdutos,
    tipoNf,
    margemNegPct,
    negociacaoValor,
  ]);

  const itensBaixaConfianca = useMemo(
    () => itensMaterial.filter((i) => i.confianca === "baixa").length,
    [itensMaterial],
  );

  // === ETAPA 3 — Histórico de fornecedores por item ===
  // Considera nome popular + nome científico para o matching com catálogo
  const nomesItens = useMemo(() => {
    const set = new Set<string>();
    itensMaterial.forEach((i) => {
      const pop = (i.nome_popular || "").trim();
      const sci = (i.nome_cientifico || "").trim();
      if (pop) set.add(pop);
      if (sci) set.add(sci);
    });
    return Array.from(set);
  }, [itensMaterial]);

  const fetchCatalogoPaginado = async (table: "plantas" | "insumos") => {
    const pageSize = 1000;
    let from = 0;
    const all: any[] = [];
    while (true) {
      const query = table === "plantas"
        ? (supabase as any)
            .from("plantas")
            .select("id, nome_popular, nome_cientifico, fornecedor_id, preco_unitario, porte, altura_m, altura_min_m, altura_max_m, unidade, ativo, ultima_compra")
            .eq("ativo", true)
        : (supabase as any)
            .from("insumos")
            .select("id, nome, fornecedor_id, preco_unitario, unidade, categoria, ativo, ultima_compra")
            .eq("ativo", true);

      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      const batch = data || [];
      all.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return all;
  };

  const { data: historicoPorItem = {}, refetch: refetchHistorico } = useQuery({
    queryKey: ["historico-fornecedores-orc", nomesItens],
    enabled: etapaAtual === 3 && nomesItens.length > 0,
    queryFn: async () => {
      const norm = normalizarNomeCatalogo;
      const nomesNorm = new Set(nomesItens.map(norm).filter(Boolean));
      if (nomesNorm.size === 0) return {} as Record<string, any[]>;

      const [plantas, insumos] = await Promise.all([
        fetchCatalogoPaginado("plantas"),
        fetchCatalogoPaginado("insumos"),
      ]);
      const itemIdToKey = new Map<string, { tipo: "planta" | "insumo"; key: string }>();
      const catalogRows: any[] = [];

      const matchesNome = (requested: string, ...candidates: Array<string | null | undefined>) => {
        const exact = candidates.some((c) => norm(c || "") === requested);
        if (exact) return true;
        return candidates.some((c) => {
          const n = norm(c || "");
          return requested.length >= 4 && n.length >= 4 && (n.includes(requested) || requested.includes(n));
        });
      };

      nomesNorm.forEach((requested) => {
        const plantasExatas = (plantas || []).filter((p: any) =>
          norm(p.nome_popular) === requested || norm(p.nome_cientifico || "") === requested,
        );
        const plantasMatch = plantasExatas.length > 0
          ? plantasExatas
          : (plantas || []).filter((p: any) => matchesNome(requested, p.nome_popular, p.nome_cientifico));

        plantasMatch.forEach((p: any) => {
          itemIdToKey.set(p.id, { tipo: "planta", key: requested });
          if (p.fornecedor_id) {
            const minM = p.altura_min_m ?? p.altura_m;
            const maxM = p.altura_max_m ?? p.altura_m;
            const portePadronizado = (minM != null && maxM != null && Number(minM) !== Number(maxM))
              ? `${formatPorteMetros(minM, { suffix: false })} – ${formatPorteMetros(maxM)}`
              : formatPorteMetros((minM ?? maxM) as number | null);
            catalogRows.push({
              id: `catalogo-${p.id}-${p.fornecedor_id}`,
              item_id: p.id,
              item_tipo: "planta",
              preco: p.preco_unitario,
              porte: p.porte || (portePadronizado !== "—" ? portePadronizado : null),
              unidade: p.unidade,
              data_orcamento: p.ultima_compra || null,
              fornecedor_id: p.fornecedor_id,
              key: requested,
              fonte_catalogo: true,
            });
          }
        });

        const insumosExatos = (insumos || []).filter((i: any) => norm(i.nome) === requested);
        const insumosMatch = insumosExatos.length > 0
          ? insumosExatos
          : (insumos || []).filter((i: any) => matchesNome(requested, i.nome));

        insumosMatch.forEach((i: any) => {
          itemIdToKey.set(i.id, { tipo: "insumo", key: requested });
          if (i.fornecedor_id) {
            catalogRows.push({
              id: `catalogo-${i.id}-${i.fornecedor_id}`,
              item_id: i.id,
              item_tipo: "insumo",
              preco: i.preco_unitario,
              porte: null,
              unidade: i.unidade,
              data_orcamento: i.ultima_compra || null,
              fornecedor_id: i.fornecedor_id,
              key: requested,
              fonte_catalogo: true,
            });
          }
        });
      });

      const allIds = Array.from(itemIdToKey.keys());
      if (allIds.length === 0 && catalogRows.length === 0) return {} as Record<string, any[]>;

      const chunk = <T,>(arr: T[], size = 80): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
        return chunks;
      };

      let hist: any[] = [];
      if (allIds.length > 0) {
        const histChunks = await Promise.all(
          chunk(allIds).map(async (ids) => {
            const { data, error: hErr } = await (supabase as any)
              .from("historico_precos")
              .select(
                "id, item_id, item_tipo, preco, porte, unidade, data_orcamento, fornecedor_id, registrado_por, observacoes, criado_em, fornecedores(id, nome, mercado, cidade, telefone, whatsapp), colaboradores:registrado_por(nome)",
              )
              .in("item_id", ids)
              .order("data_orcamento", { ascending: false });
            if (hErr) throw hErr;
            return data || [];
          }),
        );
        hist = histChunks.flat();
      }

      // 3) Buscar avaliações dos fornecedores para os mesmos itens, em lotes para não estourar a URL da API
      const avalChunks = allIds.length > 0
        ? await Promise.all(
            chunk(allIds).map(async (ids) => {
              const { data, error: aErr } = await (supabase as any)
                .from("fornecedor_avaliacoes")
                .select("fornecedor_id, item_id, item_tipo, nota")
                .in("item_id", ids);
              if (aErr) throw aErr;
              return data || [];
            }),
          )
        : [];
      const avals = avalChunks.flat();
      const fornecedorIds = Array.from(new Set([...catalogRows, ...hist].map((r: any) => r.fornecedor_id).filter(Boolean)));
      const fornecedoresChunks = fornecedorIds.length > 0
        ? await Promise.all(
            chunk(fornecedorIds).map(async (ids) => {
              const { data, error: fErr } = await (supabase as any)
                .from("fornecedores")
                .select("id, nome, mercado, cidade, telefone, whatsapp")
                .in("id", ids);
              if (fErr) throw fErr;
              return data || [];
            }),
          )
        : [];
      const fornecedoresCatalogo = fornecedoresChunks.flat();
      const fornecedoresMap = new Map((fornecedoresCatalogo || []).map((f: any) => [f.id, f]));
      const avalKey = (fid: string, iid: string) => `${fid}::${iid}`;
      const avalMap: Record<string, { soma: number; n: number }> = {};
      (avals || []).forEach((a: any) => {
        const k = avalKey(a.fornecedor_id, a.item_id);
        if (!avalMap[k]) avalMap[k] = { soma: 0, n: 0 };
        avalMap[k].soma += a.nota; avalMap[k].n += 1;
      });

      // Agrupa por nome normalizado e por fornecedor: mantém a linha mais recente
      // como principal; expõe portes alternativos no campo "outros_portes".
      const map: Record<string, any[]> = {};
      const seen: Record<string, Record<string, any>> = {}; // key -> fornId -> row
      for (const row of [...catalogRows, ...hist]) {
        const ref = itemIdToKey.get(row.item_id);
        if (!ref) continue;
        if (row.item_tipo && row.item_tipo !== ref.tipo) continue;
        const key = ref.key;
        if (!map[key]) { map[key] = []; seen[key] = {}; }
        const av = avalMap[avalKey(row.fornecedor_id, row.item_id)];
        const enriched = { ...row, fornecedores: row.fornecedores || fornecedoresMap.get(row.fornecedor_id), nota_media: av ? av.soma / av.n : null, nota_qtd: av?.n || 0 };
        if (!seen[key][row.fornecedor_id]) {
          seen[key][row.fornecedor_id] = { ...enriched, outros_portes: [] };
          map[key].push(seen[key][row.fornecedor_id]);
        } else if (row.porte) {
          // Adiciona porte alternativo se diferente
          const principal = seen[key][row.fornecedor_id];
          if (row.porte !== principal.porte && !principal.outros_portes.some((o: any) => o.porte === row.porte)) {
            principal.outros_portes.push({ porte: row.porte, preco: row.preco, data_orcamento: row.data_orcamento });
          }
        }
      }
      return map;
    },
  });

  const normNome = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // Une linhas de histórico encontradas tanto pelo nome popular quanto pelo científico,
  // deduplicando por (fornecedor_id + item_id).
  const fornecedoresDoItem = (item: ItemMemorial) => {
    const hist = historicoPorItem as Record<string, any[]>;
    const pop = normNome(item.nome_popular);
    const sci = normNome(item.nome_cientifico || "");
    const rowsA = pop ? hist[pop] || [] : [];
    const rowsB = sci && sci !== pop ? hist[sci] || [] : [];
    if (rowsB.length === 0) return rowsA;
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of [...rowsA, ...rowsB]) {
      const k = `${r.fornecedor_id || ""}::${r.item_id || ""}::${r.porte || ""}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    return out;
  };

  // Mapeia ItemMemorial (por idx) -> { item_id, item_tipo } usando histórico carregado
  const itemDbInfoByIdx = useMemo(() => {
    const map: Record<number, { item_id: string; item_tipo: "planta" | "insumo" }> = {};
    itensMaterial.forEach((it, idx) => {
      const rows = fornecedoresDoItem(it);
      const r = rows[0];
      if (r?.item_id && r?.item_tipo) {
        map[idx] = { item_id: r.item_id, item_tipo: r.item_tipo };
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensMaterial, JSON.stringify(historicoPorItem)]);

  // IDs de catálogo presentes na etapa, para buscar marcações de "não tinha o item"
  const itemIdsCatalogo = useMemo(
    () => Array.from(new Set(Object.values(itemDbInfoByIdx).map((v) => v.item_id))),
    [itemDbInfoByIdx],
  );
  const { data: indispMap = new Map() } = useIndisponibilidades(itemIdsCatalogo);

  // Estado do diálogo de marcação "não tinha o item"
  const [indispTarget, setIndispTarget] = useState<{
    itemId: string;
    itemTipo: "planta" | "insumo";
    fornecedorId: string;
    fornecedorNome?: string | null;
    itemNome?: string;
  } | null>(null);

  // Auto-grava histórico de preços quando o usuário ajusta o valor cotado.
  // Cotação foi fundida na etapa Fornecedores (etapa 3 no novo fluxo).
  const lastSavedPrecoRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (etapaAtual !== 3) return;
    const t = setTimeout(async () => {
      const inserts: any[] = [];
      Object.entries(cotacoes).forEach(([idxStr, linhas]) => {
        const idx = Number(idxStr);
        const info = itemDbInfoByIdx[idx];
        if (!info) return;
        const item = itensMaterial[idx];
        Object.entries(linhas).forEach(([fid, l]) => {
          const v = Number(l.valor_unitario);
          if (!v || v <= 0) return;
          const key = `${info.item_id}::${fid}::${l.porte_ofertado || ""}`;
          if (lastSavedPrecoRef.current[key] === v) return;
          lastSavedPrecoRef.current[key] = v;
          inserts.push({
            item_id: info.item_id,
            item_tipo: info.item_tipo,
            fornecedor_id: fid,
            preco: v,
            porte: l.porte_ofertado || item?.porte || null,
            unidade: item?.unidade || null,
            data_orcamento: new Date().toISOString().slice(0, 10),
          });
        });
      });
      if (inserts.length === 0) return;
      try {
        const { error } = await (supabase as any).from("historico_precos").insert(inserts);
        if (error) console.warn("[hist preco autosave]", error);
        else refetchHistorico?.();
      } catch (e) {
        console.warn("[hist preco autosave] falhou", e);
      }
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cotacoes), etapaAtual, itemDbInfoByIdx]);

  const resumoFornecedores = useMemo(() => {
    let semForn = 0;
    let risco = 0;
    let ok = 0;
    itensMaterial.forEach((it, idx) => {
      const sel = fornecedoresSelecionados[idx]?.length || 0;
      const disp = fornecedoresDoItem(it).length;
      const total = Math.max(sel, disp);
      if (total === 0) semForn++;
      else if (total === 1) risco++;
      else if (total >= 3 || sel >= 2) ok++;
    });
    return { semForn, risco, ok };
  }, [itensMaterial, fornecedoresSelecionados, historicoPorItem]);

  // Pendências para avançar à Etapa 4 (Markup)
  const pendenciasEtapa3 = useMemo(() => {
    const itensSemPrincipal: { idx: number; nome: string }[] = [];
    const fornsSemMercadoMap: Map<string, { id: string; nome: string; itens: string[] }> = new Map();
    itensMaterial.forEach((it, idx) => {
      const sel = fornecedoresSelecionados[idx] || [];
      const linhas = cotacoes[idx] || {};
      const temPrincipal = sel.some((fid) => linhas[fid]?.status_selecao === "principal");
      if (!temPrincipal) {
        itensSemPrincipal.push({ idx, nome: it.nome_popular || `Item ${idx + 1}` });
      }
      // Verifica fornecedores selecionados sem mercado
      const fornsBruto = fornecedoresDoItem(it) as any[];
      sel.forEach((fid) => {
        const row = fornsBruto.find((r: any) => r.fornecedor_id === fid);
        const f = row?.fornecedores;
        if (f && !String(f.mercado || "").trim()) {
          const cur = fornsSemMercadoMap.get(fid) || { id: fid, nome: f.nome || "Fornecedor", itens: [] };
          if (!cur.itens.includes(it.nome_popular)) cur.itens.push(it.nome_popular || `Item ${idx + 1}`);
          fornsSemMercadoMap.set(fid, cur);
        }
      });
    });
    return {
      itensSemPrincipal,
      fornsSemMercado: Array.from(fornsSemMercadoMap.values()),
      bloqueia: itensSemPrincipal.length > 0 || fornsSemMercadoMap.size > 0,
    };
  }, [itensMaterial, fornecedoresSelecionados, cotacoes, historicoPorItem]);


  const resumoCotacoes = useMemo(() => {
    let semCot = 0;
    let porteDiv = 0;
    let completos = 0;
    itensMaterial.forEach((it, idx) => {
      const sel = fornecedoresSelecionados[idx] || [];
      const linhas = cotacoes[idx] || {};
      const preenchidos = sel.filter(
        (fid) => linhas[fid] && Number(linhas[fid].valor_unitario) > 0,
      );
      if (preenchidos.length === 0) semCot++;
      const algumDivergente = sel.some(
        (fid) =>
          linhas[fid]?.porte_ofertado &&
          it.porte &&
          linhas[fid].porte_ofertado.trim().toLowerCase() !==
            it.porte.trim().toLowerCase(),
      );
      if (algumDivergente) porteDiv++;
      const temPrincipal = sel.some((fid) => linhas[fid]?.status_selecao === "principal");
      if (preenchidos.length > 0 && temPrincipal) completos++;
    });
    return { semCot, porteDiv, completos };
  }, [itensMaterial, fornecedoresSelecionados, cotacoes]);

  // Sub-PR 2B/2C — fornecedores envolvidos no orçamento (para sub-aba Atualizar Cotações + IA)
  const fornecedoresEnvolvidos = useMemo<FornecedorAtualizacaoItem[]>(() => {
    const map = new Map<string, FornecedorAtualizacaoItem>();
    itensMaterial.forEach((it, idx) => {
      const info = itemDbInfoByIdx[idx];
      const sel = fornecedoresSelecionados[idx] || [];
      const fornsBruto = fornecedoresDoItem(it) as any[];
      sel.forEach((fid) => {
        const row = fornsBruto.find((r: any) => r.fornecedor_id === fid);
        const f = row?.fornecedores;
        if (!f) return;
        if (!map.has(fid)) {
          map.set(fid, {
            fornecedorId: fid,
            fornecedorNome: f.nome || "Fornecedor",
            mercado: f.mercado || null,
            telefone: f.telefone || null,
            whatsapp: f.whatsapp || null,
            itens: [],
          });
        }
        if (info) {
          const linha = (cotacoes[idx] || {})[fid];
          map.get(fid)!.itens.push({
            item_id: info.item_id,
            item_tipo: info.item_tipo,
            nome_popular: it.nome_popular,
            nome_cientifico: it.nome_cientifico || null,
            porte: linha?.porte_ofertado || it.porte || row.porte || null,
            unidade: it.unidade || row.unidade || null,
            quantidade: it.quantidade || null,
            preco_atual: linha?.valor_unitario != null ? Number(linha.valor_unitario)
              : (row.preco != null ? Number(row.preco) : null),
            ultima_cotacao: row.data_orcamento || null,
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.fornecedorNome.localeCompare(b.fornecedorNome, "pt-BR"),
    );
  }, [itensMaterial, fornecedoresSelecionados, cotacoes, historicoPorItem, itemDbInfoByIdx]);

  // Itens em formato IAChatItemContexto para o painel IA, por fornecedor
  const iaContextoPorFornecedor = useMemo(() => {
    const map = new Map<string, IAChatItemContexto[]>();
    fornecedoresEnvolvidos.forEach((f) => {
      // agrupa portes disponíveis por item_id (todos do histórico, mesmo de outros fornecedores)
      const itens: IAChatItemContexto[] = f.itens
        .filter((i) => i.item_id && i.item_tipo !== "condicionador_solo")
        .map((i) => {
          const memorialIdx = itensMaterial.findIndex((m) => m.nome_popular === i.nome_popular);
          const todosForns = memorialIdx >= 0 ? (fornecedoresDoItem(itensMaterial[memorialIdx]) as any[]) : [];
          const portes = new Set<string>();
          todosForns.forEach((row) => {
            if (row.porte) portes.add(String(row.porte));
            (row.outros_portes || []).forEach((o: any) => o?.porte && portes.add(String(o.porte)));
          });
          return {
            item_id: i.item_id!,
            item_tipo: i.item_tipo as "planta" | "insumo",
            nome_popular: i.nome_popular,
            nome_cientifico: i.nome_cientifico || null,
            porte: i.porte || null,
            preco_atual: i.preco_atual ?? null,
            unidade: i.unidade || null,
            ultima_cotacao: i.ultima_cotacao || null,
            portes_disponiveis: Array.from(portes).sort(),
          };
        });
      map.set(f.fornecedorId, itens);
    });
    return map;
  }, [fornecedoresEnvolvidos, itensMaterial, historicoPorItem]);

  const nomeFornecedor = (item: ItemMemorial, fornId: string) => {
    const row = fornecedoresDoItem(item).find((r: any) => r.fornecedor_id === fornId);
    return row?.fornecedores?.nome || "Fornecedor";
  };

  const toggleFornecedor = (itemIdx: number, fornId: string) => {
    setFornecedoresSelecionados((prev) => {
      const atuais = prev[itemIdx] || [];
      const novo = atuais.includes(fornId)
        ? atuais.filter((id) => id !== fornId)
        : [...atuais, fornId];
      return { ...prev, [itemIdx]: novo };
    });
  };

  // ===== Helpers Etapa 3 (refactor) =====
  const porteToNum = (s: string | null | undefined): number => {
    if (!s) return NaN;
    const m = String(s).replace(",", ".").match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : NaN;
  };
  const compararPorte = (
    porteForn: string | null | undefined,
    porteSolicitado: string | null | undefined,
  ): "exato" | "maior" | "menor" | "indef" => {
    if (!porteSolicitado) return "exato";
    if (!porteForn) return "indef";
    const a = porteToNum(porteForn);
    const b = porteToNum(porteSolicitado);
    if (isNaN(a) || isNaN(b)) {
      return porteForn.trim().toLowerCase() === porteSolicitado.trim().toLowerCase() ? "exato" : "indef";
    }
    if (Math.abs(a - b) < 0.001) return "exato";
    return a > b ? "maior" : "menor";
  };
  const mesesDesde = (iso: string | null | undefined): number => {
    if (!iso) return Infinity;
    const t = new Date(iso).getTime();
    if (isNaN(t)) return Infinity;
    return (Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44);
  };
  const papelAtual = (itemIdx: number, fornId: string): "principal" | "backup1" | "backup2" | null => {
    const linha = cotacoes[itemIdx]?.[fornId];
    if (!linha) return null;
    const s = linha.status_selecao;
    if (s === "principal" || s === "backup1" || s === "backup2") return s;
    return null;
  };
  const papelLabel: Record<string, string> = {
    principal: "Principal",
    backup1: "Reserva 1",
    backup2: "Reserva 2",
  };
  const proximoPapelLivre = (itemIdx: number): "principal" | "backup1" | "backup2" | null => {
    const linhas = cotacoes[itemIdx] || {};
    const ocupados = new Set(Object.values(linhas).map((l) => l.status_selecao));
    if (!ocupados.has("principal")) return "principal";
    if (!ocupados.has("backup1")) return "backup1";
    if (!ocupados.has("backup2")) return "backup2";
    return null;
  };
  const definirPapel = (
    itemIdx: number,
    fornId: string,
    papel: "principal" | "backup1" | "backup2" | "remover",
    fornecedorObj: any,
  ) => {
    // Mercado obrigatório se for adicionar/alterar para um papel ativo
    if (papel !== "remover") {
      const mercadoOk = !!(fornecedorObj?.mercado && String(fornecedorObj.mercado).trim());
      if (!mercadoOk) {
        setMercadoModal({
          open: true,
          fornecedorId: fornId,
          nome: fornecedorObj?.nome || "Fornecedor",
          valor: "",
          selecionados: [],
          draft: "",
          confirmarNovo: null,
          pendente: { itemIdx, papel },
        });
        return;
      }
    }
    if (papel === "remover") {
      setCotacoes((prev) => {
        const itemMap = { ...(prev[itemIdx] || {}) };
        if (itemMap[fornId]) itemMap[fornId] = { ...itemMap[fornId], status_selecao: "descartado" };
        return { ...prev, [itemIdx]: itemMap };
      });
      setFornecedoresSelecionados((prev) => ({
        ...prev,
        [itemIdx]: (prev[itemIdx] || []).filter((id) => id !== fornId),
      }));
      return;
    }
    setCotacoes((prev) => {
      const itemMap = { ...(prev[itemIdx] || {}) };
      // Demove quem ocupa o mesmo papel
      Object.keys(itemMap).forEach((k) => {
        if (k !== fornId && itemMap[k].status_selecao === papel) {
          itemMap[k] = { ...itemMap[k], status_selecao: "descartado" };
        }
      });
      const atual = itemMap[fornId] || {
        valor_unitario: "",
        porte_ofertado: "",
        disponivel: "sim" as const,
        status_selecao: "descartado" as const,
        obs: "",
      };
      itemMap[fornId] = { ...atual, status_selecao: papel };
      return { ...prev, [itemIdx]: itemMap };
    });
    setFornecedoresSelecionados((prev) => {
      const atuais = prev[itemIdx] || [];
      // Remove qualquer outro forn que perdeu o mesmo papel (limpamos apenas se ele não tem mais nenhum papel)
      const limpos = atuais.filter((id) => {
        if (id === fornId) return true;
        const linha = cotacoes[itemIdx]?.[id];
        return linha && linha.status_selecao !== papel;
      });
      return {
        ...prev,
        [itemIdx]: limpos.includes(fornId) ? limpos : [...limpos, fornId],
      };
    });
  };

  const confirmarMercadoModal = async (override?: string[]) => {
    const lista = (override ?? mercadoModal.selecionados).map((s) => s.trim()).filter(Boolean);
    if (!mercadoModal.fornecedorId || lista.length === 0 || !mercadoModal.pendente) {
      toast({ title: "Selecione ao menos um mercado", variant: "destructive" });
      return;
    }
    const finalStr = Array.from(new Set(lista.map((s) => s.toLowerCase())))
      .map((low) => lista.find((x) => x.toLowerCase() === low)!)
      .join(", ");
    try {
      const { error } = await (supabase as any)
        .from("fornecedores")
        .update({ mercado: finalStr })
        .eq("id", mercadoModal.fornecedorId);
      if (error) throw error;
      // Atualiza queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-todos"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-ativos-lista"] });
      queryClient.invalidateQueries({ queryKey: ["historico-precos-orcamento"] });
      const { itemIdx, papel } = mercadoModal.pendente;
      const fornId = mercadoModal.fornecedorId;
      // Aplica o papel agora que mercado está ok
      setCotacoes((prev) => {
        const itemMap = { ...(prev[itemIdx] || {}) };
        Object.keys(itemMap).forEach((k) => {
          if (k !== fornId && itemMap[k].status_selecao === papel) {
            itemMap[k] = { ...itemMap[k], status_selecao: "descartado" };
          }
        });
        const atual = itemMap[fornId] || {
          valor_unitario: "",
          porte_ofertado: "",
          disponivel: "sim" as const,
          status_selecao: "descartado" as const,
          obs: "",
        };
        itemMap[fornId] = { ...atual, status_selecao: papel };
        return { ...prev, [itemIdx]: itemMap };
      });
      setFornecedoresSelecionados((prev) => {
        const atuais = prev[itemIdx] || [];
        return { ...prev, [itemIdx]: atuais.includes(fornId) ? atuais : [...atuais, fornId] };
      });
      setMercadoModal({ open: false, fornecedorId: null, nome: "", valor: "", selecionados: [], draft: "", confirmarNovo: null, pendente: null });
      toast({ title: "Mercado cadastrado e fornecedor adicionado" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar mercado", description: e?.message, variant: "destructive" });
    }
  };

  const abrirNovoFornecedor = (itemIdx: number) => {
    setNovoFornItemIdx(itemIdx);
    const itemJaNoCatalogo = !!itemDbInfoByIdx[itemIdx];
    setNovoForn({ nome: "", contato: "", cidade: "", cadastrarItem: !itemJaNoCatalogo });
    setNovoFornModalOpen(true);
  };

  const salvarNovoFornecedor = async () => {
    if (!novoForn.nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from("fornecedores")
        .insert({
          nome: novoForn.nome.trim(),
          telefone: novoForn.contato || null,
          cidade: novoForn.cidade || null,
          status: "ativo",
          categoria_fornecedor: "Fornecedor Diverso",
        })
        .select("id")
        .single();
      if (error) throw error;

      const item = novoFornItemIdx !== null ? itensMaterial[novoFornItemIdx] : null;

      // Cadastrar a planta no catálogo, se solicitado e ainda não existir
      let plantaCriadaId: string | null = null;
      if (item && novoForn.cadastrarItem && !itemDbInfoByIdx[novoFornItemIdx!]) {
        try {
          const { data: pData, error: pErr } = await (supabase as any)
            .from("plantas")
            .insert({
              nome_popular: item.nome_popular.trim(),
              nome_cientifico: item.nome_cientifico || null,
              unidade: item.unidade || null,
              fornecedor_id: data.id,
              ativo: true,
            })
            .select("id")
            .single();
          if (pErr) throw pErr;
          plantaCriadaId = pData.id;
        } catch (pe: any) {
          console.warn("[novoForn] falha ao cadastrar planta", pe);
          toast({
            title: "Fornecedor cadastrado, mas planta não foi criada",
            description: pe?.message,
            variant: "destructive",
          });
        }
      }

      // Inserir entrada placeholder no estado local para aparecer na lista
      if (item) {
        const key = item.nome_popular.trim().toLowerCase();
        const map = { ...(historicoPorItem as Record<string, any[]>) };
        map[key] = [
          ...(map[key] || []),
          {
            fornecedor_id: data.id,
            item_id: plantaCriadaId || itemDbInfoByIdx[novoFornItemIdx!]?.item_id,
            item_tipo: plantaCriadaId ? "planta" : itemDbInfoByIdx[novoFornItemIdx!]?.item_tipo,
            preco: null,
            data_orcamento: null,
            fornecedores: { id: data.id, nome: novoForn.nome.trim(), mercado: null, cidade: novoForn.cidade || null },
          },
        ];
        queryClient.setQueryData(["historico-fornecedores-orc", nomesItens], map);
        // Marcar como selecionado
        setFornecedoresSelecionados((prev) => ({
          ...prev,
          [novoFornItemIdx!]: [...(prev[novoFornItemIdx!] || []), data.id],
        }));
      }
      toast({
        title: plantaCriadaId ? "Fornecedor e planta cadastrados" : "Fornecedor cadastrado",
      });
      setNovoFornModalOpen(false);
      refetchHistorico();
    } catch (e: any) {
      toast({ title: "Erro ao cadastrar", description: e?.message, variant: "destructive" });
    }
  };

  // ===== QuickAdd: cadastro rápido inline para correlações =====
  type QuickKind = "cliente" | "fornecedor_insumo" | "cargo" | "transportadora" | "perfil_markup" | "local_cliente";
  const [quickAdd, setQuickAdd] = useState<{
    open: boolean;
    kind: QuickKind | null;
    fields: Record<string, string>;
    onCreated?: (id: string, label: string) => void;
  }>({ open: false, kind: null, fields: {} });
  const [quickSaving, setQuickSaving] = useState(false);

  const openQuickAdd = (kind: QuickKind, onCreated?: (id: string, label: string) => void) => {
    setQuickAdd({ open: true, kind, fields: {}, onCreated });
  };
  const updateQuickField = (k: string, v: string) =>
    setQuickAdd((s) => ({ ...s, fields: { ...s.fields, [k]: v } }));

  const QUICK_TITLES: Record<QuickKind, string> = {
    cliente: "Novo cliente",
    fornecedor_insumo: "Novo fornecedor",
    cargo: "Novo cargo",
    transportadora: "Nova transportadora",
    perfil_markup: "Novo perfil de markup",
    local_cliente: "Novo local do cliente",
  };

  const salvarQuickAdd = async () => {
    if (!quickAdd.kind) return;
    const f = quickAdd.fields;
    if (!String(f.nome || "").trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setQuickSaving(true);
    try {
      let inserted: { id: string; label: string } | null = null;
      if (quickAdd.kind === "cliente") {
        const { data, error } = await (supabase as any)
          .from("clientes")
          .insert({ nome: f.nome.trim(), status: "ativo" })
          .select("id, nome")
          .single();
        if (error) throw error;
        inserted = { id: data.id, label: data.nome };
        queryClient.invalidateQueries({ queryKey: ["clientes-list-ativos"] });
      } else if (quickAdd.kind === "fornecedor_insumo") {
        const { data, error } = await (supabase as any)
          .from("fornecedores")
          .insert({
            nome: f.nome.trim(),
            telefone: f.contato || null,
            cidade: f.cidade ? capitalizeWords(f.cidade) : null,
            status: "ativo",
            categoria_fornecedor: "Fornecedor Diverso",
          })
          .select("id, nome")
          .single();
        if (error) throw error;
        inserted = { id: data.id, label: data.nome };
        queryClient.invalidateQueries({ queryKey: ["fornecedores-ativos-lista"] });
      } else if (quickAdd.kind === "transportadora") {
        const { data, error } = await (supabase as any)
          .from("fornecedores")
          .insert({
            nome: f.nome.trim(),
            telefone: f.contato || null,
            cidade: f.cidade ? capitalizeWords(f.cidade) : null,
            status: "ativo",
            categoria_fornecedor: "Transportadora",
          })
          .select("id, nome")
          .single();
        if (error) throw error;
        inserted = { id: data.id, label: data.nome };
        queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
      } else if (quickAdd.kind === "cargo") {
        const sal = Number(f.salario_mensal) || 0;
        if (!sal) {
          toast({ title: "Salário mensal obrigatório", variant: "destructive" });
          setQuickSaving(false);
          return;
        }
        const { data, error } = await (supabase as any)
          .from("cargos_mo")
          .insert({ nome: f.nome.trim(), salario_mensal: sal, ativo: true })
          .select("id, nome")
          .single();
        if (error) throw error;
        inserted = { id: data.id, label: data.nome };
        queryClient.invalidateQueries({ queryKey: ["cargos-mo-ativos"] });
      } else if (quickAdd.kind === "perfil_markup") {
        const { data, error } = await (supabase as any)
          .from("perfis_markup")
          .insert({ nome: f.nome.trim(), descricao: f.descricao || null, ativo: true })
          .select("id, nome")
          .single();
        if (error) throw error;
        inserted = { id: data.id, label: data.nome };
        queryClient.invalidateQueries({ queryKey: ["perfis-markup-ativos"] });
      } else if (quickAdd.kind === "local_cliente") {
        if (!form.cliente_id) {
          toast({ title: "Selecione um cliente primeiro", variant: "destructive" });
          setQuickSaving(false);
          return;
        }
        const tipo = (f.tipo_pessoa === "juridica" ? "juridica" : "fisica");
        const { data, error } = await (supabase as any)
          .from("locais_cliente")
          .insert({
            cliente_id: form.cliente_id,
            nome: f.nome.trim(),
            tipo_pessoa: tipo,
            endereco_completo: composeEndereco({
              rua: f.rua, numero: f.numero, bairro: f.bairro,
              cidade: f.cidade, estado: f.estado, cep: f.cep,
            }) || f.endereco_completo || null,
            cep: f.cep || null,
            rua: f.rua || null,
            numero: f.numero || null,
            bairro: f.bairro || null,
            cidade: f.cidade ? capitalizeWords(f.cidade) : null,
            estado: f.estado ? f.estado.toUpperCase().slice(0, 2) : null,
            tipo_cliente: f.tipo_cliente || null,
          })
          .select("id, nome")
          .single();
        if (error) throw error;
        inserted = { id: data.id, label: data.nome };
        queryClient.invalidateQueries({ queryKey: ["orc-locais-cliente", form.cliente_id] });
        queryClient.invalidateQueries({ queryKey: ["locais", form.cliente_id] });
      }
      if (inserted) {
        toast({ title: "Cadastrado com sucesso" });
        quickAdd.onCreated?.(inserted.id, inserted.label);
        setQuickAdd({ open: false, kind: null, fields: {} });
      }
    } catch (e: any) {
      toast({
        title: "Erro ao cadastrar",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setQuickSaving(false);
    }
  };

  const REQUIRED_LABELS: Record<string, string> = {
    tipo_proposta_id: "Tipo de Proposta",
    cliente_id: "Cliente",
    local_id: "Local do cliente",
    tipo_cliente: "Tipo de cliente",
    cidade: "Cidade",
    estado: "Estado",
    area_m2: "Área total (m²)",
  };

  const camposFaltando = useMemo(
    () =>
      REQUIRED_FIELDS.filter(
        (k) => String((form as any)[k] ?? "").trim() === "",
      ).map((k) => REQUIRED_LABELS[k] || k),
    [form],
  );

  // Navegação livre — usuário pode pular entre etapas a qualquer momento.
  // Avisos amarelos sinalizam pendências (campos faltando, memorial vazio etc.)
  // mas não bloqueiam a navegação, pois nem todo tipo de proposta usa todas as etapas.
  const podeAvancar = etapaAtual < ETAPAS.length;

  const irParaEtapa = (destino: number) => {
    if (destino === etapaAtual) return;
    // Se estamos saindo da etapa 1 e os campos básicos estão ok, salva rascunho em background
    // (não bloqueia a navegação para o clique parecer instantâneo).
    if (etapaAtual === 1 && camposObrigatoriosOk) {
      saveMutation.mutate();
    }
    setEtapaAtual(Math.max(1, Math.min(ETAPAS.length, destino)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data: validacaoEtapa4 } = useEtapa4Validacao(id);

  // assim que o usuário preenche tudo, paramos de destacar erros
  useEffect(() => {
    if (mostrarErrosEtapa1 && camposObrigatoriosOk) setMostrarErrosEtapa1(false);
  }, [mostrarErrosEtapa1, camposObrigatoriosOk]);

  const handleProxima = () => {
    // Validação inline ao sair da Etapa 1: destaca cada campo obrigatório que estiver vazio
    if (etapaAtual === 1 && !camposObrigatoriosOk) {
      setMostrarErrosEtapa1(true);
      toast({
        title: "Preencha os campos destacados",
        description: `Faltam: ${camposFaltando.join(", ")}.`,
        variant: "destructive",
      });
      // foca no primeiro campo com erro
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-campo-erro="true"]') as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    // Validação ao sair da Etapa 3 (Fornecedores) para Etapa 4 (Markup)
    if (etapaAtual === 3 && pendenciasEtapa3.bloqueia) {
      setValidacaoEtapa4Open(true);
      return;
    }
    // Validação ao sair da Etapa 4 (Markup) para Etapa 5 (MO/Fretes/Transporte)
    if (etapaAtual === 4 && validacaoEtapa4 && !validacaoEtapa4.ok) {
      toast({
        title: "Não é possível avançar",
        description: validacaoEtapa4.motivo,
        variant: "destructive",
      });
      return;
    }
    irParaEtapa(etapaAtual + 1);
  };

  // helpers de erro por campo (Etapa 1)
  const errCampo = (k: string) =>
    mostrarErrosEtapa1 && String((form as any)[k] ?? "").trim() === "";
  const ringErr = (k: string) =>
    errCampo(k) ? "ring-2 ring-destructive/60 border-destructive" : "";

  const copiarCodigo = async () => {
    if (!form.codigo) return;
    try {
      await navigator.clipboard.writeText(form.codigo);
      toast({ title: "Código copiado" });
    } catch {}
  };

  const handlePdfSelect = (file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const t = (file.type || "").toLowerCase();
    const ok =
      t === "application/pdf" || name.endsWith(".pdf") ||
      t.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(name) ||
      name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv") ||
      t.includes("spreadsheet") || t.includes("excel") || t === "text/csv";
    if (!ok) {
      toast({ title: "Envie PDF, imagem (JPG/PNG) ou planilha (XLS/XLSX/CSV)", variant: "destructive" });
      return;
    }
    setPdfFile(file);
    setPdfCarregado(false);
    setItensMaterial([]);
  };

  const normalizarItensIA = (raw: unknown): ItemMemorial[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((it: any) => {
        if (!it || typeof it !== "object") return null;
        const nome = String(it?.nome_popular ?? "").trim();
        const qtd = Number(it?.quantidade ?? 0);
        const cat = String(it?.categoria ?? "");
        return {
          nome_popular: nome,
          nome_cientifico: it?.nome_cientifico ? String(it.nome_cientifico).trim() : null,
          porte: String(it?.porte ?? "").trim(),
          quantidade: Number.isFinite(qtd) ? qtd : 0,
          unidade: String(it?.unidade ?? "UNID").toUpperCase().trim() || "UNID",
          categoria: CATEGORIAS_ITEM.includes(cat) ? cat : CATEGORIAS_ITEM[0],
          confianca: (["alta", "media", "baixa"].includes(String(it?.confianca))
            ? it.confianca
            : "media") as ItemMemorial["confianca"],
        } as ItemMemorial;
      })
      .filter((it): it is ItemMemorial => !!it && it.nome_popular.length > 0);
  };

  const rodarExtracao = async (fn: () => Promise<{ data: any; error: any }>, tipoLabel: string) => {
    setProcessandoPdf(true);
    setExtracaoErro(null);
    setExtracaoElapsed(0);
    const t0 = Date.now();
    const timer = setInterval(() => {
      setExtracaoElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);
    try {
      const { data, error } = await fn();
      if (error) throw new Error(error.message || `Falha na leitura do ${tipoLabel}`);
      const itens = normalizarItensIA((data as any)?.itens);
      if (itens.length === 0) {
        setExtracaoErro(
          `A IA não conseguiu identificar itens neste ${tipoLabel}. Verifique se o conteúdo está legível e tente de novo, ou cole o texto manualmente.`,
        );
        return;
      }
      firstAutoSaveRef.current = false;
      setItensMaterial(itens);
      setPdfCarregado(true);
      setFiltroBaixaConfianca(false);
      toast({ title: `${itens.length} itens extraídos` });
    } catch (e: any) {
      const msg = e?.message || `Erro inesperado ao processar o ${tipoLabel}`;
      setExtracaoErro(msg);
      toast({ title: "Falha na extração", description: msg, variant: "destructive" });
    } finally {
      clearInterval(timer);
      setProcessandoPdf(false);
    }
  };

  const extrairItens = () =>
    pdfFile
      ? rodarExtracao(() => {
          const fd = new FormData();
          fd.append("arquivo", pdfFile);
          return (supabase.functions as any).invoke("ler-memorial-pdf", { body: fd });
        }, "arquivo")
      : Promise.resolve();

  const extrairItensTexto = () => {
    if (!memorialTexto.trim()) {
      toast({ title: "Cole o texto do memorial primeiro", variant: "destructive" });
      return Promise.resolve();
    }
    return rodarExtracao(
      () =>
        (supabase.functions as any).invoke("ler-memorial-texto", {
          body: { texto: memorialTexto },
        }),
      "texto",
    );
  };


  const updateItem = (idx: number, patch: Partial<ItemMemorial>) => {
    setItensMaterial((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItensMaterial((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItensMaterial((prev) => [
      ...prev,
      {
        nome_popular: "",
        nome_cientifico: null,
        porte: "",
        quantidade: 0,
        unidade: "UNID",
        categoria: CATEGORIAS_ITEM[0],
        confianca: "alta",
      },
    ]);
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>(
        "[data-memorial-row] input[data-field='nome_popular']",
      );
      inputs[inputs.length - 1]?.focus();
    }, 50);
  };

  const Req = () => <span className="text-destructive ml-0.5">*</span>;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="w-full px-2 py-4 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="font-display text-2xl text-foreground">
                  {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Etapa {etapaAtual} de {ETAPAS.length}
                  {form.codigo && (
                    <>
                      {" · "}
                      <span className="font-mono">{form.codigo}</span>
                      {(form as any).versao_sufixo || (orcamento as any)?.versao_sufixo ? (
                        <span className="font-mono text-primary">
                          {(form as any).versao_sufixo || (orcamento as any)?.versao_sufixo}
                        </span>
                      ) : null}
                    </>
                  )}
                </p>
              </div>
            </div>
            {isEdit && id && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setVersoesOpen(true)}>
                  <History className="w-4 h-4" />
                  Histórico
                </Button>
                <Button variant="outline" size="sm" onClick={() => setNovaVersaoOpen(true)}>
                  <GitBranch className="w-4 h-4" />
                  Nova versão
                </Button>
              </div>
            )}
          </div>

          {/* Barra de etapas (navegação livre) */}
          <Card className="p-4 sticky top-0 z-20 bg-card border-border/50">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {ETAPAS.map((nome, idx) => {
                const numero = idx + 1;
                const ativa = numero === etapaAtual;
                const concluida = numero < etapaAtual;
                return (
                  <div key={nome} className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => irParaEtapa(numero)}
                      className="flex items-center gap-2 group"
                      title={`Ir para ${nome}`}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                          ativa && "bg-primary text-primary-foreground border-primary",
                          concluida && "bg-primary/20 text-primary border-primary/40",
                          !ativa && !concluida && "bg-muted text-muted-foreground border-border",
                          "group-hover:border-primary"
                        )}
                      >
                        {concluida ? <Check className="w-4 h-4" /> : numero}
                      </div>
                      <span
                        className={cn(
                          "text-xs whitespace-nowrap",
                          ativa ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {nome}
                      </span>
                    </button>
                    {idx < ETAPAS.length - 1 && <div className="w-6 h-px bg-border" />}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Etapa 1 - Informações Iniciais */}
          {etapaAtual === 1 && (
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="font-display text-xl text-foreground">Informações Iniciais</h2>
                <p className="text-sm text-muted-foreground">Dados básicos do orçamento</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COLUNA ESQUERDA */}
                <div className="space-y-4">
                  {/* Tipo de Proposta */}
                  <div className="space-y-2">
                    <Label className={errCampo("tipo_proposta_id") ? "text-destructive" : ""}>
                      Tipo de Proposta<Req />
                    </Label>
                    <Select value={form.tipo_proposta_id} onValueChange={handleTipoPropostaChange}>
                      <SelectTrigger
                        data-campo-erro={errCampo("tipo_proposta_id") ? "true" : undefined}
                        className={ringErr("tipo_proposta_id")}
                      >
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(tipos as TipoProposta[]).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.sigla} — {t.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errCampo("tipo_proposta_id") && (
                      <p className="text-xs text-destructive">Escolha o tipo de proposta.</p>
                    )}
                  </div>

                  {/* Código gerado */}
                  <div className="space-y-2">
                    <Label>Código gerado</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.codigo}
                        onChange={(e) => setForm((c) => ({ ...c, codigo: e.target.value }))}
                        placeholder="Será gerado ao escolher o tipo (editável)"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={copiarCodigo} disabled={!form.codigo}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label className={errCampo("cliente_id") ? "text-destructive" : ""}>
                      Cliente<Req />
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={form.cliente_id}
                        onValueChange={(v) => setForm((c) => ({ ...c, cliente_id: v }))}
                      >
                        <SelectTrigger
                          data-campo-erro={errCampo("cliente_id") ? "true" : undefined}
                          className={ringErr("cliente_id")}
                        >
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(clientes as any[]).map((cl) => (
                            <SelectItem key={cl.id} value={cl.id}>{cl.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Cadastrar novo cliente"
                        onClick={() =>
                          openQuickAdd("cliente", (id) =>
                            setForm((c) => ({ ...c, cliente_id: id })),
                          )
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {errCampo("cliente_id") && (
                      <p className="text-xs text-destructive">Selecione um cliente.</p>
                    )}
                  </div>

                  {/* Local do cliente */}
                  <div className="space-y-2">
                    <Label className={errCampo("local_id") ? "text-destructive" : ""}>
                      Local do cliente<Req />
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={form.local_id}
                        onValueChange={(v) => setForm((c) => ({ ...c, local_id: v }))}
                        disabled={!form.cliente_id}
                      >
                        <SelectTrigger
                          data-campo-erro={errCampo("local_id") ? "true" : undefined}
                          className={ringErr("local_id")}
                        >
                          <SelectValue placeholder={form.cliente_id ? "Selecione o local..." : "Escolha um cliente primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(locaisCliente as any[]).length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              Nenhum local cadastrado para este cliente.
                            </div>
                          ) : (
                            (locaisCliente as any[]).map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Cadastrar novo local para este cliente"
                        disabled={!form.cliente_id}
                        onClick={() =>
                          openQuickAdd("local_cliente", (id) =>
                            setForm((c) => ({ ...c, local_id: id })),
                          )
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {errCampo("local_id") && (
                      <p className="text-xs text-destructive">Selecione o local do cliente.</p>
                    )}
                    {(form.local_endereco || form.cidade || form.estado || form.tipo_cliente) ? (
                      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs space-y-0.5">
                        {form.local_endereco && (
                          <div className="text-foreground">{form.local_endereco}</div>
                        )}
                        <div className="text-muted-foreground flex flex-wrap gap-x-2">
                          {(form.cidade || form.estado) && (
                            <span>{[form.cidade, form.estado].filter(Boolean).join(" / ")}</span>
                          )}
                          {form.tipo_cliente && (
                            <>
                              {(form.cidade || form.estado) && <span>·</span>}
                              <span>{TIPOS_CLIENTE.find((tc) => tc.value === form.tipo_cliente)?.label || form.tipo_cliente}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Selecione o local para puxar endereço, cidade, estado e tipo de cliente.
                      </p>
                    )}
                    {form.local_id && (errCampo("cidade") || errCampo("estado") || errCampo("tipo_cliente")) && (
                      <p className="text-xs text-destructive">
                        O local selecionado está sem {[
                          errCampo("cidade") && "cidade",
                          errCampo("estado") && "estado",
                          errCampo("tipo_cliente") && "tipo de cliente",
                        ].filter(Boolean).join(", ")}. Edite o cadastro do local para completar.
                      </p>
                    )}
                  </div>

                  {/* Área + Perfil de markup (lado a lado) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className={errCampo("area_m2") ? "text-destructive" : ""}>
                        Área total (m²)<Req />
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.area_m2}
                        onChange={(e) => setForm((c) => ({ ...c, area_m2: e.target.value }))}
                        data-campo-erro={errCampo("area_m2") ? "true" : undefined}
                        className={ringErr("area_m2")}
                      />
                      {errCampo("area_m2") && (
                        <p className="text-xs text-destructive">Informe a área em m².</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Perfil de markup{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          (opcional)
                        </span>
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={form.perfil_markup_id}
                          onValueChange={(v) => setForm((c) => ({ ...c, perfil_markup_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                (perfisMarkup as any[]).length === 0
                                  ? "Nenhum perfil cadastrado"
                                  : "Selecione..."
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {(perfisMarkup as any[]).map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Cadastrar novo perfil de markup"
                          onClick={() =>
                            openQuickAdd("perfil_markup", (id) =>
                              setForm((c) => ({ ...c, perfil_markup_id: id })),
                            )
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA */}
                <div className="space-y-4">
                  {/* Prazo + Data envio (lado a lado) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Prazo de validade (dias)</Label>
                      <Input
                        type="number"
                        value={form.prazo_validade_dias}
                        onChange={(e) =>
                          setForm((c) => ({ ...c, prazo_validade_dias: e.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Conta a partir da data de envio
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Data de envio ao cliente</Label>
                      <Input
                        type="date"
                        value={form.data_envio}
                        onChange={(e) => setForm((c) => ({ ...c, data_envio: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Responsável */}
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={form.responsavel_id}
                      onValueChange={(v) => setForm((c) => ({ ...c, responsavel_id: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(colaboradores as any[]).map((co) => (
                          <SelectItem key={co.id} value={co.id}>{co.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Obs interna */}
                  <div className="space-y-2">
                    <Label>Observação interna <span className="text-xs text-muted-foreground font-normal">(não aparece na proposta)</span></Label>
                    <Textarea
                      rows={4}
                      value={form.obs_interna}
                      onChange={(e) => setForm((c) => ({ ...c, obs_interna: e.target.value }))}
                    />
                  </div>

                  {/* Obs proposta */}
                  <div className="space-y-2">
                    <Label>Observação para o cliente <span className="text-xs text-muted-foreground font-normal">(aparece na proposta)</span></Label>
                    <Textarea
                      rows={4}
                      value={form.obs_proposta}
                      onChange={(e) => setForm((c) => ({ ...c, obs_proposta: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Etapa 2 — Memorial Descritivo */}
          {etapaAtual === 2 && (
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="font-display text-xl text-foreground">Memorial Descritivo</h2>
                <p className="text-sm text-muted-foreground">
                  Envie o PDF, cole o texto do memorial, ou pule esta etapa se a proposta não tiver memorial (ex.: desenvolvimento de projeto).
                </p>
              </div>

              {/* Alternador PDF / Texto */}
              <div className="inline-flex rounded-md border border-border p-1 bg-muted/30 w-fit">
                <button
                  type="button"
                  onClick={() => setMemorialModo("pdf")}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded transition-colors",
                    memorialModo === "pdf" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Upload de arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setMemorialModo("texto")}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded transition-colors",
                    memorialModo === "texto" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Colar texto
                </button>
              </div>

              {/* Upload */}
              {memorialModo === "pdf" && (
              <div>
                <label
                  htmlFor="memorial-pdf-input"
                  className={cn(
                    "block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    pdfFile
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handlePdfSelect(f);
                  }}
                >
                  {!pdfFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-10 h-10 text-muted-foreground" />
                      <p className="text-foreground font-medium">
                        Arraste o memorial aqui (PDF, imagem ou planilha)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ou clique para selecionar — aceita PDF, JPG/PNG, XLS, XLSX ou CSV
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                      <FileText className="w-5 h-5 text-foreground" />
                      <span className="font-medium text-foreground">{pdfFile.name}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setPdfFile(null);
                          setPdfCarregado(false);
                          setItensMaterial([]);
                        }}
                      >
                        Trocar arquivo
                      </Button>
                    </div>
                  )}
                  <input
                    id="memorial-pdf-input"
                    type="file"
                    accept="application/pdf,.pdf,image/*,.jpg,.jpeg,.png,.webp,.heic,.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    className="hidden"
                    onChange={(e) => handlePdfSelect(e.target.files?.[0] ?? null)}
                  />
                </label>

                {pdfFile && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="terracota"
                      onClick={extrairItens}
                      disabled={processandoPdf}
                    >
                      {processandoPdf ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Extrair itens com IA
                    </Button>
                  </div>
                )}
              </div>
              )}

              {memorialModo === "texto" && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Cole aqui o texto do memorial descritivo..."
                    value={memorialTexto}
                    onChange={(e) => setMemorialTexto(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <div className="flex justify-center">
                    <Button
                      variant="terracota"
                      onClick={extrairItensTexto}
                      disabled={processandoPdf || !memorialTexto.trim()}
                    >
                      {processandoPdf ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Interpretar texto com IA
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading com progresso */}
              {processandoPdf && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 border rounded-lg bg-muted/30">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-foreground font-medium">Mafe está lendo o memorial...</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {extracaoElapsed}s decorridos {extracaoElapsed > 20 && "(quase lá, memoriais grandes demoram mais)"}
                  </p>
                </div>
              )}

              {/* Erro persistente com retry */}
              {!processandoPdf && extracaoErro && (
                <div className="flex items-start gap-3 p-4 border border-destructive/40 bg-destructive/5 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-foreground">Não foi possível extrair os itens</p>
                    <p className="text-sm text-muted-foreground">{extracaoErro}</p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="terracota"
                        size="sm"
                        onClick={() => (memorialModo === "pdf" ? extrairItens() : extrairItensTexto())}
                        disabled={memorialModo === "pdf" ? !pdfFile : !memorialTexto.trim()}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Tentar de novo
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setExtracaoErro(null)}>
                        Fechar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabela */}
              {pdfCarregado && itensMaterial.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {itensBaixaConfianca > 0 ? (
                      <>
                        <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-yellow-500 text-white font-semibold">
                          {itensBaixaConfianca}
                        </span>
                        <span className="text-foreground">
                          {itensBaixaConfianca === 1 ? "item precisa" : "itens precisam"} de verificação — revise antes de continuar
                        </span>
                        <Button
                          variant={filtroBaixaConfianca ? "terracota" : "outline"}
                          size="sm"
                          onClick={() => setFiltroBaixaConfianca((v) => !v)}
                        >
                          <Filter className="w-3.5 h-3.5" />
                          {filtroBaixaConfianca ? "Mostrar todos" : "Ver só baixa confiança"}
                        </Button>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        Todos os {itensMaterial.length} itens com confiança alta ou média.
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {itensMaterial.length} {itensMaterial.length === 1 ? "item" : "itens"}
                      {itensMaterial.length > 80 && " · lista virtualizada"}
                    </span>
                  </div>

                  <MemorialItensTable
                    itens={
                      filtroBaixaConfianca
                        ? itensMaterial.filter((i) => i.confianca === "baixa")
                        : itensMaterial
                    }
                    categorias={CATEGORIAS_ITEM}
                    unidades={UNIDADES_ITEM}
                    onUpdate={(idx, patch) => {
                      // Quando filtrado, idx vem do array filtrado; precisamos do índice real
                      if (filtroBaixaConfianca) {
                        const baixas = itensMaterial
                          .map((it, i) => ({ it, i }))
                          .filter((x) => x.it.confianca === "baixa");
                        const realIdx = baixas[idx]?.i;
                        if (realIdx != null) updateItem(realIdx, patch);
                      } else {
                        updateItem(idx, patch);
                      }
                    }}
                    onRemove={(idx) => {
                      if (filtroBaixaConfianca) {
                        const baixas = itensMaterial
                          .map((it, i) => ({ it, i }))
                          .filter((x) => x.it.confianca === "baixa");
                        const realIdx = baixas[idx]?.i;
                        if (realIdx != null) removeItem(realIdx);
                      } else {
                        removeItem(idx);
                      }
                    }}
                  />

                  <Button variant="outline" onClick={addItem}>
                    <Plus className="w-4 h-4" />
                    Adicionar item
                  </Button>
                </div>
              )}

            </Card>
          )}

          {/* Etapa 3 — Seleção de Fornecedores (refatorada) */}
          {etapaAtual === 3 && (
            <div className="space-y-4">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border rounded-lg p-3 flex flex-wrap gap-3 items-center text-sm">
                <button
                  type="button"
                  onClick={() => setSoSemFornecedor((v) => !v)}
                  className={cn(
                    "font-medium px-2 py-0.5 rounded-md border transition-colors",
                    resumoFornecedores.semForn > 0
                      ? "text-destructive border-destructive/30 hover:bg-destructive/10"
                      : "text-muted-foreground border-transparent",
                    soSemFornecedor && "bg-destructive/15 border-destructive/40",
                  )}
                  title={
                    resumoFornecedores.semForn > 0
                      ? "Clique para ver só os itens sem fornecedor"
                      : "Nenhum item está sem fornecedor"
                  }
                  disabled={resumoFornecedores.semForn === 0}
                >
                  {resumoFornecedores.semForn} sem fornecedor
                </button>
                <span className="text-muted-foreground">|</span>
                <span className="text-amber-700 font-medium">{resumoFornecedores.risco} com risco alto</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-primary font-medium">{resumoFornecedores.ok} OK</span>

                {soSemFornecedor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSoSemFornecedor(false)}
                  >
                    <X className="w-3.5 h-3.5" /> Mostrar todos
                  </Button>
                )}

                <div className="ml-auto flex gap-2 flex-wrap">
                  {Object.keys(filtrosTab3).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiltrosTab3({})}
                      title="Remove ordenação e filtros de mercado de todos os itens"
                    >
                      <Filter className="w-4 h-4" /> Limpar filtros de todos
                    </Button>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button variant="outline" size="sm" disabled className="opacity-70 cursor-not-allowed">
                            <Store className="w-4 h-4" /> Seleção rápida por mercado
                            <Lock className="w-3 h-3 ml-1" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Disponível em breve — será liberado quando a base de fornecedores estiver completa com mercados cadastrados.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button variant="outline" size="sm" disabled className="opacity-70 cursor-not-allowed">
                            <Zap className="w-4 h-4" /> Escolha rápida
                            <Lock className="w-3 h-3 ml-1" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Disponível em breve — será liberado quando os fornecedores tiverem avaliações suficientes para uma escolha confiável.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>


              {/* Sub-PR 2B/2C — Sub-aba dentro da Etapa 3 */}
              <Tabs value={tabEtapa3} onValueChange={(v) => setTabEtapa3(v as "comparativo" | "atualizar")} className="w-full">
                <TabsList>
                  <TabsTrigger value="comparativo">Comparativo de fornecedores</TabsTrigger>
                  <TabsTrigger value="atualizar">
                    Atualizar Cotações
                    {fornecedoresEnvolvidos.length > 0 && (
                      <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5">
                        {fornecedoresEnvolvidos.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {tabEtapa3 === "atualizar" && (
                <AtualizarCotacoesPanel
                  orcamentoId={id || null}
                  fornecedoresEnvolvidos={fornecedoresEnvolvidos}
                  onIAClick={(f) => {
                    const target = f || fornecedoresEnvolvidos[0];
                    if (!target) return;
                    setIaChatTarget({
                      fornecedorId: target.fornecedorId,
                      fornecedorNome: target.fornecedorNome,
                      mercado: target.mercado,
                    });
                  }}
                />
              )}

              {tabEtapa3 === "comparativo" && (<>
              {itensMaterial.length === 0 && (
                <EmptyState
                  title="Sem itens no memorial"
                  description="Volte à Etapa 2 para adicionar plantas, insumos ou condicionadores antes de selecionar fornecedores."
                  action={
                    <Button variant="outline" size="sm" onClick={() => irParaEtapa(2)}>
                      <ArrowLeft className="w-4 h-4" /> Voltar à Etapa 2
                    </Button>
                  }
                />
              )}

              {(() => {
                const visiveisIdx = itensMaterial
                  .map((_, i) => i)
                  .filter((i) => !soSemFornecedor || (fornecedoresSelecionados[i]?.length ?? 0) === 0);

                if (itensMaterial.length > 0 && soSemFornecedor && visiveisIdx.length === 0) {
                  return (
                    <Card className="p-6 text-center text-sm text-muted-foreground">
                      Todos os itens já têm pelo menos um fornecedor selecionado.
                      <div className="mt-2">
                        <Button variant="ghost" size="sm" onClick={() => setSoSemFornecedor(false)}>
                          Mostrar todos
                        </Button>
                      </div>
                    </Card>
                  );
                }

                const renderCard = (idx: number) => {
                  const item = itensMaterial[idx];
                  if (!item) return null;
                const fornsBruto = fornecedoresDoItem(item) as any[];
                const filtros = filtrosTab3[idx] || filtroPadraoTab3;
                const mercadosUnicos = Array.from(
                  new Set(
                    fornsBruto.flatMap((r: any) =>
                      String(r.fornecedores?.mercado || "")
                        .split(/[,;|]/)
                        .map((s: string) => s.trim())
                        .filter((s: string) => !!s),
                    ),
                  ),
                ).sort((a, b) => a.localeCompare(b, "pt-BR"));
                const temSemMercado = fornsBruto.some(
                  (r: any) => !String(r.fornecedores?.mercado || "").trim(),
                );

                // Classifica por porte (exato/maior/menor) e considera outros_portes embutidos
                const expandeRowsPorPorte = (r: any): { row: any; portClass: "exato" | "maior" | "menor" | "indef"; portUsado: string | null; precoUsado: number | null; dataUsada: string | null }[] => {
                  // se item.porte vazio, tudo conta como exato
                  if (!item.porte) {
                    return [{ row: r, portClass: "exato", portUsado: r.porte, precoUsado: r.preco != null ? Number(r.preco) : null, dataUsada: r.data_orcamento }];
                  }
                  const variantes = [{ porte: r.porte, preco: r.preco, data: r.data_orcamento }, ...((r.outros_portes || []) as any[]).map((o) => ({ porte: o.porte, preco: o.preco, data: o.data_orcamento }))];
                  // Mantém apenas a melhor variante por classe (usa a de menor preço)
                  const porClasse: Record<string, any> = {};
                  variantes.forEach((v) => {
                    const c = compararPorte(v.porte, item.porte);
                    if (!porClasse[c] || (v.preco != null && porClasse[c].preco != null && Number(v.preco) < Number(porClasse[c].preco))) {
                      porClasse[c] = v;
                    } else if (!porClasse[c]) {
                      porClasse[c] = v;
                    }
                  });
                  return (Object.entries(porClasse) as [any, any][]).map(([cls, v]) => ({
                    row: r,
                    portClass: cls,
                    portUsado: v.porte,
                    precoUsado: v.preco != null ? Number(v.preco) : null,
                    dataUsada: v.data,
                  }));
                };

                const todasLinhas = fornsBruto.flatMap(expandeRowsPorPorte);
                const exatas = todasLinhas.filter((l) => l.portClass === "exato");
                const indefinidas = todasLinhas.filter((l) => l.portClass === "indef");
                const maiores = todasLinhas.filter((l) => l.portClass === "maior");
                const menores = todasLinhas.filter((l) => l.portClass === "menor");

                const cmpPor = (chave: OrdemTab3Chave, a: typeof todasLinhas[number], b: typeof todasLinhas[number]) => {
                  if (chave === "preco") return (a.precoUsado ?? Infinity) - (b.precoUsado ?? Infinity);
                  if (chave === "data") return new Date(b.dataUsada || 0).getTime() - new Date(a.dataUsada || 0).getTime();
                  if (chave === "mercado") {
                    const ma = (a.row.fornecedores?.mercado || "zzz").toLowerCase();
                    const mb = (b.row.fornecedores?.mercado || "zzz").toLowerCase();
                    return ma.localeCompare(mb);
                  }
                  if (chave === "nota") {
                    const na = Number(a.row.fornecedores?.nota_media ?? 0);
                    const nb = Number(b.row.fornecedores?.nota_media ?? 0);
                    return nb - na;
                  }
                  if (chave === "porte_asc" || chave === "porte_desc") {
                    const pa = parsePorteMetros(a.portUsado).value;
                    const pb = parsePorteMetros(b.portUsado).value;
                    const va = pa == null ? Infinity : pa;
                    const vb = pb == null ? Infinity : pb;
                    return chave === "porte_asc" ? va - vb : vb - va;
                  }
                  return 0;
                };
                const aplicaFiltros = (arr: typeof todasLinhas) => {
                  let out = arr;
                  if (filtros.mercados.length > 0) {
                    out = out.filter((l) => {
                      const ms = String(l.row.fornecedores?.mercado || "")
                        .split(/[,;|]/)
                        .map((s: string) => s.trim())
                        .filter((s: string) => !!s);
                      // Fornecedores sem mercado aparecem em todos os filtros (forçar preenchimento)
                      if (ms.length === 0) return true;
                      return ms.some((m) => filtros.mercados.includes(m));
                    });
                  }
                  if (filtros.somenteRecentes) {
                    out = out.filter((l) => {
                      const m = mesesDesde(l.dataUsada);
                      return m !== Infinity && m < 6;
                    });
                  }
                  return out;
                };
                const ordenar = (arr: typeof todasLinhas) =>
                  aplicaFiltros(arr).slice().sort((a, b) => {
                    const p = cmpPor(filtros.primaria, a, b);
                    if (p !== 0) return p;
                    if (filtros.secundaria !== "nenhuma" && filtros.secundaria !== filtros.primaria) {
                      return cmpPor(filtros.secundaria, a, b);
                    }
                    return 0;
                  });

                const exatasOrd = ordenar(exatas);
                const semExato = exatasOrd.length === 0;
                const expMaior = !!expandirMaiores[idx] || semExato;
                const expMenor = !!expandirMenores[idx] || semExato;
                const maioresOrd = expMaior ? ordenar(maiores) : [];
                const menoresOrd = expMenor ? ordenar(menores) : [];
                const indefOrd = ordenar(indefinidas);

                const exibidasCount = exatasOrd.length + maioresOrd.length + menoresOrd.length + indefOrd.length;
                const totalCount = todasLinhas.length;

                // Faixas de preço (top5, intermediário, mais caro) — calculadas só sobre o grupo "exato"
                const precosOrdenados = exatas
                  .map((l) => l.precoUsado)
                  .filter((p): p is number => p != null && !isNaN(p))
                  .sort((a, b) => a - b);
                const limiteBest = precosOrdenados[Math.min(4, precosOrdenados.length - 1)];
                const limiteIntermed = precosOrdenados[Math.max(0, Math.floor(precosOrdenados.length * 0.66) - 1)];
                const classificarPreco = (p: number | null): "best" | "mid" | "high" => {
                  if (p == null || isNaN(p)) return "mid";
                  if (limiteBest != null && p <= limiteBest) return "best";
                  if (limiteIntermed != null && p <= limiteIntermed) return "mid";
                  return "high";
                };

                // Header status badge
                const selecionadosCount = (fornecedoresSelecionados[idx] || []).length;
                let badge = { cls: "bg-primary/15 text-primary", label: "OK" };
                if (selecionadosCount === 0) badge = { cls: "bg-destructive/15 text-destructive", label: "⚠ Sem fornecedor" };
                else if (selecionadosCount === 1) badge = { cls: "bg-amber-500/15 text-amber-700", label: "Risco alto" };
                else if (selecionadosCount === 2) badge = { cls: "bg-amber-500/10 text-amber-700", label: "Atenção" };

                const renderTableRow = (l: typeof todasLinhas[number], grupo: "exato" | "maior" | "menor" | "indef") => {
                  const r = l.row;
                  const f = r.fornecedores || {};
                  const papel = papelAtual(idx, r.fornecedor_id);
                  const checked = !!papel;
                  const tier = grupo === "exato" ? classificarPreco(l.precoUsado) : "mid";
                  const precoCls =
                    tier === "best"
                      ? "text-primary font-semibold"
                      : tier === "high"
                        ? "text-destructive"
                        : "text-foreground";
                  const meses = mesesDesde(l.dataUsada);
                  const dataBadge =
                    meses === Infinity
                      ? null
                      : meses < 6
                        ? null
                        : meses < 12
                          ? { cls: "bg-amber-500/15 text-amber-700 border-amber-500/30", label: "desatualizado" }
                          : { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "+1 ano" };
                  const mercadoOk = !!(f.mercado && String(f.mercado).trim());

                  return (
                    <TableRow
                      key={`${r.fornecedor_id}-${grupo}-${l.portUsado || "x"}`}
                      className={cn(checked && "bg-primary/5")}
                    >
                      <TableCell className="p-2 w-8">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            if (!v) {
                              definirPapel(idx, r.fornecedor_id, "remover", f);
                            } else {
                              const livre = proximoPapelLivre(idx);
                              if (!livre) {
                                toast({ title: "Limite de 3 fornecedores por item (1 principal + 2 reservas)", variant: "destructive" });
                                return;
                              }
                              definirPapel(idx, r.fornecedor_id, livre, f);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{f.nome || "Fornecedor"}</span>
                          {papel && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                              papel === "principal" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-secondary",
                            )}>
                              {papel === "principal" && <Crown className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
                              {papelLabel[papel]}
                            </span>
                          )}
                          <FornecedorPopover
                            fornecedorId={r.fornecedor_id}
                            nome={f.nome}
                            itemId={r.item_id}
                            itemTipo={r.item_tipo}
                            onAvaliacaoSalva={() => refetchHistorico?.()}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <MercadoInlineEditor
                          fornecedorId={f.id}
                          fornecedorNome={f.nome}
                          valorAtual={f.mercado}
                          sugestoes={(fornecedoresLista || [])
                            .map((x: any) => x.mercado)
                            .filter((m: any) => m && String(m).trim())}
                        />
                      </TableCell>
                      {(() => {
                        const podeEditar = !!(r.item_id && r.item_tipo);
                        const portesExistentes = [
                          r.porte,
                          ...((r.outros_portes || []) as any[]).map((o: any) => o.porte),
                        ].filter(Boolean) as string[];
                        const indispKey = r.item_id ? `${r.item_id}::${r.fornecedor_id}` : "";
                        const indispRow = indispKey ? (indispMap as Map<string, any>).get(indispKey) : null;
                        const wrap = (node: React.ReactNode, label: string) =>
                          podeEditar ? (
                            <AtualizarCotacaoPopover
                              itemId={r.item_id}
                              itemTipo={r.item_tipo}
                              fornecedorId={r.fornecedor_id}
                              fornecedorNome={f.nome}
                              itemNome={item.nome_popular}
                              precoAtual={l.precoUsado}
                              porteAtual={l.portUsado || null}
                              unidadeAtual={r.unidade || null}
                              ultimaAtualizacao={l.dataUsada}
                              atualizadoPorNome={r.colaboradores?.nome}
                              portesExistentes={portesExistentes}
                              jaIndisponivel={!!indispRow}
                              onSaved={() => refetchHistorico?.()}
                            >
                              <button
                                type="button"
                                aria-label={`Atualizar ${label} de ${f.nome || "fornecedor"}`}
                                className="text-left w-full -mx-1 px-1 py-0.5 rounded hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                              >
                                {node}
                              </button>
                            </AtualizarCotacaoPopover>
                          ) : (
                            node
                          );
                        return (
                          <>
                            <TableCell className="p-2">
                              {wrap(
                                l.portUsado ? (
                                  <span className={cn(
                                    "text-xs",
                                    grupo === "maior" && "text-amber-700",
                                    grupo === "menor" && "text-amber-700",
                                    grupo === "indef" && "text-muted-foreground italic",
                                  )}>
                                    {l.portUsado}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">—</span>
                                ),
                                "porte",
                              )}
                            </TableCell>
                            <TableCell className={cn("p-2 text-sm whitespace-nowrap", precoCls)}>
                              {wrap(
                                <span>
                                  {l.precoUsado != null
                                    ? `R$ ${l.precoUsado.toFixed(2)}`
                                    : <span className="text-muted-foreground italic">—</span>}
                                </span>,
                                "preço",
                              )}
                            </TableCell>
                            <TableCell className="p-2 text-xs text-muted-foreground">
                              {wrap(
                                <span>{r.unidade || "—"}</span>,
                                "unidade",
                              )}
                            </TableCell>
                          </>
                        );
                      })()}
                      <TableCell className="p-2 whitespace-nowrap">
                        {l.dataUsada ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-foreground">
                              {new Date(l.dataUsada).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                            </span>
                            {dataBadge && (
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", dataBadge.cls)}>
                                {dataBadge.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">sem data</span>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        {r.nota_media != null ? (
                          <span className="text-[11px] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 font-medium" title={`Nota ${r.nota_media.toFixed(1)} de 5 — ${r.nota_qtd} avaliação(ões)`}>
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {r.nota_media.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/70 italic">sem avaliação</span>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        {(() => {
                          const indispKey = r.item_id ? `${r.item_id}::${r.fornecedor_id}` : "";
                          const indisp = indispKey ? (indispMap as Map<string, any>).get(indispKey) : null;
                          if (indisp) {
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-muted-foreground/30 w-fit"
                                  title={indisp.observacao || "Marcado como indisponível"}
                                >
                                  <PackageX className="w-3 h-3" />
                                  Não tinha · {new Date(indisp.data_marcacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                </span>
                                {indisp.registrado_por_nome && (
                                  <span className="text-[10px] text-muted-foreground/70">por {indisp.registrado_por_nome}</span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span className="text-[11px] text-muted-foreground">
                              {r.colaboradores?.nome || <span className="italic text-muted-foreground/60">—</span>}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex items-center gap-1">
                          {checked ? (
                            <Select
                              value={papel || ""}
                              onValueChange={(v) => definirPapel(idx, r.fornecedor_id, v as any, f)}
                            >
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="principal">Principal</SelectItem>
                                <SelectItem value="backup1">Reserva 1</SelectItem>
                                <SelectItem value="backup2">Reserva 2</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const livre = proximoPapelLivre(idx);
                                if (!livre) {
                                  toast({ title: "Limite de 3 fornecedores por item", variant: "destructive" });
                                  return;
                                }
                                definirPapel(idx, r.fornecedor_id, livre, f);
                              }}
                            >
                              Selecionar
                            </Button>
                          )}
                          {(() => {
                            const indispKey = r.item_id ? `${r.item_id}::${r.fornecedor_id}` : "";
                            const indisp = indispKey ? (indispMap as Map<string, any>).get(indispKey) : null;
                            if (indisp) {
                              return (
                                <DesfazerIndisponibilidadeButton
                                  marcacaoId={indisp.id}
                                  fornecedorNome={f.nome}
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                };

                return (
                  <Card key={idx} className="p-4 space-y-3">
                    <Collapsible
                      open={!blocosColapsados[idx]}
                      onOpenChange={(o) =>
                        setBlocosColapsados((p) => ({ ...p, [idx]: !o }))
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-start justify-between gap-3 flex-wrap text-left rounded-md hover:bg-muted/40 px-1 py-1 -mx-1"
                          aria-label={`Expandir ou recolher ${item.nome_popular || "item"}`}
                        >
                          <div className="flex items-start gap-2">
                            {blocosColapsados[idx] ? (
                              <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground" />
                            ) : (
                              <ChevronUp className="w-4 h-4 mt-0.5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-semibold text-foreground">
                                {item.nome_popular || "(sem nome)"}
                                {item.nome_cientifico && (
                                  <span className="ml-2 italic font-normal text-muted-foreground">{item.nome_cientifico}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.porte && <>Porte solicitado: <strong>{item.porte}</strong> · </>}
                                {item.quantidade} {item.unidade}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{exibidasCount} de {totalCount} fornecedores</span>
                            <span className={cn("px-2 py-1 rounded-md text-xs font-medium", badge.cls)}>{badge.label}</span>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-3">

                    {/* Ordenação e filtragem múltipla */}
                    {fornsBruto.length > 0 && (
                      <div className="flex flex-col gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Ordenar:</span>
                          </div>
                          {([
                            { v: "data", l: "Mais recentes" },
                            { v: "preco", l: "Menor preço" },
                            { v: "nota", l: "Melhor nota" },
                            { v: "mercado", l: "Mercado" },
                            { v: "porte_desc", l: "Porte ↓" },
                            { v: "porte_asc", l: "Porte ↑" },
                          ] as { v: OrdemTab3Chave; l: string }[]).map((opt) => (
                            <Button
                              key={opt.v}
                              variant={filtros.primaria === opt.v ? "default" : "ghost"}
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                setFiltrosTab3((p) => ({
                                  ...p,
                                  [idx]: { ...(p[idx] || filtroPadraoTab3), primaria: opt.v },
                                }))
                              }
                            >
                              {opt.l}
                            </Button>
                          ))}
                          <span className="text-muted-foreground ml-2">·</span>
                          <span className="text-muted-foreground">depois:</span>
                          <Select
                            value={filtros.secundaria}
                            onValueChange={(v) =>
                              setFiltrosTab3((p) => ({
                                ...p,
                                [idx]: { ...(p[idx] || filtroPadraoTab3), secundaria: v as any },
                              }))
                            }
                          >
                            <SelectTrigger className="h-7 w-[150px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nenhuma">— nenhum —</SelectItem>
                              <SelectItem value="preco">Menor preço</SelectItem>
                              <SelectItem value="data">Mais recentes</SelectItem>
                              <SelectItem value="nota">Melhor nota</SelectItem>
                              <SelectItem value="mercado">Mercado</SelectItem>
                              <SelectItem value="porte_desc">Porte ↓ (maior → menor)</SelectItem>
                              <SelectItem value="porte_asc">Porte ↑ (menor → maior)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant={filtros.somenteRecentes ? "default" : "ghost"}
                            size="sm"
                            className="h-7 px-2 text-xs ml-auto"
                            onClick={() =>
                              setFiltrosTab3((p) => ({
                                ...p,
                                [idx]: {
                                  ...(p[idx] || filtroPadraoTab3),
                                  somenteRecentes: !(p[idx]?.somenteRecentes ?? false),
                                },
                              }))
                            }
                          >
                            Só últimos 6 meses
                          </Button>
                          {(filtros.mercados.length > 0 ||
                            filtros.somenteRecentes ||
                            filtros.secundaria !== "nenhuma" ||
                            filtros.primaria !== "data") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground"
                              onClick={() =>
                                setFiltrosTab3((p) => ({ ...p, [idx]: filtroPadraoTab3 }))
                              }
                            >
                              Limpar
                            </Button>
                          )}
                        </div>
                        {(mercadosUnicos.length > 0 || temSemMercado) && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-muted-foreground mr-1">Mercados:</span>
                            {mercadosUnicos.map((m) => {
                              const ativo = filtros.mercados.includes(m);
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() =>
                                    setFiltrosTab3((p) => {
                                      const cur = p[idx] || filtroPadraoTab3;
                                      const novos = ativo
                                        ? cur.mercados.filter((x) => x !== m)
                                        : [...cur.mercados, m];
                                      return { ...p, [idx]: { ...cur, mercados: novos } };
                                    })
                                  }
                                  className={cn(
                                    "text-[11px] px-2 py-0.5 rounded-md border transition-colors",
                                    ativo
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-secondary text-secondary-foreground border-transparent hover:border-primary/40"
                                  )}
                                >
                                  {m}
                                </button>
                              );
                            })}
                            {temSemMercado && (
                              <span
                                title="Fornecedores sem mercado cadastrado aparecem em todos os filtros até serem preenchidos"
                                className="text-[11px] px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-800 border-amber-500/40"
                              >
                                Sem mercado
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {fornsBruto.length === 0 ? (
                      <EmptyState
                        title="Nenhum fornecedor cadastrado"
                        description="Cadastre um fornecedor para este item ou volte à Etapa 2 para revisar o nome."
                        action={
                          <Button variant="outline" size="sm" onClick={() => abrirNovoFornecedor(idx)}>
                            <UserPlus className="w-4 h-4" /> Cadastrar fornecedor
                          </Button>
                        }
                      />
                    ) : (
                      <>
                        {semExato && item.porte && (
                          <div className="text-xs px-3 py-2 rounded-md bg-amber-500/10 text-amber-800 border border-amber-500/30">
                            Nenhum fornecedor encontrado para o porte <strong>{item.porte}</strong>. Exibindo portes disponíveis abaixo.
                          </div>
                        )}

                        <div className="border rounded-md overflow-hidden hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8 px-2"></TableHead>
                                <TableHead className="px-2">Fornecedor</TableHead>
                                <TableHead className="px-2">Mercado</TableHead>
                                <TableHead className="px-2">Porte</TableHead>
                                <TableHead className="px-2">Preço</TableHead>
                                <TableHead className="px-2">Un.</TableHead>
                                <TableHead className="px-2">Última cotação</TableHead>
                                <TableHead className="px-2">Nota</TableHead>
                                <TableHead className="px-2">Atualizado por</TableHead>
                                <TableHead className="px-2"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {exatasOrd.map((l) => renderTableRow(l, "exato"))}
                              {exatasOrd.length === 0 && indefOrd.length > 0 && indefOrd.map((l) => renderTableRow(l, "indef"))}

                              {/* Botão expandir maiores */}
                              {maiores.length > 0 && (
                                <TableRow>
                                  <TableCell colSpan={10} className="p-2 bg-muted/30">
                                    <button
                                      type="button"
                                      onClick={() => setExpandirMaiores((p) => ({ ...p, [idx]: !p[idx] }))}
                                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                      <ChevronsUp className="w-3.5 h-3.5" />
                                      {expMaior ? "Ocultar" : "+ Ver"} portes maiores ({maiores.length})
                                    </button>
                                  </TableCell>
                                </TableRow>
                              )}
                              {expMaior && maioresOrd.map((l) => renderTableRow(l, "maior"))}

                              {/* Botão expandir menores */}
                              {menores.length > 0 && (
                                <TableRow>
                                  <TableCell colSpan={10} className="p-2 bg-muted/30">
                                    <button
                                      type="button"
                                      onClick={() => setExpandirMenores((p) => ({ ...p, [idx]: !p[idx] }))}
                                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                      <ChevronsDown className="w-3.5 h-3.5" />
                                      {expMenor ? "Ocultar" : "+ Ver"} portes menores ({menores.length})
                                    </button>
                                  </TableCell>
                                </TableRow>
                              )}
                              {expMenor && menoresOrd.map((l) => renderTableRow(l, "menor"))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile cards (≤md) — uso de campo */}
                        <MobileCardList
                          items={[...exatasOrd, ...(exatasOrd.length === 0 ? indefOrd : []), ...(expMaior ? maioresOrd : []), ...(expMenor ? menoresOrd : [])].map((l) => {
                            const r = l.row;
                            const f = r.fornecedores || {};
                            const papel = papelAtual(idx, r.fornecedor_id);
                            const indispKey = r.item_id ? `${r.item_id}::${r.fornecedor_id}` : "";
                            const indisp = indispKey ? (indispMap as Map<string, any>).get(indispKey) : null;
                            return {
                              key: `${r.fornecedor_id}-${l.portUsado || "x"}`,
                              title: f.nome || "Fornecedor",
                              subtitle: f.mercado ? `Mercado: ${f.mercado}` : (
                                <button
                                  type="button"
                                  className="text-amber-700 underline-offset-2 hover:underline text-xs"
                                  onClick={() =>
                                    setMercadoInlineDialog({
                                      open: true,
                                      fornecedorId: f.id,
                                      fornecedorNome: f.nome,
                                      mercadoAtual: f.mercado || null,
                                    })
                                  }
                                >
                                  Definir mercado
                                </button>
                              ),
                              badges: papel ? (
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                                  papel === "principal" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-secondary",
                                )}>{papelLabel[papel]}</span>
                              ) : indisp ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border">Não tinha</span>
                              ) : null,
                              fields: [
                                { label: "Preço", value: l.precoUsado != null ? `R$ ${l.precoUsado.toFixed(2)}` : "—" },
                                { label: "Porte", value: l.portUsado || "—" },
                                { label: "Última", value: l.dataUsada ? new Date(l.dataUsada).toLocaleDateString("pt-BR") : "—" },
                                { label: "Un.", value: r.unidade || "—" },
                              ],
                              actions: (
                                <>
                                  <Button
                                    size="sm"
                                    variant={papel ? "secondary" : "default"}
                                    className="flex-1"
                                    onClick={() => {
                                      if (papel) {
                                        definirPapel(idx, r.fornecedor_id, "remover", f);
                                      } else {
                                        const livre = proximoPapelLivre(idx);
                                        if (!livre) {
                                          toast({ title: "Limite de 3 fornecedores", variant: "destructive" });
                                          return;
                                        }
                                        definirPapel(idx, r.fornecedor_id, livre, f);
                                      }
                                    }}
                                  >
                                    {papel ? "Remover" : "Selecionar"}
                                  </Button>
                                  {!indisp && r.item_id && r.item_tipo && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setIndispTarget({
                                          itemId: r.item_id,
                                          itemTipo: r.item_tipo,
                                          fornecedorId: r.fornecedor_id,
                                          fornecedorNome: f.nome,
                                          itemNome: item.nome_popular,
                                        })
                                      }
                                    >
                                      <PackageX className="w-4 h-4" /> Não tinha
                                    </Button>
                                  )}
                                  {indisp && (
                                    <DesfazerIndisponibilidadeButton
                                      marcacaoId={indisp.id}
                                      fornecedorNome={f.nome}
                                    />
                                  )}
                                </>
                              ),
                            };
                          })}
                          emptyTitle="Sem fornecedores para exibir"
                        />

                        {/* Toggle expandir maiores/menores no mobile */}
                        <div className="md:hidden flex flex-wrap gap-2">
                          {maiores.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandirMaiores((p) => ({ ...p, [idx]: !p[idx] }))}
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                              {expMaior ? "Ocultar" : "Ver"} portes maiores ({maiores.length})
                            </Button>
                          )}
                          {menores.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandirMenores((p) => ({ ...p, [idx]: !p[idx] }))}
                            >
                              <ChevronsDown className="w-3.5 h-3.5" />
                              {expMenor ? "Ocultar" : "Ver"} portes menores ({menores.length})
                            </Button>
                          )}
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => abrirNovoFornecedor(idx)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline mt-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Adicionar fornecedor não cadastrado
                    </button>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                  );
                };

                if (visiveisIdx.length <= 30) {
                  return visiveisIdx.map((idx) => (
                    <div key={idx}>{renderCard(idx)}</div>
                  ));
                }
                return (
                  <VirtualWindowList
                    count={visiveisIdx.length}
                    estimateSize={360}
                    getKey={(i) => visiveisIdx[i]}
                    renderItem={(i) => renderCard(visiveisIdx[i])}
                  />
                );
              })()}

              <div className="sticky bottom-0 bg-background/95 backdrop-blur border rounded-lg p-3 flex justify-end">
                <Button
                  variant="terracota"
                  onClick={() => setResumoOpen(true)}
                  disabled={Object.values(fornecedoresSelecionados).every((arr) => !arr || arr.length === 0)}
                >
                  <MessageCircle className="w-4 h-4" />
                  Resumo para fornecedores (WhatsApp)
                </Button>
              </div>
              {indispTarget && (
                <IndisponibilidadeDialog
                  open={!!indispTarget}
                  onOpenChange={(o) => !o && setIndispTarget(null)}
                  itemId={indispTarget.itemId}
                  itemTipo={indispTarget.itemTipo}
                  fornecedorId={indispTarget.fornecedorId}
                  fornecedorNome={indispTarget.fornecedorNome}
                  itemNome={indispTarget.itemNome}
                />
              )}
              </>)}

              {/* FAB Mafe — disponível em toda a Etapa 3 (comparativo + atualizar) */}
              {(() => {
                const expandidos = itensMaterial
                  .map((it, i) => ({ it, i }))
                  .filter(({ i }) => !blocosColapsados[i]);
                let prioritarios: FornecedorAtualizacaoItem[] = [];
                let contextoLabel: string | null = null;
                if (expandidos.length === 1 && tabEtapa3 === "comparativo") {
                  const nome = expandidos[0].it.nome_popular;
                  prioritarios = fornecedoresEnvolvidos.filter((f) =>
                    f.itens.some((i) => i.nome_popular === nome),
                  );
                  contextoLabel = nome;
                }
                return (
                  <MafeFAB
                    fornecedoresEnvolvidos={fornecedoresEnvolvidos}
                    fornecedoresContextoPrioritario={prioritarios}
                    contextoLabel={contextoLabel}
                    onSelecionar={(f) =>
                      setIaChatTarget({
                        fornecedorId: f.fornecedorId,
                        fornecedorNome: f.fornecedorNome,
                        mercado: f.mercado,
                      })
                    }
                  />
                );
              })()}
            </div>
              )}

              {/* Modal: definir mercado de fornecedor sem sair da etapa */}
              <EditarMercadoDialog
                open={mercadoInlineDialog.open}
                onOpenChange={(o) =>
                  setMercadoInlineDialog((p) => ({ ...p, open: o }))
                }
                fornecedorId={mercadoInlineDialog.fornecedorId || ""}
                fornecedorNome={mercadoInlineDialog.fornecedorNome}
                mercadoAtual={mercadoInlineDialog.mercadoAtual}
                sugestoes={(fornecedoresLista || [])
                  .map((x: any) => x.mercado)
                  .filter((m: any) => m && String(m).trim())}
                onSaved={() => refetchHistorico?.()}
              />

              {/* Modal: validação ao avançar para Etapa 4 */}
              <Dialog open={validacaoEtapa4Open} onOpenChange={setValidacaoEtapa4Open}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Pendências antes de avançar</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm max-h-[60vh] overflow-auto">
                    {pendenciasEtapa3.itensSemPrincipal.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          {pendenciasEtapa3.itensSemPrincipal.length} item(ns) sem fornecedor Principal
                        </p>
                        <ul className="space-y-1">
                          {pendenciasEtapa3.itensSemPrincipal.map((it) => (
                            <li
                              key={it.idx}
                              className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                            >
                              <span className="truncate">{it.nome}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setBlocosColapsados((p) => ({ ...p, [it.idx]: false }));
                                  setValidacaoEtapa4Open(false);
                                  // tenta rolar até o card
                                  setTimeout(() => {
                                    const el = document.querySelectorAll(".space-y-4 > .p-4")[it.idx] as HTMLElement | undefined;
                                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                                  }, 100);
                                }}
                              >
                                Ir até o item
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {pendenciasEtapa3.fornsSemMercado.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          {pendenciasEtapa3.fornsSemMercado.length} fornecedor(es) sem mercado
                        </p>
                        <ul className="space-y-1">
                          {pendenciasEtapa3.fornsSemMercado.map((f) => (
                            <li
                              key={f.id}
                              className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{f.nome}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  Em: {f.itens.join(", ")}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setMercadoInlineDialog({
                                    open: true,
                                    fornecedorId: f.id,
                                    fornecedorNome: f.nome,
                                    mercadoAtual: null,
                                  });
                                }}
                              >
                                Definir mercado
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!pendenciasEtapa3.bloqueia && (
                      <p className="text-muted-foreground">
                        Todas as pendências foram resolvidas. Você já pode avançar.
                      </p>
                    )}
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setValidacaoEtapa4Open(false)}>
                      Continuar revisando
                    </Button>
                    <Button
                      variant="terracota"
                      disabled={pendenciasEtapa3.bloqueia}
                      onClick={() => {
                        setValidacaoEtapa4Open(false);
                        irParaEtapa(4);
                      }}
                    >
                      Avançar para Markup
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

          {/* Etapa 4 - Markup e Margens */}
          {etapaAtual === 4 && (
            <div className="space-y-4">
              <ResumoCorrenteRail
                etapa={4}
                custo={totaisResumo.totalCusto}
                venda={totaisResumo.totalVenda}
                margemPct={margemBrutaPctTotal}
                totalCliente={totalCliente}
                custoPorM2={custoPorM2}
                areaM2={areaM2}
              />
              <div>
                <h1 className="font-display text-2xl text-foreground">Markup, margens e comissão</h1>
                <p className="text-sm text-muted-foreground">
                  Defina o markup por categoria, o piso de margem aceitável e (se houver) a comissão. Tudo se reflete no total à direita em tempo real.
                </p>
              </div>
              <Etapa4MarkupBlocoA
                orcamentoId={id}
                perfilSelecionadoId={form.perfil_markup_id}
                onPerfilSelecionado={(pid) => setForm((p) => ({ ...p, perfil_markup_id: pid }))}
                tipoNf={tipoNf}
                aliquotaPct={aliquotaMes}
                areaM2={areaM2}
              />

              {/* Bloco D — Comissão */}
              <Card className="p-4">
                <button
                  type="button"
                  className="w-full flex items-center justify-between"
                  onClick={() => setComissaoAberta((v) => !v)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-base text-foreground">Comissão</h3>
                    <Switch
                      checked={comissaoOn}
                      onCheckedChange={(v) => {
                        setComissaoOn(v);
                        if (v) setComissaoAberta(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {comissaoAberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {comissaoAberta && comissaoOn && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Tipo</Label>
                      <RadioGroup
                        value={comissaoTipo}
                        onValueChange={(v: any) => setComissaoTipo(v)}
                        className="flex gap-4"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="vendas" /> Vendas
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="indicacao" /> Indicação
                        </label>
                      </RadioGroup>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Percentual (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={comissaoPct}
                        onChange={(e) => setComissaoPct(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Beneficiário</Label>
                      <Input
                        value={comissaoBeneficiario}
                        onChange={(e) => setComissaoBeneficiario(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-4 text-sm text-muted-foreground">
                      Valor calculado:{" "}
                      <strong className="text-foreground">{fmtBRL(valorComissao)}</strong>
                    </div>
                  </div>
                )}
              </Card>

              {/* Bloco E — Valor de negociação (diluição proporcional) */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base text-foreground">
                    Valor de negociação (diluído)
                  </h3>
                  <span className={`text-sm font-medium ${negociacaoValor < 0 ? "text-destructive" : "text-primary"}`}>
                    {fmtBRL(negociacaoValor)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Valor em R$ (positivo embute margem, negativo absorve desconto)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={negociacaoValor}
                      onChange={(e) => setNegociacaoValor(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Produtos absorvem ({(shareProdutos * 100).toFixed(1)}%):</p>
                    <strong className="text-foreground">{fmtBRL(negociacaoProdutos)}</strong>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Mão de Obra absorve ({(shareMo * 100).toFixed(1)}%):</p>
                    <strong className="text-foreground">{fmtBRL(negociacaoMo)}</strong>
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
                  <span>Total venda original: <strong>{fmtBRL(totaisResumo.totalVenda)}</strong></span>
                  <span>Total c/ negociação: <strong>{fmtBRL(totalClienteSemComissao)}</strong></span>
                  <span>Margem bruta final: <strong>{fmtBRL(margemBrutaValFinal)} ({margemBrutaPctTotal.toFixed(1)}%)</strong></span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A diluição é proporcional ao valor de venda de cada bloco. Não precisa ratear na mão: o sistema ajusta os preços finais automaticamente.
                </p>
              </Card>
            </div>
          )}

          {/* LEGADO: UI antiga de Cotação — desativada na refatoração de 6 etapas.
              Mantida no código para referência; não renderiza mais. */}
          {false && (
            <div className="space-y-4">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border rounded-lg p-3 flex flex-wrap gap-3 text-sm">
                <span className="text-destructive font-medium">
                  {resumoCotacoes.semCot} sem cotação
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-yellow-700 font-medium">
                  {resumoCotacoes.porteDiv} com porte divergente
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-primary font-medium">
                  {resumoCotacoes.completos} completos
                </span>
              </div>

              {itensMaterial.length === 0 && (
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Nenhum item no memorial. Volte à Etapa 2 para adicionar itens.
                  </p>
                </Card>
              )}

              {itensMaterial.map((item, idx) => {
                const sel = fornecedoresSelecionados[idx] || [];
                const linhas = cotacoes[idx] || {};
                const margem = margensSeg[idx] ?? 0;
                const qtdEsperada = Number(item.quantidade) || 0;
                const qtdOrcar = Math.ceil(qtdEsperada * (1 + margem / 100));
                const colapsado = !!cardsColapsados[idx];
                const principalId = sel.find((fid) => linhas[fid]?.status_selecao === "principal");
                const principalLinha = principalId ? linhas[principalId] : undefined;

                return (
                  <Card key={idx} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {item.nome_popular || "(sem nome)"}
                          {item.nome_cientifico && (
                            <span className="ml-2 italic font-normal text-muted-foreground">
                              {item.nome_cientifico}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5 items-center text-xs">
                          {item.porte && (
                            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              Porte: {item.porte}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            Qtd a orçar: <strong className="text-foreground">{qtdOrcar}</strong> {item.unidade}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCardsColapsados((p) => ({ ...p, [idx]: !p[idx] }))
                        }
                      >
                        {colapsado ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </Button>
                    </div>

                    {!colapsado && (
                      <>
                        {sel.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">
                            Nenhum fornecedor selecionado na Etapa 3.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {sel.map((fid) => {
                              const linha: CotacaoLinha = linhas[fid] || {
                                valor_unitario: "",
                                porte_ofertado: "",
                                disponivel: "nc",
                                status_selecao: "descartado",
                                obs: "",
                              };
                              const porteDivergente =
                                linha.porte_ofertado &&
                                item.porte &&
                                linha.porte_ofertado.trim().toLowerCase() !==
                                  item.porte.trim().toLowerCase();
                              return (
                                <div key={fid} className="border rounded-md p-3 space-y-2">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <p className="font-semibold text-sm text-foreground">
                                      {nomeFornecedor(item, fid)}
                                    </p>
                                    <div className="flex gap-1">
                                      {(["principal", "backup1", "backup2", "descartado"] as const).map((st) => {
                                        const labels: Record<string, string> = {
                                          principal: "● Principal",
                                          backup1: "Backup 1",
                                          backup2: "Backup 2",
                                          descartado: "Descartado",
                                        };
                                        const isSel = linha.status_selecao === st;
                                        return (
                                          <button
                                            key={st}
                                            type="button"
                                            onClick={() => setCotacao(idx, fid, { status_selecao: st })}
                                            className={cn(
                                              "px-2 py-1 text-xs rounded-md border transition-colors",
                                              isSel
                                                ? st === "principal"
                                                  ? "bg-primary text-primary-foreground border-primary"
                                                  : "bg-muted border-foreground/20"
                                                : "hover:bg-muted/50",
                                            )}
                                          >
                                            {labels[st]}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Valor unitário (R$) *</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={linha.valor_unitario}
                                        onChange={(e) =>
                                          setCotacao(idx, fid, { valor_unitario: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Porte ofertado</Label>
                                      <Input
                                        value={linha.porte_ofertado}
                                        onChange={(e) =>
                                          setCotacao(idx, fid, { porte_ofertado: e.target.value })
                                        }
                                      />
                                      {porteDivergente && (
                                        <div className="mt-1 px-2 py-1 rounded text-[10px] bg-yellow-50 border border-yellow-300 text-yellow-800 leading-tight">
                                          ⚠️ Porte divergente — solicitado: <strong>{item.porte}</strong> · ofertado: <strong>{linha.porte_ofertado}</strong>
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Disponibilidade</Label>
                                      <div className="flex gap-1">
                                        {(["sim", "nao", "nc"] as const).map((d) => {
                                          const labels: Record<string, string> = {
                                            sim: "✓ Sim",
                                            nao: "✗ Não",
                                            nc: "? N/C",
                                          };
                                          const isSel = linha.disponivel === d;
                                          return (
                                            <button
                                              key={d}
                                              type="button"
                                              onClick={() => setCotacao(idx, fid, { disponivel: d })}
                                              className={cn(
                                                "px-2 py-1 text-xs rounded-md border flex-1",
                                                isSel ? "bg-muted border-foreground/30" : "hover:bg-muted/50",
                                              )}
                                            >
                                              {labels[d]}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <Label className="text-xs">Observação</Label>
                                    <Input
                                      value={linha.obs}
                                      onChange={(e) => setCotacao(idx, fid, { obs: e.target.value })}
                                      placeholder="Opcional"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
                          <div className="space-y-1">
                            <Label className="text-xs">Margem de segurança (%)</Label>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              className="w-28"
                              value={margem}
                              onChange={(e) =>
                                setMargensSeg((p) => ({ ...p, [idx]: Number(e.target.value) || 0 }))
                              }
                            />
                          </div>
                          <p className="text-xs text-muted-foreground pb-2">
                            Quantidade esperada: <strong>{qtdEsperada}</strong> | Quantidade a orçar:{" "}
                            <strong>{qtdOrcar}</strong>
                          </p>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end pt-1">
                      {!principalId ? (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-destructive/15 text-destructive">
                          Selecione o fornecedor principal
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Principal: <strong className="text-foreground">{nomeFornecedor(item, principalId)}</strong>
                          {principalLinha?.valor_unitario &&
                            ` — R$ ${Number(principalLinha.valor_unitario).toFixed(2)}`}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Insumos (fundidos na etapa Fornecedores no novo fluxo de 6 etapas) */}
          {etapaAtual === 3 && tabEtapa3 === "comparativo" && (
            <div className="space-y-6">
              {/* Seção A — Insumos calculados */}
              <Card className="p-4 space-y-3">
                <div>
                  <h2 className="font-display text-lg text-foreground">
                    Insumos de Plantio (calculados automaticamente)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Quantidades calculadas a partir dos coeficientes vigentes. Ajuste se necessário.
                  </p>
                </div>
                {insumosCalc.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum insumo calculado para os itens selecionados.
                  </p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs">
                        <tr>
                          <th className="text-left p-2">Insumo</th>
                          <th className="text-left p-2 w-40">Quantidade</th>
                          <th className="text-left p-2 w-24">Unidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insumosCalc.map((linha, idx) => (
                          <tr key={linha.tipo} className="border-t">
                            <td className="p-2 font-medium">{linha.nome}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={linha.quantidade}
                                onChange={(e) =>
                                  setInsumosCalc((prev) =>
                                    prev.map((l, i) =>
                                      i === idx ? { ...l, quantidade: Number(e.target.value) || 0 } : l,
                                    ),
                                  )
                                }
                                className="h-8"
                              />
                            </td>
                            <td className="p-2 text-muted-foreground">{linha.unidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Seção B — Insumos adicionais */}
              <Card className="p-4 space-y-3">
                <div>
                  <h2 className="font-display text-lg text-foreground">Insumos Adicionais</h2>
                  <p className="text-xs text-muted-foreground">
                    Selecione os insumos extras necessários para este projeto.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {INSUMOS_SUGERIDOS.map((nome) => {
                    const sel = insumosAdicionais.some((i) => i.nome === nome);
                    return (
                      <label
                        key={nome}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs cursor-pointer transition-colors",
                          sel ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={sel}
                          onCheckedChange={() => toggleInsumoSugerido(nome)}
                        />
                        {nome}
                      </label>
                    );
                  })}
                </div>

                {insumosAdicionais.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {insumosAdicionais.map((ins, idx) => {
                      const qtdEsp = Number(ins.quantidade_esperada) || 0;
                      const margem = Number(ins.margem) || 0;
                      const qtdOrcar = Math.ceil(qtdEsp * (1 + margem / 100));
                      const valor = (Number(ins.valor_unitario) || 0) * qtdOrcar;
                      return (
                        <div key={idx} className="border rounded-md p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              value={ins.nome}
                              onChange={(e) => updateInsumoAdic(idx, { nome: e.target.value })}
                              placeholder="Nome do insumo"
                              className="font-medium max-w-md"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setInsumosAdicionais((p) => p.filter((_, i) => i !== idx))
                              }
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Fornecedor</Label>
                              <div className="flex gap-1">
                                <Select
                                  value={ins.fornecedor_id}
                                  onValueChange={(v) => updateInsumoAdic(idx, { fornecedor_id: v })}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(fornecedoresLista as any[]).map((f) => (
                                      <SelectItem key={f.id} value={f.id}>
                                        {f.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  title="Cadastrar novo fornecedor"
                                  onClick={() =>
                                    openQuickAdd("fornecedor_insumo", (id) =>
                                      updateInsumoAdic(idx, { fornecedor_id: id }),
                                    )
                                  }
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Quantidade esperada</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={ins.quantidade_esperada}
                                onChange={(e) =>
                                  updateInsumoAdic(idx, { quantidade_esperada: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Unidade</Label>
                              <Select
                                value={ins.unidade}
                                onValueChange={(v) => updateInsumoAdic(idx, { unidade: v })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIDADES_INSUMO.map((u) => (
                                    <SelectItem key={u} value={u}>
                                      {u}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Margem segurança (%)</Label>
                              <Input
                                type="number"
                                step="1"
                                value={ins.margem}
                                onChange={(e) => updateInsumoAdic(idx, { margem: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Quantidade a orçar</Label>
                              <Input value={qtdOrcar} readOnly className="bg-muted/40" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Valor unitário (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={ins.valor_unitario}
                                onChange={(e) =>
                                  updateInsumoAdic(idx, { valor_unitario: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
                            <span>
                              Valor total:{" "}
                              <strong className="text-foreground">
                                R$ {valor.toFixed(2).replace(".", ",")}
                              </strong>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Observação interna</Label>
                              <Input
                                value={ins.obs_interna}
                                onChange={(e) => updateInsumoAdic(idx, { obs_interna: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Observação na proposta</Label>
                              <Input
                                value={ins.obs_proposta}
                                onChange={(e) => updateInsumoAdic(idx, { obs_proposta: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button variant="outline" size="sm" onClick={addInsumoCustom}>
                  <Plus className="w-4 h-4" />
                  Adicionar insumo personalizado
                </Button>

                {insumosSemQtd.length > 0 && (
                  <div className="rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 p-3 text-sm">
                    ⚠️ {insumosSemQtd.length} insumo(s) sem quantidade:{" "}
                    <strong>{insumosSemQtd.map((i) => i.nome).join(", ")}</strong>
                    <div className="text-xs mt-1">
                      Você pode avançar, mas eles não entrarão no orçamento.
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Etapa 5 - Mão de Obra, Fretes e Transporte */}
          {etapaAtual === 5 && (
            <div className="space-y-6 pb-24">
              <ResumoCorrenteRail
                etapa={5}
                custo={totaisResumo.totalCusto}
                venda={totaisResumo.totalVenda}
                margemPct={margemBrutaPctTotal}
                totalCliente={totalCliente}
                custoPorM2={custoPorM2}
                areaM2={areaM2}
              />
              <div>
                <h1 className="font-display text-2xl text-foreground">Mão de Obra, Fretes e Transporte</h1>
                <p className="text-sm text-muted-foreground">
                  Lance os custos diretos de execução. A alíquota da MO e o tipo de NF (PJ/CPF) já se aplicam só aqui.
                </p>
              </div>
              {moLinhas.length > 0 && (!form.tipo_proposta_id || !aliquotaMes || aliquotaMes <= 0) && (
                <div className="rounded-md border border-primary/40 bg-primary/10 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Empresa de faturamento ausente</p>
                    <p className="text-xs text-muted-foreground">
                      Defina a empresa de faturamento e a alíquota na Etapa 1 para calcular impostos sobre a mão de obra corretamente.
                    </p>
                    <Button variant="link" size="sm" className="px-0 h-auto text-primary" onClick={() => setEtapaAtual(1)}>
                      Ir para Etapa 1
                    </Button>
                  </div>
                </div>
              )}
              {/* Seção A — MÃO DE OBRA */}
              <Card className="p-4 space-y-3">
                <Collapsible open={openBlocoMo} onOpenChange={setOpenBlocoMo}>
                <div className="flex items-center justify-between gap-2">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex items-start gap-2 text-left flex-1 rounded-md hover:bg-muted/40 px-1 py-1 -mx-1">
                      {openBlocoMo ? <ChevronUp className="w-4 h-4 mt-1 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 mt-1 text-muted-foreground" />}
                      <div>
                        <h2 className="font-display text-lg text-foreground">Mão de Obra Prevista</h2>
                        <p className="text-xs text-muted-foreground">
                          Adicione cargos previstos para execução do projeto. Total: <strong className="text-foreground">{fmtBRL(valorNfMo)}</strong>
                        </p>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <Button variant="outline" size="sm" onClick={addMoLinha}>
                    <Plus className="w-4 h-4" />
                    Adicionar cargo
                  </Button>
                </div>
                <CollapsibleContent className="space-y-3 pt-3">

                {moLinhas.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum cargo adicionado.</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs">
                        <tr>
                          <th className="text-left p-2">Colaborador</th>
                          <th className="text-left p-2">Cargo</th>
                          <th className="text-left p-2 w-24">Qtd func.</th>
                          <th className="text-left p-2 w-24">Dias</th>
                          <th className="text-left p-2 w-32">Salário/dia</th>
                          <th className="text-left p-2 w-32">Custo bruto</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {moLinhas.map((l, idx) => {
                          const bruto =
                            (Number(l.qtd) || 0) * (Number(l.dias) || 0) * (Number(l.salario_diario) || 0);
                          return (
                            <tr key={idx} className="border-t">
                              <td className="p-2">
                                <Select
                                  value={l.colaborador_id || "__none__"}
                                  onValueChange={(v) => {
                                    if (v === "__none__") {
                                      updateMoLinha(idx, { colaborador_id: "", colaborador_nome: "" });
                                      return;
                                    }
                                    const co = (colaboradoresAtivos as any[]).find((x) => x.id === v);
                                    const patch: Partial<MoLinha> = {
                                      colaborador_id: v,
                                      colaborador_nome: co?.nome || "",
                                    };
                                    // Se cargo ainda vazio e colaborador tem cargo, tenta auto-vincular
                                    if (!l.cargo_id && co?.cargo) {
                                      const match = (cargosMo as any[]).find(
                                        (c) => String(c.nome).toLowerCase() === String(co.cargo).toLowerCase(),
                                      );
                                      if (match) {
                                        patch.cargo_id = match.id;
                                        patch.cargo_nome = match.nome;
                                        patch.salario_diario = String(match.salario_diario ?? "0");
                                      }
                                    }
                                    updateMoLinha(idx, patch);
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Genérico" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Genérico (sem nome)</SelectItem>
                                    {(colaboradoresAtivos as any[]).map((co) => (
                                      <SelectItem key={co.id} value={co.id}>
                                        {co.nome}
                                        {co.cargo && (
                                          <span className="text-xs text-muted-foreground"> · {co.cargo}</span>
                                        )}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <Select
                                    value={l.cargo_id}
                                    onValueChange={(v) => {
                                      const c = (cargosMo as any[]).find((x) => x.id === v);
                                      updateMoLinha(idx, {
                                        cargo_id: v,
                                        cargo_nome: c?.nome || "",
                                        salario_diario: String(c?.salario_diario ?? "0"),
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(cargosMo as any[]).map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.nome}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    title="Cadastrar novo cargo"
                                    onClick={() =>
                                      openQuickAdd("cargo", (id, label) => {
                                        updateMoLinha(idx, {
                                          cargo_id: id,
                                          cargo_nome: label,
                                        });
                                      })
                                    }
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={l.qtd}
                                  onChange={(e) => updateMoLinha(idx, { qtd: e.target.value })}
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={l.dias}
                                  onChange={(e) => updateMoLinha(idx, { dias: e.target.value })}
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  value={Number(l.salario_diario || 0).toFixed(2)}
                                  readOnly
                                  className="h-8 bg-muted/40"
                                />
                              </td>
                              <td className="p-2 text-foreground font-medium">{fmtBRL(bruto)}</td>
                              <td className="p-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeMoLinha(idx)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bloco fiscal */}
                <div className="border-t pt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Alíquota do mês — Mão de Obra (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={aliquotaMes}
                        onChange={(e) => setAliquotaMes(Number(e.target.value) || 0)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Aplica somente sobre a mão de obra. A alíquota de produtos (plantas + insumos) é ajustada no Resumo Final.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo de NF</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={tipoNf === "pj" ? "terracota" : "outline"}
                          size="sm"
                          onClick={() => setTipoNf("pj")}
                        >
                          PJ (com INSS 11%)
                        </Button>
                        <Button
                          variant={tipoNf === "cpf" ? "terracota" : "outline"}
                          size="sm"
                          onClick={() => setTipoNf("cpf")}
                        >
                          CPF (sem INSS)
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
                    <span>
                      Custo MO: <strong>{fmtBRL(custoMoBruto)}</strong>
                    </span>
                    <span>
                      Valor NF: <strong>{fmtBRL(valorNfMo)}</strong>
                    </span>
                    <span>
                      Diferença (imposto): <strong>{fmtBRL(valorNfMo - custoMoBruto)}</strong>
                    </span>
                  </div>
                </div>
                </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Seção B — FRETES */}
              <Card className="p-4 space-y-3">
                <Collapsible open={openBlocoFretes} onOpenChange={setOpenBlocoFretes}>
                <div className="flex items-center justify-between gap-2">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex items-start gap-2 text-left flex-1 rounded-md hover:bg-muted/40 px-1 py-1 -mx-1">
                      {openBlocoFretes ? <ChevronUp className="w-4 h-4 mt-1 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 mt-1 text-muted-foreground" />}
                      <div>
                        <h2 className="font-display text-lg text-foreground">Fretes do Projeto</h2>
                        <p className="text-xs text-muted-foreground">
                          Todos os fretes são repassados ao cliente. Total: <strong className="text-foreground">{fmtBRL(totalFretes)}</strong>
                        </p>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <Button variant="outline" size="sm" onClick={addFrete}>
                    <Plus className="w-4 h-4" />
                    Adicionar frete
                  </Button>
                </div>
                <CollapsibleContent className="space-y-3 pt-3">

                {fretes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum frete adicionado.</p>
                ) : (
                  <div className="space-y-3">
                    {fretes.map((f, idx) => {
                      const qtdOrcar = Math.ceil(
                        (Number(f.qtd_esperada) || 0) * (1 + (Number(f.margem) || 0) / 100),
                      );
                      const total = qtdOrcar * (Number(f.valor_unitario) || 0);
                      return (
                        <div key={idx} className="border rounded-md p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={f.modo_transp === "cad" ? "terracota" : "outline"}
                                onClick={() => updateFrete(idx, { modo_transp: "cad" })}
                              >
                                Cadastrado
                              </Button>
                              <Button
                                size="sm"
                                variant={f.modo_transp === "livre" ? "terracota" : "outline"}
                                onClick={() => updateFrete(idx, { modo_transp: "livre" })}
                              >
                                Livre
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeFrete(idx)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Transportador</Label>
                              {f.modo_transp === "cad" ? (
                                <div className="flex gap-1">
                                  <Select
                                    value={f.transportador_id}
                                    onValueChange={(v) => {
                                      const t = (transportadoras as any[]).find((x) => x.id === v);
                                      updateFrete(idx, {
                                        transportador_id: v,
                                        transportador_nome: t?.nome || "",
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(transportadoras as any[]).map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                          {t.nome}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 shrink-0"
                                    title="Cadastrar nova transportadora"
                                    onClick={() =>
                                      openQuickAdd("transportadora", (id, label) =>
                                        updateFrete(idx, {
                                          transportador_id: id,
                                          transportador_nome: label,
                                        }),
                                      )
                                    }
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Input
                                  value={f.transportador_nome}
                                  onChange={(e) =>
                                    updateFrete(idx, {
                                      transportador_nome: e.target.value,
                                      transportador_id: "",
                                    })
                                  }
                                  placeholder="Nome do transportador"
                                />
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Percurso</Label>
                              <Input
                                value={f.percurso}
                                onChange={(e) => updateFrete(idx, { percurso: e.target.value })}
                                placeholder="Origem → Destino"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">R$ / viagem</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={f.valor_unitario}
                                onChange={(e) =>
                                  updateFrete(idx, { valor_unitario: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Qtd esperada</Label>
                              <Input
                                type="number"
                                value={f.qtd_esperada}
                                onChange={(e) =>
                                  updateFrete(idx, { qtd_esperada: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Margem (%)</Label>
                              <Input
                                type="number"
                                value={f.margem}
                                onChange={(e) => updateFrete(idx, { margem: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Qtd a orçar</Label>
                              <Input value={qtdOrcar} readOnly className="bg-muted/40" />
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total: <strong className="text-foreground">{fmtBRL(total)}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Seção C — TRANSPORTE DA EQUIPE */}
              <Card className="p-4 space-y-3">
                <Collapsible open={openBlocoTransp} onOpenChange={setOpenBlocoTransp}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full flex items-start gap-2 text-left rounded-md hover:bg-muted/40 px-1 py-1 -mx-1">
                    {openBlocoTransp ? <ChevronUp className="w-4 h-4 mt-1 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 mt-1 text-muted-foreground" />}
                    <div>
                      <h2 className="font-display text-lg text-foreground">Transporte da Equipe</h2>
                      <p className="text-xs text-muted-foreground">
                        Custos de deslocamento da equipe e acompanhamento técnico. Total: <strong className="text-foreground">{fmtBRL(totalTransporte)}</strong>
                      </p>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs">
                      <tr>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2 w-32">Valor/km</th>
                        <th className="text-left p-2 w-24">Dias</th>
                        <th className="text-left p-2 w-24">Km</th>
                        <th className="text-left p-2 w-32">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transporte.map((t, idx) => {
                        const sub =
                          (Number(t.valor_km) || 0) *
                          (Number(t.dias) || 0) *
                          (Number(t.km) || 0);
                        return (
                          <tr key={t.tipo} className="border-t">
                            <td className="p-2 font-medium">
                              {t.tipo}
                              {t.tipo === "MFM" && (
                                <span className="text-xs text-muted-foreground"> (acompanhamento)</span>
                              )}
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={t.valor_km}
                                onChange={(e) => updateTransporte(idx, { valor_km: e.target.value })}
                                className="h-8"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={t.dias}
                                onChange={(e) => updateTransporte(idx, { dias: e.target.value })}
                                className="h-8"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={t.km}
                                onChange={(e) => updateTransporte(idx, { km: e.target.value })}
                                className="h-8"
                              />
                            </td>
                            <td className="p-2 font-medium">{fmtBRL(sub)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Seção D — CUSTOS INDIRETOS */}
              <Card className="p-4 space-y-3">
                <Collapsible open={openBlocoIndir} onOpenChange={setOpenBlocoIndir}>
                <div className="flex items-center justify-between gap-2">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex items-start gap-2 text-left flex-1 rounded-md hover:bg-muted/40 px-1 py-1 -mx-1">
                      {openBlocoIndir ? <ChevronUp className="w-4 h-4 mt-1 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 mt-1 text-muted-foreground" />}
                      <div>
                        <h2 className="font-display text-lg text-foreground">Custos Indiretos</h2>
                        <p className="text-xs text-muted-foreground">
                          Refeições, escritório e demais despesas indiretas. Total: <strong className="text-foreground">{fmtBRL(totalIndiretos)}</strong>
                        </p>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <Button variant="outline" size="sm" onClick={addIndireto}>
                    <Plus className="w-4 h-4" />
                    Adicionar custo
                  </Button>
                </div>
                <CollapsibleContent className="space-y-3 pt-3">

                {custosIndiretos.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum custo indireto adicionado.
                  </p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs">
                        <tr>
                          <th className="text-left p-2 w-48">Tipo</th>
                          <th className="text-left p-2">Descrição</th>
                          <th className="text-left p-2 w-32">Valor unit.</th>
                          <th className="text-left p-2 w-24">Qtd</th>
                          <th className="text-left p-2 w-32">Total</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {custosIndiretos.map((c, idx) => {
                          const total =
                            (Number(c.valor_unitario) || 0) * (Number(c.quantidade) || 0);
                          return (
                            <tr key={idx} className="border-t">
                              <td className="p-2">
                                <Select
                                  value={c.tipo}
                                  onValueChange={(v) => {
                                    const ref = TIPOS_INDIRETO.find((t) => t.value === v);
                                    const cargoVal = cargoDiarioPorTipo[v];
                                    let novoValor = c.valor_unitario;
                                    if (cargoVal && cargoVal > 0) {
                                      novoValor = String(cargoVal);
                                    } else if (ref && ref.padrao > 0 && !c.valor_unitario) {
                                      novoValor = String(ref.padrao);
                                    }
                                    updateIndireto(idx, { tipo: v, valor_unitario: novoValor });
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIPOS_INDIRETO.map((t) => (
                                      <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Input
                                  value={c.descricao}
                                  onChange={(e) =>
                                    updateIndireto(idx, { descricao: e.target.value })
                                  }
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={c.valor_unitario}
                                  onChange={(e) =>
                                    updateIndireto(idx, { valor_unitario: e.target.value })
                                  }
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={c.quantidade}
                                  onChange={(e) =>
                                    updateIndireto(idx, { quantidade: e.target.value })
                                  }
                                  className="h-8"
                                />
                              </td>
                              <td className="p-2 font-medium">{fmtBRL(total)}</td>
                              <td className="p-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeIndireto(idx)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Resumo consolidado da Etapa 5 */}
              <Card className="p-5 border-2 border-primary bg-primary/5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-primary font-semibold">Custo total da Etapa 5</p>
                    <p className="font-display text-3xl text-primary">{fmtBRL(totalEtapa6)}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">Mão de obra:</span> <strong>{fmtBRL(valorNfMo)}</strong></div>
                    <div><span className="text-muted-foreground">Fretes:</span> <strong>{fmtBRL(totalFretes)}</strong></div>
                    <div><span className="text-muted-foreground">Transporte:</span> <strong>{fmtBRL(totalTransporte)}</strong></div>
                    <div><span className="text-muted-foreground">Indiretos:</span> <strong>{fmtBRL(totalIndiretos)}</strong></div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Repasse direto ao cliente, sem markup adicional. Compõe a linha "Adicionais" no resumo financeiro da Etapa 6.
                </p>
              </Card>
            </div>
          )}

          {/* Etapa 6 - Resumo Final */}
          {etapaAtual === 6 && (
            <div className="space-y-6 pb-32">
              <ResumoCorrenteRail
                etapa={6}
                custo={totaisResumo.totalCusto}
                venda={totaisResumo.totalVenda}
                margemPct={margemBrutaPctTotal}
                totalCliente={totalCliente}
                custoPorM2={custoPorM2}
                areaM2={areaM2}
              />

              <Etapa6ResumoDRE
                linhas={linhasResumo}
                totalCusto={totaisResumo.totalCusto}
                totalVenda={totaisResumo.totalVenda}
                markupMedio={totaisResumo.markupMedio}
                margemBrutaPct={margemBrutaPctTotal}
                margemBrutaVal={margemBrutaValFinal}
                impostoProdutos={impostoProdutos}
                aliquotaProdutos={aliquotaProdutos}
                onChangeAliquotaProdutos={setAliquotaProdutos}
                aliquotaMo={aliquotaMes}
                valorComissao={valorComissao}
                comissaoOn={comissaoOn}
                comissaoLabel={`Comissão ${comissaoTipo === "vendas" ? "(vendas)" : "(indicação)"} ${Number(comissaoPct).toFixed(1)}%${
                  comissaoBeneficiario ? ` · ${comissaoBeneficiario}` : ""
                }`}
                negociacaoValor={negociacaoValor}
                negociacaoProdutos={negociacaoProdutos}
                negociacaoMo={negociacaoMo}
                shareProdutos={shareProdutos}
                shareMo={shareMo}
                totalCliente={totalCliente}
                custoPorM2={custoPorM2}
                areaM2={areaM2}
                pisos={pisosCategoria}
              />

              {/* Atalhos para ajustes nas etapas anteriores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Markup, piso e comissão</p>
                    <p className="text-xs text-muted-foreground">Editar na Etapa 4</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEtapaAtual(4)}>
                    Abrir Etapa 4
                  </Button>
                </Card>
                <Card className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Mão de Obra, Fretes, Transporte</p>
                    <p className="text-xs text-muted-foreground">Editar na Etapa 5</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEtapaAtual(5)}>
                    Abrir Etapa 5
                  </Button>
                </Card>
              </div>

              {/* Ajuste item a item (bidirecional, com rastro de auditoria) */}
              <Etapa6AjustesItem orcamentoId={id} />


              {/* Botões de ação sticky */}
              <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-primary/20 flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={handleSalvarRascunho} disabled={savingFinal}>
                  {savingFinal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar rascunho
                </Button>
                <Button variant="outline" onClick={handleEnviarCliente} disabled={savingFinal}>
                  📤 Enviar ao cliente
                </Button>
                <Button
                  variant="terracota"
                  onClick={() =>
                    setAprovarModal({ open: true, valor: totalCliente.toFixed(2), observacao: "" })
                  }
                  disabled={savingFinal}
                >
                  ✅ Marcar como aprovado
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNaoAprovarModal({ open: true, motivo: "" })}
                  disabled={savingFinal}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  ✖ Marcar como não aprovado
                </Button>
              </div>
            </div>
          )}

          {/* Modal de markup por categoria removido — markup é gerenciado na Etapa 4. */}



          {/* Modal: aprovar */}
          <Dialog
            open={aprovarModal.open}
            onOpenChange={(o) => setAprovarModal((m) => ({ ...m, open: o }))}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aprovar orçamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Valor negociado final (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={aprovarModal.valor}
                    onChange={(e) =>
                      setAprovarModal((m) => ({ ...m, valor: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Observação da aprovação (opcional)</Label>
                  <Textarea
                    rows={3}
                    value={aprovarModal.observacao}
                    onChange={(e) =>
                      setAprovarModal((m) => ({ ...m, observacao: e.target.value }))
                    }
                    placeholder="Ex.: aprovado em reunião, com desconto de 5% sobre o total."
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Após aprovado o orçamento fica imutável. Um snapshot é gravado automaticamente.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAprovarModal({ open: false, valor: "", observacao: "" })}
                  disabled={savingFinal}
                >
                  Cancelar
                </Button>
                <Button variant="terracota" onClick={handleAprovar} disabled={savingFinal}>
                  {savingFinal && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar aprovação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal: não aprovar */}
          <Dialog
            open={naoAprovarModal.open}
            onOpenChange={(o) => setNaoAprovarModal((m) => ({ ...m, open: o }))}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Marcar orçamento como não aprovado</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Motivo da não aprovação *</Label>
                  <Textarea
                    value={naoAprovarModal.motivo}
                    onChange={(e) =>
                      setNaoAprovarModal((m) => ({ ...m, motivo: e.target.value }))
                    }
                    rows={4}
                    placeholder="Ex.: Cliente optou por outro fornecedor, valor acima do orçado, projeto adiado..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Esse registro alimenta a taxa de conversão e o histórico de motivos.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setNaoAprovarModal({ open: false, motivo: "" })}
                  disabled={savingFinal}
                >
                  Cancelar
                </Button>
                <Button
                  variant="terracota"
                  onClick={handleNaoAprovar}
                  disabled={savingFinal || !naoAprovarModal.motivo.trim()}
                >
                  {savingFinal && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal: novo fornecedor */}
          <Dialog open={novoFornModalOpen} onOpenChange={setNovoFornModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo fornecedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {novoFornItemIdx !== null && itensMaterial[novoFornItemIdx] && (
                  <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
                    <p className="text-muted-foreground">Cadastrando fornecedor para:</p>
                    <p className="font-semibold text-foreground">
                      {itensMaterial[novoFornItemIdx].nome_popular || "(sem nome)"}
                    </p>
                    {itensMaterial[novoFornItemIdx].nome_cientifico && (
                      <p className="italic text-muted-foreground">
                        {itensMaterial[novoFornItemIdx].nome_cientifico}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={novoForn.nome}
                    onChange={(e) => setNovoForn((c) => ({ ...c, nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contato</Label>
                  <Input
                    value={novoForn.contato}
                    onChange={(e) => setNovoForn((c) => ({ ...c, contato: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input
                    value={novoForn.cidade}
                    onChange={(e) =>
                      setNovoForn((c) => ({ ...c, cidade: capitalizeWords(e.target.value) }))
                    }
                  />
                </div>
                {novoFornItemIdx !== null && !itemDbInfoByIdx[novoFornItemIdx] && (
                  <label className="flex items-start gap-2 text-xs cursor-pointer pt-1 border-t">
                    <Checkbox
                      checked={novoForn.cadastrarItem}
                      onCheckedChange={(v) =>
                        setNovoForn((c) => ({ ...c, cadastrarItem: !!v }))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-muted-foreground">
                      Cadastrar também esta planta no catálogo, vinculada a este fornecedor.
                      <br />
                      <span className="text-[10px]">
                        Habilita histórico de preços e busca futura.
                      </span>
                    </span>
                  </label>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNovoFornModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="terracota" onClick={salvarNovoFornecedor}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal: cadastro rápido (QuickAdd) */}
          <Dialog
            open={quickAdd.open}
            onOpenChange={(o) =>
              setQuickAdd((s) => (o ? s : { open: false, kind: null, fields: {} }))
            }
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {quickAdd.kind ? QUICK_TITLES[quickAdd.kind] : "Cadastro rápido"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    autoFocus
                    value={quickAdd.fields.nome || ""}
                    onChange={(e) => updateQuickField("nome", e.target.value)}
                  />
                </div>

                {(quickAdd.kind === "fornecedor_insumo" ||
                  quickAdd.kind === "transportadora") && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Contato</Label>
                      <Input
                        value={quickAdd.fields.contato || ""}
                        onChange={(e) => updateQuickField("contato", e.target.value)}
                        placeholder="Telefone / WhatsApp"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cidade</Label>
                      <Input
                        value={quickAdd.fields.cidade || ""}
                        onChange={(e) =>
                          updateQuickField("cidade", capitalizeWords(e.target.value))
                        }
                      />
                    </div>
                  </>
                )}

                {quickAdd.kind === "cargo" && (
                  <div className="space-y-1.5">
                    <Label>Salário mensal (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={quickAdd.fields.salario_mensal || ""}
                      onChange={(e) => updateQuickField("salario_mensal", e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      O salário diário será calculado automaticamente (mensal ÷ 21).
                    </p>
                  </div>
                )}

                {quickAdd.kind === "perfil_markup" && (
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Textarea
                      rows={2}
                      value={quickAdd.fields.descricao || ""}
                      onChange={(e) => updateQuickField("descricao", e.target.value)}
                    />
                  </div>
                )}

                {quickAdd.kind === "local_cliente" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Tipo</Label>
                      <Select
                        value={quickAdd.fields.tipo_pessoa || "fisica"}
                        onValueChange={(v) => updateQuickField("tipo_pessoa", v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fisica">Pessoa Física (Residência)</SelectItem>
                          <SelectItem value="juridica">Pessoa Jurídica (Empresa)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tipo de uso</Label>
                      <Select
                        value={quickAdd.fields.tipo_cliente || ""}
                        onValueChange={(v) => updateQuickField("tipo_cliente", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_CLIENTE.map((tc) => (
                            <SelectItem key={tc.value} value={tc.value}>{tc.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <EnderecoFields
                      value={{
                        cep: quickAdd.fields.cep || "",
                        rua: quickAdd.fields.rua || "",
                        numero: quickAdd.fields.numero || "",
                        bairro: quickAdd.fields.bairro || "",
                        cidade: quickAdd.fields.cidade || "",
                        estado: quickAdd.fields.estado || "",
                      }}
                      onChange={(v) =>
                        setQuickAdd((s) => ({
                          ...s,
                          fields: {
                            ...s.fields,
                            cep: v.cep || "",
                            rua: v.rua || "",
                            numero: v.numero || "",
                            bairro: v.bairro || "",
                            cidade: v.cidade || "",
                            estado: v.estado || "",
                          },
                        }))
                      }
                    />
                  </>
                )}

                <p className="text-xs text-muted-foreground">
                  Cadastro rápido — você pode completar os demais campos depois na tela específica.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setQuickAdd({ open: false, kind: null, fields: {} })}
                  disabled={quickSaving}
                >
                  Cancelar
                </Button>
                <Button variant="terracota" onClick={salvarQuickAdd} disabled={quickSaving}>
                  {quickSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {etapaAtual === 1 && camposFaltando.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <strong>Campos pendentes:</strong> {camposFaltando.join(", ")}
              <span className="ml-1 text-amber-800/80">— você pode avançar e voltar depois.</span>
            </div>
          )}

          {etapaAtual === 2 && itensMaterial.length === 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Nenhum item de memorial cadastrado. Se a proposta não tiver memorial (ex.: desenvolvimento de projeto), você pode pular esta etapa normalmente.
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => irParaEtapa(etapaAtual - 1)}
              disabled={etapaAtual === 1 || processandoPdf}
            >
              <ArrowLeft className="w-4 h-4" />
              Etapa anterior
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleSalvarRascunho}
                disabled={savingFinal || processandoPdf}
              >
                {savingFinal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar rascunho
              </Button>

              <Button
                variant="terracota"
                onClick={handleProxima}
                disabled={etapaAtual === ETAPAS.length || processandoPdf}
              >
                Próxima etapa
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* Versionamento — diálogos */}
      {isEdit && id && (
        <>
          <NovaVersaoDialog
            open={novaVersaoOpen}
            onOpenChange={setNovaVersaoOpen}
            orcamentoId={id}
            codigo={form.codigo || ""}
            snapshotAtual={{
              itensMaterial,
              totais: {
                totalCusto: totaisResumo.totalCusto,
                totalVenda: totaisResumo.totalVenda,
                totalCliente,
                markupMedio: totaisResumo.markupMedio,
                margemBrutaVal: margemBrutaValFinal,
              },
              financeiroPorCategoria: linhasResumo.reduce<Record<string, number>>(
                (acc, l) => ({ ...acc, [l.categoria]: l.venda }),
                {},
              ),
            }}
            onSalvo={() => {
              queryClient.invalidateQueries({ queryKey: ["orcamento-hidratacao", id] });
            }}
          />
          <VersoesDialog
            open={versoesOpen}
            onOpenChange={setVersoesOpen}
            orcamentoId={id}
            codigo={form.codigo || ""}
          />
        </>
      )}

      {/* Resumo agrupado para WhatsApp */}
      <ResumoFornecedoresDialog
        open={resumoOpen}
        onOpenChange={setResumoOpen}
        itens={(() => {
          const list: ResumoItem[] = [];
          itensMaterial.forEach((it, idx) => {
            const sel = fornecedoresSelecionados[idx] || [];
            sel.forEach((fid) => {
              list.push({
                fornecedor_id: fid,
                nome_popular: it.nome_popular,
                nome_cientifico: it.nome_cientifico,
                porte: it.porte,
                unidade: it.unidade,
                quantidade: it.quantidade,
              });
            });
          });
          return list;
        })()}
      />

      {/* Sub-PR 2C — Painel IA Mafe para atualização de cotações */}
      {iaChatTarget && (
        <IAChatPanel
          open={!!iaChatTarget}
          onOpenChange={(o) => !o && setIaChatTarget(null)}
          orcamentoId={id || null}
          fornecedorId={iaChatTarget.fornecedorId}
          fornecedorNome={iaChatTarget.fornecedorNome}
          mercado={iaChatTarget.mercado}
          itens={iaContextoPorFornecedor.get(iaChatTarget.fornecedorId) || []}
          onAplicado={() => refetchHistorico?.()}
        />
      )}

      {/* Importar resposta do fornecedor via IA */}
      {importarFornId && (
        <ImportarRespostaFornecedorDialog
          open={!!importarFornId}
          onOpenChange={(v) => { if (!v) setImportarFornId(null); }}
          fornecedorId={importarFornId}
          fornecedorNome={(fornecedoresLista as any[]).find((f) => f.id === importarFornId)?.nome}
          itens={(() => {
            const arr: { item_id: string; item_tipo: "planta" | "insumo"; nome_popular: string; nome_cientifico?: string | null }[] = [];
            const seen = new Set<string>();
            itensMaterial.forEach((it) => {
              const linhas = (historicoPorItem as Record<string, any[]>)[normNome(it.nome_popular)] || [];
              const r = linhas.find((x: any) => x.fornecedor_id === importarFornId) || linhas[0];
              if (r && !seen.has(r.item_id)) {
                seen.add(r.item_id);
                arr.push({ item_id: r.item_id, item_tipo: r.item_tipo, nome_popular: it.nome_popular, nome_cientifico: it.nome_cientifico });
              }
            });
            return arr;
          })()}
          onAplicado={() => refetchHistorico()}
        />
      )}

      {/* Modal: cadastro obrigatório de mercado */}
      {(() => {
        const RESET = { open: false, fornecedorId: null as string | null, nome: "", valor: "", selecionados: [] as string[], draft: "", confirmarNovo: null as string | null, pendente: null as { itemIdx: number; papel: "principal" | "backup1" | "backup2" } | null };
        const sugestoesMercados = Array.from(
          new Map(
            (fornecedoresLista as any[])
              .flatMap((f) => parseMercados(f.mercado))
              .map((v) => [v.toLowerCase(), v]),
          ).values(),
        ).sort((a, b) => a.localeCompare(b, "pt-BR"));
        const selSet = new Set(mercadoModal.selecionados.map((s) => s.toLowerCase()));
        const disponiveis = sugestoesMercados.filter((s) => !selSet.has(s.toLowerCase()));
        const tryAdicionar = (raw: string) => {
          const v = raw.trim().replace(/\s+/g, " ");
          if (!v) return;
          const titled = v.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
          if (selSet.has(titled.toLowerCase())) return;
          const existe = sugestoesMercados.some((s) => s.toLowerCase() === titled.toLowerCase());
          if (!existe) {
            setMercadoModal((p) => ({ ...p, confirmarNovo: titled }));
            return;
          }
          setMercadoModal((p) => ({ ...p, selecionados: [...p.selecionados, titled], draft: "" }));
        };
        return (
          <>
            <Dialog
              open={mercadoModal.open}
              onOpenChange={(v) => { if (!v) setMercadoModal({ ...RESET }); }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mercado/central obrigatório</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Para adicionar <strong className="text-foreground">{mercadoModal.nome}</strong> ao orçamento, informe a qual mercado ou central ele pertence. Pode pertencer a mais de um.
                </p>

                {mercadoModal.selecionados.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mercadoModal.selecionados.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/30"
                      >
                        {s}
                        <button
                          type="button"
                          aria-label={`Remover ${s}`}
                          onClick={() =>
                            setMercadoModal((p) => ({
                              ...p,
                              selecionados: p.selecionados.filter((x) => x.toLowerCase() !== s.toLowerCase()),
                            }))
                          }
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-1">
                  <Input
                    id="mercado-modal-input"
                    autoFocus
                    value={mercadoModal.draft}
                    onChange={(e) => setMercadoModal((p) => ({ ...p, draft: e.target.value }))}
                    placeholder="Buscar ou criar mercado (ex.: Ceasa, Holambra…)"
                    className="h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (mercadoModal.draft.trim()) tryAdicionar(mercadoModal.draft);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-2"
                    onClick={() => mercadoModal.draft.trim() && tryAdicionar(mercadoModal.draft)}
                    disabled={!mercadoModal.draft.trim()}
                  >
                    +
                  </Button>
                </div>

                {disponiveis.length > 0 && (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">Mercados existentes — clique para adicionar:</div>
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                      {disponiveis
                        .filter((s) =>
                          mercadoModal.draft.trim()
                            ? s.toLowerCase().includes(mercadoModal.draft.trim().toLowerCase())
                            : true,
                        )
                        .map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => tryAdicionar(s)}
                            className="text-[11px] px-2 py-0.5 rounded-md border bg-secondary text-secondary-foreground hover:border-primary/40 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setMercadoModal({ ...RESET })}>
                    Cancelar
                  </Button>
                  <Button
                    variant="terracota"
                    onClick={() => confirmarMercadoModal()}
                    disabled={mercadoModal.selecionados.length === 0}
                  >
                    Salvar e adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={!!mercadoModal.confirmarNovo}
              onOpenChange={(o) => !o && setMercadoModal((p) => ({ ...p, confirmarNovo: null }))}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Criar novo mercado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O mercado <strong>"{mercadoModal.confirmarNovo}"</strong> ainda não existe na base. Deseja criá-lo agora? Ele ficará disponível para todos os fornecedores a partir de então.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const novo = mercadoModal.confirmarNovo;
                      if (!novo) return;
                      setMercadoModal((p) => ({
                        ...p,
                        selecionados: p.selecionados.some((x) => x.toLowerCase() === novo.toLowerCase())
                          ? p.selecionados
                          : [...p.selecionados, novo],
                        draft: "",
                        confirmarNovo: null,
                      }));
                    }}
                  >
                    Sim, criar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        );
      })()}
    </AppLayout>
  );
}
