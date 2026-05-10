import { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FornecedorPopover } from "@/components/orcamento/FornecedorPopover";
import { ResumoFornecedoresDialog, type ResumoItem } from "@/components/orcamento/ResumoFornecedoresDialog";
import { ImportarRespostaFornecedorDialog } from "@/components/orcamento/ImportarRespostaFornecedorDialog";
import { Star, Filter, MessageCircle, Download } from "lucide-react";

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

interface ItemMemorial {
  nome_popular: string;
  nome_cientifico: string | null;
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

const ETAPAS = [
  "Cabeçalho",
  "Memorial",
  "Fornecedores",
  "Cotação",
  "Insumos",
  "MO e Fretes",
  "Resumo",
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
    if (etapaAtual !== 5 || insumosCalculados) return;
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
    cargo_id: string;
    cargo_nome: string;
    qtd: string;
    dias: string;
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
  const [tipoNf, setTipoNf] = useState<"pj" | "cpf">("pj");

  const { data: cargosMo = [] } = useQuery({
    queryKey: ["cargos-mo-ativos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cargos_mo")
        .select("id, nome, salario_diario")
        .eq("ativo", true)
        .order("nome");
      if (error) {
        console.warn("[cargos_mo] erro:", error);
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
      { cargo_id: "", cargo_nome: "", qtd: "1", dias: "", salario_diario: "0" },
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

  const [markupsCategoria, setMarkupsCategoria] = useState<Record<string, number>>({});
  const [markupModal, setMarkupModal] = useState<{
    open: boolean;
    categoria: string;
    anterior: number;
    novo: number;
    motivo: string;
  }>({ open: false, categoria: "", anterior: 0, novo: 0, motivo: "" });
  const [versoesPendentes, setVersoesPendentes] = useState<
    Array<{ campo_alterado: string; valor_anterior: string; valor_novo: string; motivo: string }>
  >([]);

  const [comissaoOn, setComissaoOn] = useState(false);
  const [comissaoTipo, setComissaoTipo] = useState<"vendas" | "indicacao">("vendas");
  const [comissaoPct, setComissaoPct] = useState<string>("0");
  const [comissaoBeneficiario, setComissaoBeneficiario] = useState("");
  const [comissaoAberta, setComissaoAberta] = useState(false);

  const [margemNegPct, setMargemNegPct] = useState<number>(0);

  const [aprovarModal, setAprovarModal] = useState<{ open: boolean; valor: string }>({
    open: false,
    valor: "",
  });
  const [naoAprovarModal, setNaoAprovarModal] = useState<{ open: boolean; motivo: string }>({
    open: false,
    motivo: "",
  });
  const [savingFinal, setSavingFinal] = useState(false);

  useEffect(() => {
    if (etapaAtual !== 7) return;
    setMarkupsCategoria((prev) => {
      const next = { ...prev };
      CATEGORIAS_RESUMO.forEach((c) => {
        if (next[c] === undefined) {
          next[c] = c === "Fretes" ? 0 : 100;
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapaAtual]);

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

  const impostoProdutos = (totalCustoPlantas + totalCustoInsumos) * 0.135;

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
  const totalCliente = totaisResumo.totalVenda - valorComissao;
  const descontoMaximo = totalCliente * (margemNegPct / 100);
  const valorMinimo = totalCliente - descontoMaximo;
  const areaM2 = Number(form.area_m2) || 0;
  const custoPorM2 = areaM2 > 0 ? totaisResumo.totalCusto / areaM2 : 0;
  const margemBrutaPctTotal =
    totaisResumo.totalVenda > 0
      ? (totaisResumo.margemBrutaVal / totaisResumo.totalVenda) * 100
      : 0;

  const abrirEdicaoMarkup = (categoria: string) => {
    setMarkupModal({
      open: true,
      categoria,
      anterior: markupsCategoria[categoria] ?? 0,
      novo: markupsCategoria[categoria] ?? 0,
      motivo: "",
    });
  };

  const confirmarMarkup = () => {
    if (!markupModal.motivo.trim()) {
      toast({ title: "Informe o motivo da alteração", variant: "destructive" });
      return;
    }
    setMarkupsCategoria((p) => ({ ...p, [markupModal.categoria]: markupModal.novo }));
    setVersoesPendentes((p) => [
      ...p,
      {
        campo_alterado: `markup_${markupModal.categoria}`,
        valor_anterior: String(markupModal.anterior),
        valor_novo: String(markupModal.novo),
        motivo: markupModal.motivo,
      },
    ]);
    setMarkupModal((m) => ({ ...m, open: false }));
  };

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
        tipo_nf: tipoNf,
        margem_negociacao_pct: margemNegPct,
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
      for (const t of tabelas) {
        await (supabase as any).from(t).delete().eq("orcamento_id", orcId);
      }
      const { data: itensExistentes } = await (supabase as any)
        .from("orcamento_itens")
        .select("id")
        .eq("orcamento_id", orcId);
      const idsItensExist = (itensExistentes || []).map((r: any) => r.id);
      if (idsItensExist.length > 0) {
        await (supabase as any).from("orcamento_cotacoes").delete().in("item_id", idsItensExist);
        await (supabase as any).from("orcamento_itens").delete().eq("orcamento_id", orcId);
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
        const venda = custoUnit * (1 + markupCat / 100);

        const { data: itemRow, error: iErr } = await (supabase as any)
          .from("orcamento_itens")
          .insert({
            orcamento_id: orcId,
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
            markup_pct: markupCat,
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
        });
      }

      for (const f of fretes) {
        const qtd = Math.ceil((Number(f.qtd_esperada) || 0) * (1 + (Number(f.margem) || 0) / 100));
        await (supabase as any).from("orcamento_fretes").insert({
          orcamento_id: orcId,
          transportador: f.transportador_nome || null,
          descricao_percurso: f.percurso || null,
          valor_unitario: Number(f.valor_unitario) || 0,
          qtd_esperada: Number(f.qtd_esperada) || 0,
          margem_seguranca_pct: Number(f.margem) || 0,
          qtd_orcar: qtd,
          valor_total: qtd * (Number(f.valor_unitario) || 0),
        });
      }

      for (const m of moLinhas) {
        const bruto =
          (Number(m.qtd) || 0) * (Number(m.dias) || 0) * (Number(m.salario_diario) || 0);
        const aliq = (aliquotaMes || 0) + (tipoNf === "pj" ? 11 : 0);
        const denom = (100 - aliq) / 100;
        const valNf = denom > 0 ? bruto / denom : 0;
        await (supabase as any).from("orcamento_mo").insert({
          orcamento_id: orcId,
          cargo_id: m.cargo_id || null,
          qtd_funcionarios: Number(m.qtd) || 0,
          qtd_dias: Number(m.dias) || 0,
          salario_diario: Number(m.salario_diario) || 0,
          custo_total: bruto,
          aliquota_mes_pct: aliquotaMes,
          tipo_nf: tipoNf,
          valor_com_imposto: valNf,
        });
      }

      for (const t of transporte) {
        const sub =
          (Number(t.valor_km) || 0) * (Number(t.dias) || 0) * (Number(t.km) || 0);
        await (supabase as any).from("orcamento_transporte").insert({
          orcamento_id: orcId,
          tipo: t.tipo,
          valor_km: Number(t.valor_km) || 0,
          qtd_dias: Number(t.dias) || 0,
          qtd_km: Number(t.km) || 0,
          subtotal: sub,
        });
      }

      for (const c of custosIndiretos) {
        const total = (Number(c.valor_unitario) || 0) * (Number(c.quantidade) || 0);
        await (supabase as any).from("orcamento_custos_indiretos").insert({
          orcamento_id: orcId,
          tipo: c.tipo,
          descricao: c.descricao || null,
          valor_unitario: Number(c.valor_unitario) || 0,
          quantidade: Number(c.quantidade) || 0,
          total,
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
        editavel: false,
      });
      if (form.cliente_id) {
        await (supabase as any)
          .from("crm_cards")
          .update({ status: "Aprovado" })
          .eq("cliente_id", form.cliente_id);
      }
      setAprovarModal({ open: false, valor: "" });
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
    queryKey: ["colaboradores-ativos-orc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, user_id")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
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
    }
  }, [orcamento, tipos]);

  // Geração automática do código
  const handleTipoPropostaChange = async (tipoId: string) => {
    const tipo = (tipos as TipoProposta[]).find((t) => t.id === tipoId);
    if (!tipo) return;
    const sigla = tipo.sigla;
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
      } else {
        const { data, error } = await (supabase as any)
          .from("orcamentos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }
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
  // Salva o orçamento completo (cabeçalho + itens + cotações) automaticamente
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
    if (!camposObrigatoriosOk) return;
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
    tipoNf,
    margemNegPct,
  ]);

  const itensBaixaConfianca = useMemo(
    () => itensMaterial.filter((i) => i.confianca === "baixa").length,
    [itensMaterial],
  );

  // === ETAPA 3 — Histórico de fornecedores por item ===
  const nomesItens = useMemo(
    () => Array.from(new Set(itensMaterial.map((i) => i.nome_popular.trim()).filter(Boolean))),
    [itensMaterial],
  );

  const { data: historicoPorItem = {}, refetch: refetchHistorico } = useQuery({
    queryKey: ["historico-fornecedores-orc", nomesItens],
    enabled: etapaAtual === 3 && nomesItens.length > 0,
    queryFn: async () => {
      // Normalização: lowercase + remove acentos + colapsa espaços
      const norm = (s: string) =>
        (s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const nomesNorm = new Set(nomesItens.map(norm).filter(Boolean));
      if (nomesNorm.size === 0) return {} as Record<string, any[]>;

      // 1) Buscar TODAS as plantas e insumos (id + nome) e cruzar em memória
      //    (evita falha de match exato por acentos/maiúsculas)
      const [{ data: plantas, error: pErr }, { data: insumos, error: iErr }] =
        await Promise.all([
          (supabase as any).from("plantas").select("id, nome_popular"),
          (supabase as any).from("insumos").select("id, nome"),
        ]);
      if (pErr) throw pErr;
      if (iErr) throw iErr;

      const itemIdToKey = new Map<string, { tipo: "planta" | "insumo"; key: string }>();
      (plantas || []).forEach((p: any) => {
        const k = norm(p.nome_popular);
        if (k && nomesNorm.has(k)) itemIdToKey.set(p.id, { tipo: "planta", key: k });
      });
      (insumos || []).forEach((i: any) => {
        const k = norm(i.nome);
        if (k && nomesNorm.has(k)) itemIdToKey.set(i.id, { tipo: "insumo", key: k });
      });

      const allIds = Array.from(itemIdToKey.keys());
      if (allIds.length === 0) return {} as Record<string, any[]>;

      // 2) Buscar histórico de preços (planta + insumo) em uma única query
      const { data: hist, error: hErr } = await (supabase as any)
        .from("historico_precos")
        .select(
          "id, item_id, item_tipo, preco, porte, unidade, data_orcamento, fornecedor_id, fornecedores(id, nome, mercado, cidade, telefone, whatsapp)",
        )
        .in("item_id", allIds)
        .order("data_orcamento", { ascending: false });
      if (hErr) throw hErr;

      // 3) Buscar avaliações dos fornecedores para os mesmos itens
      const { data: avals } = await (supabase as any)
        .from("fornecedor_avaliacoes")
        .select("fornecedor_id, item_id, item_tipo, nota")
        .in("item_id", allIds);
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
      for (const row of hist || []) {
        const ref = itemIdToKey.get(row.item_id);
        if (!ref) continue;
        if (row.item_tipo && row.item_tipo !== ref.tipo) continue;
        const key = ref.key;
        if (!map[key]) { map[key] = []; seen[key] = {}; }
        const av = avalMap[avalKey(row.fornecedor_id, row.item_id)];
        const enriched = { ...row, nota_media: av ? av.soma / av.n : null, nota_qtd: av?.n || 0 };
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

  const fornecedoresDoItem = (item: ItemMemorial) =>
    (historicoPorItem as Record<string, any[]>)[normNome(item.nome_popular)] || [];

  // Mapeia ItemMemorial (por idx) -> { item_id, item_tipo } usando histórico carregado
  const itemDbInfoByIdx = useMemo(() => {
    const map: Record<number, { item_id: string; item_tipo: "planta" | "insumo" }> = {};
    itensMaterial.forEach((it, idx) => {
      const rows = (historicoPorItem as Record<string, any[]>)[normNome(it.nome_popular)] || [];
      const r = rows[0];
      if (r?.item_id && r?.item_tipo) {
        map[idx] = { item_id: r.item_id, item_tipo: r.item_tipo };
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensMaterial, JSON.stringify(historicoPorItem)]);

  // Auto-grava histórico de preços quando o usuário ajusta o valor cotado na Etapa 4
  const lastSavedPrecoRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (etapaAtual !== 4) return;
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
  type QuickKind = "cliente" | "fornecedor_insumo" | "cargo" | "transportadora" | "perfil_markup";
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
    local_endereco: "Local / Endereço",
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

  const handleProxima = () => irParaEtapa(etapaAtual + 1);

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

  const extrairItens = async () => {
    if (!pdfFile) return;
    setProcessandoPdf(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", pdfFile);
      const { data, error } = await (supabase.functions as any).invoke("ler-memorial-pdf", {
        body: fd,
      });
      if (error) throw error;
      const arr = Array.isArray(data?.itens) ? data.itens : [];
      const normalizados: ItemMemorial[] = arr.map((it: any) => ({
        nome_popular: String(it?.nome_popular ?? "").trim(),
        nome_cientifico: it?.nome_cientifico ?? null,
        porte: String(it?.porte ?? "").trim(),
        quantidade: Number(it?.quantidade ?? 0) || 0,
        unidade: String(it?.unidade ?? "UNID").toUpperCase(),
        categoria: String(it?.categoria ?? CATEGORIAS_ITEM[0]),
        confianca:
          ["alta", "media", "baixa"].includes(String(it?.confianca))
            ? (it.confianca as ItemMemorial["confianca"])
            : "media",
      }));
      setItensMaterial(normalizados);
      setPdfCarregado(true);
      toast({ title: `${normalizados.length} itens extraídos` });
    } catch (e: any) {
      toast({
        title: "Erro ao extrair itens",
        description: e?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setProcessandoPdf(false);
    }
  };

  const extrairItensTexto = async () => {
    if (!memorialTexto.trim()) {
      toast({ title: "Cole o texto do memorial primeiro", variant: "destructive" });
      return;
    }
    setProcessandoPdf(true);
    try {
      const { data, error } = await (supabase.functions as any).invoke("ler-memorial-texto", {
        body: { texto: memorialTexto },
      });
      if (error) throw error;
      const arr = Array.isArray(data?.itens) ? data.itens : [];
      const normalizados: ItemMemorial[] = arr.map((it: any) => ({
        nome_popular: String(it?.nome_popular ?? "").trim(),
        nome_cientifico: it?.nome_cientifico ?? null,
        porte: String(it?.porte ?? "").trim(),
        quantidade: Number(it?.quantidade ?? 0) || 0,
        unidade: String(it?.unidade ?? "UNID").toUpperCase(),
        categoria: String(it?.categoria ?? CATEGORIAS_ITEM[0]),
        confianca:
          ["alta", "media", "baixa"].includes(String(it?.confianca))
            ? (it.confianca as ItemMemorial["confianca"])
            : "media",
      }));
      setItensMaterial(normalizados);
      setPdfCarregado(true);
      toast({ title: `${normalizados.length} itens extraídos` });
    } catch (e: any) {
      toast({
        title: "Erro ao interpretar texto",
        description: e?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setProcessandoPdf(false);
    }
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
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
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
                </p>
              </div>
            </div>
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

          {/* Etapa 1 - Cabeçalho */}
          {etapaAtual === 1 && (
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="font-display text-xl text-foreground">Cabeçalho</h2>
                <p className="text-sm text-muted-foreground">Dados básicos do orçamento</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COLUNA ESQUERDA */}
                <div className="space-y-4">
                  {/* Tipo de Proposta */}
                  <div className="space-y-2">
                    <Label>Tipo de Proposta<Req /></Label>
                    <Select value={form.tipo_proposta_id} onValueChange={handleTipoPropostaChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(tipos as TipoProposta[]).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.sigla} — {t.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label>Cliente<Req /></Label>
                    <div className="flex gap-2">
                      <Select
                        value={form.cliente_id}
                        onValueChange={(v) => setForm((c) => ({ ...c, cliente_id: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                  </div>

                  {/* Local / Endereço */}
                  <div className="space-y-2">
                    <Label>Local / Endereço<Req /></Label>
                    <Textarea
                      rows={3}
                      value={form.local_endereco}
                      onChange={(e) => setForm((c) => ({ ...c, local_endereco: e.target.value }))}
                    />
                  </div>

                  {/* Tipo de cliente - toggles */}
                  <div className="space-y-2">
                    <Label>Tipo de cliente<Req /></Label>
                    <div className="flex flex-wrap gap-2">
                      {TIPOS_CLIENTE.map((tc) => {
                        const ativo = form.tipo_cliente === tc.value;
                        return (
                          <button
                            key={tc.value}
                            type="button"
                            onClick={() => setForm((c) => ({ ...c, tipo_cliente: tc.value }))}
                            className={cn(
                              "px-3 py-1.5 rounded-md border text-sm transition-colors",
                              ativo
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-foreground border-border hover:bg-muted"
                            )}
                          >
                            {tc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cidade / Estado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Cidade<Req /></Label>
                      <Input
                        value={form.cidade}
                        onChange={(e) =>
                          setForm((c) => ({ ...c, cidade: capitalizeWords(e.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado<Req /></Label>
                      <Select
                        value={form.estado}
                        onValueChange={(v) => setForm((c) => ({ ...c, estado: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {UFS.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA */}
                <div className="space-y-4">
                  {/* Área */}
                  <div className="space-y-2">
                    <Label>Área total (m²)<Req /></Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.area_m2}
                      onChange={(e) => setForm((c) => ({ ...c, area_m2: e.target.value }))}
                    />
                  </div>

                  {/* Perfil de markup (opcional) */}
                  <div className="space-y-2">
                    <Label>
                      Perfil de markup{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        (opcional — pode definir depois)
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

                  {/* Prazo validade */}
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
                      O prazo conta a partir da data de envio
                    </p>
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

                  {/* Data envio */}
                  <div className="space-y-2">
                    <Label>Data de envio ao cliente</Label>
                    <Input
                      type="date"
                      value={form.data_envio}
                      onChange={(e) => setForm((c) => ({ ...c, data_envio: e.target.value }))}
                    />
                  </div>

                  {/* Obs interna */}
                  <div className="space-y-2">
                    <Label>Observação interna (não aparece na proposta)</Label>
                    <Textarea
                      rows={3}
                      value={form.obs_interna}
                      onChange={(e) => setForm((c) => ({ ...c, obs_interna: e.target.value }))}
                    />
                  </div>

                  {/* Obs proposta */}
                  <div className="space-y-2">
                    <Label>Observação para o cliente (aparece na proposta)</Label>
                    <Textarea
                      rows={3}
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

              {/* Loading */}
              {processandoPdf && (
                <div className="flex flex-col items-center justify-center gap-3 py-8 border rounded-lg bg-muted/30">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-foreground font-medium">Mafe está lendo o memorial...</p>
                </div>
              )}

              {/* Tabela */}
              {pdfCarregado && itensMaterial.length > 0 && (
                <div className="space-y-3">
                  {itensBaixaConfianca > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-destructive text-destructive-foreground font-semibold">
                        {itensBaixaConfianca}
                      </span>
                      <span className="text-foreground">
                        ⚠️ {itensBaixaConfianca === 1 ? "item precisa" : "itens precisam"} de
                        verificação — revise antes de continuar
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Role horizontalmente para ver todas as colunas. As colunas têm largura mínima para legibilidade.
                  </p>
                  <div className="border rounded-lg overflow-x-auto max-w-full">
                    <table className="text-sm" style={{ minWidth: 1280 }}>
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 text-left" style={{ width: 40 }}>#</th>
                          <th className="px-2 py-2 text-left" style={{ minWidth: 240 }}>Nome Popular</th>
                          <th className="px-2 py-2 text-left" style={{ minWidth: 260 }}>Nome Científico</th>
                          <th className="px-2 py-2 text-left" style={{ minWidth: 200 }}>Porte</th>
                          <th className="px-2 py-2 text-left" style={{ width: 100 }}>Qtd</th>
                          <th className="px-2 py-2 text-left" style={{ width: 130 }}>Unidade</th>
                          <th className="px-2 py-2 text-left" style={{ minWidth: 200 }}>Categoria</th>
                          <th className="px-2 py-2 text-center" style={{ width: 90 }}>Confiança</th>
                          <th className="px-2 py-2 text-center" style={{ width: 70 }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensMaterial.map((it, idx) => (
                          <tr
                            key={idx}
                            data-memorial-row
                            className={cn(
                              "border-t",
                              it.confianca === "baixa" && "bg-yellow-50",
                            )}
                          >
                            <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                            <td className="px-2 py-1">
                              <Input
                                data-field="nome_popular"
                                value={it.nome_popular}
                                onChange={(e) =>
                                  updateItem(idx, { nome_popular: e.target.value })
                                }
                                className="h-8"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                value={it.nome_cientifico ?? ""}
                                onChange={(e) =>
                                  updateItem(idx, {
                                    nome_cientifico: e.target.value || null,
                                  })
                                }
                                className="h-8 italic"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                value={it.porte}
                                onChange={(e) => updateItem(idx, { porte: e.target.value })}
                                className="h-8"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={it.quantidade}
                                onChange={(e) =>
                                  updateItem(idx, {
                                    quantidade: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-8"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <Select
                                value={it.unidade}
                                onValueChange={(v) => updateItem(idx, { unidade: v })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIDADES_ITEM.map((u) => (
                                    <SelectItem key={u} value={u}>
                                      {u}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1">
                              <Select
                                value={it.categoria}
                                onValueChange={(v) => updateItem(idx, { categoria: v })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIAS_ITEM.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1 text-center">
                              {it.confianca === "alta" && (
                                <Check className="w-4 h-4 text-primary inline" />
                              )}
                              {it.confianca === "media" && (
                                <Minus className="w-4 h-4 text-muted-foreground inline" />
                              )}
                              {it.confianca === "baixa" && (
                                <AlertTriangle className="w-4 h-4 text-yellow-600 inline" />
                              )}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeItem(idx)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button variant="outline" onClick={addItem}>
                    <Plus className="w-4 h-4" />
                    Adicionar item
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Etapa 3 — Seleção de Fornecedores */}
          {etapaAtual === 3 && (
            <div className="space-y-4">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border rounded-lg p-3 flex flex-wrap gap-3 text-sm">
                <span className="text-destructive font-medium">
                  {resumoFornecedores.semForn} sem fornecedor
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-orange-600 font-medium">
                  {resumoFornecedores.risco} com risco alto
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-primary font-medium">
                  {resumoFornecedores.ok} OK
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
                const fornsBruto = fornecedoresDoItem(item);
                const selecionados = fornecedoresSelecionados[idx] || [];

                // Filtros do item
                const fMerc = filtroMercado[idx] || "todos";
                const fPorte = filtroPorte[idx] || "todos";
                const ord = ordemFornec[idx] || "preco";

                const mercadosDisp: string[] = Array.from(
                  new Set(
                    fornsBruto.flatMap((r: any) => [r.fornecedores?.mercado].filter(Boolean)),
                  ),
                );
                const portesDisp: string[] = Array.from(
                  new Set(
                    fornsBruto.flatMap((r: any) => [r.porte, ...(r.outros_portes || []).map((o: any) => o.porte)].filter(Boolean)),
                  ),
                );

                const fornsFiltrados = fornsBruto
                  .filter((r: any) => fMerc === "todos" || (r.fornecedores?.mercado || "—sem—") === fMerc || !r.fornecedores?.mercado)
                  .filter((r: any) => {
                    if (fPorte === "todos") return true;
                    if (r.porte === fPorte) return true;
                    return (r.outros_portes || []).some((o: any) => o.porte === fPorte);
                  })
                  .slice()
                  .sort((a: any, b: any) => {
                    if (ord === "preco") return (Number(a.preco) || Infinity) - (Number(b.preco) || Infinity);
                    if (ord === "data") return new Date(b.data_orcamento || 0).getTime() - new Date(a.data_orcamento || 0).getTime();
                    if (ord === "nota") return (b.nota_media || 0) - (a.nota_media || 0);
                    if (ord === "porte" && item.porte) {
                      // mais próximo do porte solicitado (numérico simples)
                      const num = (s: string) => parseFloat((s || "").replace(",", ".").replace(/[^0-9.]/g, "")) || 0;
                      const tgt = num(item.porte);
                      return Math.abs(num(a.porte || "") - tgt) - Math.abs(num(b.porte || "") - tgt);
                    }
                    return 0;
                  });

                const total = Math.max(selecionados.length, fornsBruto.length);
                let badge = { cls: "bg-primary/15 text-primary", label: "OK" };
                if (total === 0) badge = { cls: "bg-destructive/15 text-destructive", label: "⚠️ Sem fornecedor" };
                else if (total === 1) badge = { cls: "bg-orange-100 text-orange-700", label: "⚠️ Risco alto" };
                else if (total === 2) badge = { cls: "bg-yellow-100 text-yellow-700", label: "Atenção" };

                return (
                  <Card key={idx} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.nome_popular || "(sem nome)"}
                          {item.nome_cientifico && (
                            <span className="ml-2 italic font-normal text-muted-foreground">
                              {item.nome_cientifico}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.porte && <>Porte solicitado: <strong>{item.porte}</strong> · </>}
                          {item.quantidade} {item.unidade}
                        </p>
                      </div>
                      <span className={cn("px-2 py-1 rounded-md text-xs font-medium", badge.cls)}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Filtros */}
                    {fornsBruto.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center text-xs border-t border-b py-2">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                        <Select value={ord} onValueChange={(v) => setOrdemFornec((p) => ({ ...p, [idx]: v as OrdemForn }))}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preco">Menor preço</SelectItem>
                            <SelectItem value="data">Cotação recente</SelectItem>
                            <SelectItem value="porte">Porte mais próximo</SelectItem>
                            <SelectItem value="nota">Melhor nota</SelectItem>
                          </SelectContent>
                        </Select>

                        {mercadosDisp.length > 0 && (
                          <Select value={fMerc} onValueChange={(v) => setFiltroMercado((p) => ({ ...p, [idx]: v }))}>
                            <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Mercado" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos mercados</SelectItem>
                              {mercadosDisp.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}

                        {portesDisp.length > 0 && (
                          <Select value={fPorte} onValueChange={(v) => setFiltroPorte((p) => ({ ...p, [idx]: v }))}>
                            <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Porte" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos portes</SelectItem>
                              {portesDisp.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}

                        <span className="text-muted-foreground ml-auto">
                          {fornsFiltrados.length}/{fornsBruto.length}
                        </span>
                      </div>
                    )}

                    {fornsFiltrados.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        {fornsBruto.length === 0
                          ? "Nenhum fornecedor cadastrado para este item."
                          : "Nenhum fornecedor com os filtros aplicados."}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {fornsFiltrados.map((row: any) => {
                          const f = row.fornecedores || {};
                          const checked = selecionados.includes(row.fornecedor_id);
                          const porteDiv = item.porte && row.porte && row.porte.trim().toLowerCase() !== item.porte.trim().toLowerCase();
                          return (
                            <div
                              key={row.fornecedor_id}
                              className={cn(
                                "flex items-start gap-3 p-2 border rounded-md transition-colors",
                                checked ? "border-primary bg-primary/5" : "hover:bg-muted/30",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleFornecedor(idx, row.fornecedor_id)}
                                className="mt-1 cursor-pointer"
                              />
                              <div className="flex-1 text-sm">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-foreground">{f.nome || "Fornecedor"}</p>
                                  {f.mercado && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{f.mercado}</span>
                                  )}
                                  {row.nota_media != null && (
                                    <span className="text-[10px] flex items-center gap-0.5 text-amber-600">
                                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                      {row.nota_media.toFixed(1)} ({row.nota_qtd})
                                    </span>
                                  )}
                                  <FornecedorPopover
                                    fornecedorId={row.fornecedor_id}
                                    nome={f.nome}
                                    itemId={row.item_id}
                                    itemTipo={row.item_tipo}
                                    onAvaliacaoSalva={() => refetchHistorico?.()}
                                  />
                                </div>
                                <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                                  {row.porte && (
                                    <span className={cn(porteDiv && "text-yellow-700 font-medium")}>
                                      Porte: <strong>{row.porte}</strong>{porteDiv ? " ⚠" : ""}
                                    </span>
                                  )}
                                  {row.preco != null && (
                                    <span>R$ <strong className="text-foreground">{Number(row.preco).toFixed(2)}</strong></span>
                                  )}
                                  {row.data_orcamento && (
                                    <span>
                                      {new Date(row.data_orcamento).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                    </span>
                                  )}
                                  {row.unidade && <span>/ {row.unidade}</span>}
                                </div>
                                {row.outros_portes?.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {row.outros_portes.map((o: any, i: number) => (
                                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border">
                                        {o.porte} · R$ {Number(o.preco).toFixed(2)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => setImportarFornId(row.fornecedor_id)}
                                title="Importar resposta deste fornecedor"
                              >
                                <Download className="w-3 h-3" /> Resposta
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirNovoFornecedor(idx)}
                    >
                      <UserPlus className="w-4 h-4" />
                      Adicionar fornecedor não cadastrado
                    </Button>
                  </Card>
                );
              })}

              {/* Ação global: gerar resumo agrupado por fornecedor */}
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
            </div>
          )}

          {etapaAtual === 4 && (
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

          {etapaAtual === 5 && (
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

          {etapaAtual === 6 && (
            <div className="space-y-6 pb-24">
              {/* Seção A — MÃO DE OBRA */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg text-foreground">Mão de Obra Prevista</h2>
                    <p className="text-xs text-muted-foreground">
                      Adicione cargos previstos para execução do projeto.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addMoLinha}>
                    <Plus className="w-4 h-4" />
                    Adicionar cargo
                  </Button>
                </div>

                {moLinhas.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum cargo adicionado.</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs">
                        <tr>
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
                      <Label className="text-xs">Alíquota do mês (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={aliquotaMes}
                        onChange={(e) => setAliquotaMes(Number(e.target.value) || 0)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Informar conforme orientação da contabilidade.
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
              </Card>

              {/* Seção B — FRETES */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg text-foreground">Fretes do Projeto</h2>
                    <p className="text-xs text-muted-foreground">
                      Todos os fretes são repassados ao cliente.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addFrete}>
                    <Plus className="w-4 h-4" />
                    Adicionar frete
                  </Button>
                </div>

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
              </Card>

              {/* Seção C — TRANSPORTE DA EQUIPE */}
              <Card className="p-4 space-y-3">
                <div>
                  <h2 className="font-display text-lg text-foreground">Transporte da Equipe</h2>
                  <p className="text-xs text-muted-foreground">
                    Custos de deslocamento da equipe e acompanhamento técnico.
                  </p>
                </div>
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
              </Card>

              {/* Seção D — CUSTOS INDIRETOS */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg text-foreground">Custos Indiretos</h2>
                    <p className="text-xs text-muted-foreground">
                      Refeições, escritório e demais despesas indiretas.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addIndireto}>
                    <Plus className="w-4 h-4" />
                    Adicionar custo
                  </Button>
                </div>

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
                                    updateIndireto(idx, {
                                      tipo: v,
                                      valor_unitario:
                                        ref && ref.padrao > 0 && !c.valor_unitario
                                          ? String(ref.padrao)
                                          : c.valor_unitario,
                                    });
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
              </Card>

              {/* Resumo sticky */}
              <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-primary/20">
                <div className="text-sm flex flex-wrap gap-x-5 gap-y-1">
                  <span>
                    MO c/ imposto: <strong>{fmtBRL(valorNfMo)}</strong>
                  </span>
                  <span>
                    Fretes: <strong>{fmtBRL(totalFretes)}</strong>
                  </span>
                  <span>
                    Transporte: <strong>{fmtBRL(totalTransporte)}</strong>
                  </span>
                  <span>
                    Indiretos: <strong>{fmtBRL(totalIndiretos)}</strong>
                  </span>
                  <span className="ml-auto">
                    Total etapa: <strong className="text-primary">{fmtBRL(totalEtapa6)}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Etapa 7 (placeholder) */}
          {etapaAtual === 7 && (
            <div className="space-y-6 pb-32">
              {/* Perfil de Markup (opcional) */}
              <Card className="p-4">
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label>Perfil de markup</Label>
                    <p className="text-xs text-muted-foreground">
                      Selecione um perfil para aplicar markups padrão por categoria, ou edite manualmente abaixo.
                    </p>
                  </div>
                  <div className="flex gap-2 md:w-80">
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
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Coluna esquerda — Tabela por categoria */}
                <Card className="p-4 lg:col-span-2 space-y-3">
                  <div>
                    <h2 className="font-display text-lg text-foreground">Resumo por categoria</h2>
                    <p className="text-xs text-muted-foreground">
                      Edite o markup de cada categoria. Alterações exigem motivo.
                    </p>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs">
                        <tr>
                          <th className="text-left p-2">Categoria</th>
                          <th className="text-right p-2 w-32">Custo</th>
                          <th className="text-right p-2 w-28">Markup %</th>
                          <th className="text-right p-2 w-32">Venda</th>
                          <th className="text-right p-2 w-28">Margem %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhasResumo.map((l) => (
                          <tr key={l.categoria} className="border-t">
                            <td className="p-2 font-medium">{l.categoria}</td>
                            <td className="p-2 text-right">{fmtBRL(l.custo)}</td>
                            <td className="p-2 text-right">
                              <button
                                className="text-primary underline-offset-2 hover:underline"
                                onClick={() => abrirEdicaoMarkup(l.categoria)}
                              >
                                {l.markup.toFixed(1)}%
                              </button>
                            </td>
                            <td className="p-2 text-right">{fmtBRL(l.venda)}</td>
                            <td className="p-2 text-right">{l.margemBruta.toFixed(1)}%</td>
                          </tr>
                        ))}
                        <tr className="border-t bg-muted/30 font-semibold">
                          <td className="p-2">Imposto produtos (13.5%)</td>
                          <td className="p-2 text-right">—</td>
                          <td className="p-2 text-right">—</td>
                          <td className="p-2 text-right">{fmtBRL(impostoProdutos)}</td>
                          <td className="p-2 text-right">—</td>
                        </tr>
                        <tr className="border-t bg-primary/5 font-bold">
                          <td className="p-2">Totais</td>
                          <td className="p-2 text-right">{fmtBRL(totaisResumo.totalCusto)}</td>
                          <td className="p-2 text-right">{totaisResumo.markupMedio.toFixed(1)}%</td>
                          <td className="p-2 text-right">{fmtBRL(totaisResumo.totalVenda)}</td>
                          <td className="p-2 text-right">{margemBrutaPctTotal.toFixed(1)}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Coluna direita — Cards de indicadores */}
                <div className="space-y-3">
                  <Card className="p-4 bg-primary/10 border-primary/30">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total ao Cliente
                    </p>
                    <p className="font-display text-3xl text-primary mt-1">
                      {fmtBRL(totalCliente)}
                    </p>
                  </Card>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Custo Total</p>
                      <p className="font-medium">{fmtBRL(totaisResumo.totalCusto)}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Margem Bruta</p>
                      <p className="font-medium">{fmtBRL(totaisResumo.margemBrutaVal)}</p>
                      <p className="text-xs text-muted-foreground">
                        {margemBrutaPctTotal.toFixed(1)}%
                      </p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Impostos</p>
                      <p className="font-medium">{fmtBRL(impostoProdutos)}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-[11px] uppercase text-muted-foreground">Custo / m²</p>
                      <p className="font-medium">
                        {areaM2 > 0 ? fmtBRL(custoPorM2) : "—"}
                      </p>
                    </Card>
                    <Card className="p-3 col-span-2">
                      <p className="text-[11px] uppercase text-muted-foreground">
                        Markup médio ponderado
                      </p>
                      <p className="font-medium">{totaisResumo.markupMedio.toFixed(1)}%</p>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Bloco Comissão */}
              <Card className="p-4">
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setComissaoAberta((v) => !v)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-base">Comissão</h3>
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
                      Valor calculado: <strong className="text-foreground">{fmtBRL(valorComissao)}</strong>
                    </div>
                  </div>
                )}
              </Card>

              {/* Bloco margem de negociação */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base">Margem de negociação disponível</h3>
                  <span className="text-sm font-medium">{margemNegPct}%</span>
                </div>
                <Slider
                  value={[margemNegPct]}
                  min={0}
                  max={30}
                  step={1}
                  onValueChange={(v) => setMargemNegPct(v[0])}
                />
                <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                  <span>
                    Desconto máximo: <strong className="text-foreground">{fmtBRL(descontoMaximo)}</strong>
                  </span>
                  <span>
                    Valor mínimo aceitável: <strong className="text-foreground">{fmtBRL(valorMinimo)}</strong>
                  </span>
                </div>
              </Card>

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
                    setAprovarModal({ open: true, valor: totalCliente.toFixed(2) })
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

          {/* Modal: editar markup */}
          <Dialog
            open={markupModal.open}
            onOpenChange={(o) => setMarkupModal((m) => ({ ...m, open: o }))}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar markup — {markupModal.categoria}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Markup anterior</Label>
                    <Input value={`${markupModal.anterior}%`} readOnly className="bg-muted/40" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Novo markup (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={markupModal.novo}
                      onChange={(e) =>
                        setMarkupModal((m) => ({ ...m, novo: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Motivo da alteração *</Label>
                  <Textarea
                    value={markupModal.motivo}
                    onChange={(e) => setMarkupModal((m) => ({ ...m, motivo: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setMarkupModal((m) => ({ ...m, open: false }))}
                >
                  Cancelar
                </Button>
                <Button variant="terracota" onClick={confirmarMarkup}>
                  Salvar alteração
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                <p className="text-sm text-muted-foreground">
                  Tem certeza? Esta ação não pode ser desfeita.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAprovarModal({ open: false, valor: "" })}
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
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || processandoPdf}
              >
                {saveMutation.isPending ? (
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
    </AppLayout>
  );
}
