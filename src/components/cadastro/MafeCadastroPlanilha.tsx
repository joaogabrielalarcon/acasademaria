// Entrada por planilha (xlsx/csv) para o chat de cadastro da Mafe.
// Reutiliza a biblioteca XLSX já presente no projeto. Mapeia cabeçalhos por
// sinônimos para a configuração da entidade, roda deduplicação em memória
// (uma busca em lote por tabela) e monta uma revisão em LOTE.
// Parsing defensivo: linha problemática vira pendência, não derruba o lote.

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FileSpreadsheet,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { EntidadeCadastro } from "./MafeCadastroChat";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entidade: EntidadeCadastro;
}

type Acao = "criar" | "atualizar" | "erro";

interface PropostaBase {
  _linha: number;
  acao: Acao;
  motivo?: string;
  faltantes: string[];
  candidatos: any[];
  atualizarId: string | null;
  dados: Record<string, any>;
}

// ---------- Mapeamento de cabeçalho -> campo ----------
const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

interface CampoMap {
  field: string;
  label: string;
  required?: boolean;
  type?: "text" | "number";
  aliases: string[]; // já normalizados
}

const CAMPOS_FORN: CampoMap[] = [
  { field: "nome", label: "Nome", required: true, aliases: ["nome", "fornecedor", "razao_social", "razao"] },
  { field: "cidade", label: "Cidade", aliases: ["cidade", "municipio"] },
  { field: "estado", label: "UF", aliases: ["estado", "uf"] },
  { field: "telefone", label: "Telefone", aliases: ["telefone", "fone", "tel"] },
  { field: "whatsapp", label: "WhatsApp", aliases: ["whatsapp", "wpp", "zap"] },
  { field: "email", label: "E-mail", aliases: ["email", "e_mail"] },
  { field: "mercado", label: "Mercado", aliases: ["mercado"] },
  { field: "categoria_fornecedor", label: "Categoria", aliases: ["categoria", "categoria_fornecedor", "segmento"] },
  { field: "contato_nome", label: "Contato", aliases: ["contato", "atendente", "vendedor", "contato_nome"] },
  { field: "observacoes", label: "Observações", aliases: ["observacoes", "obs", "observacao", "notas"] },
];

const CAMPOS_PLANTA: CampoMap[] = [
  { field: "nome_popular", label: "Nome popular", required: true, aliases: ["nome_popular", "nome", "popular"] },
  { field: "nome_cientifico", label: "Nome científico", aliases: ["nome_cientifico", "cientifico", "especie"] },
  { field: "porte", label: "Porte (m)", aliases: ["porte", "porte_m"] },
  { field: "altura_m", label: "Altura (m)", type: "number", aliases: ["altura", "altura_m", "altura_metros"] },
  { field: "unidade", label: "Unidade", aliases: ["unidade", "und", "un"] },
  { field: "embalagem", label: "Embalagem", aliases: ["embalagem"] },
  { field: "categoria", label: "Categoria", aliases: ["categoria"] },
  { field: "dap_cm", label: "DAP (cm)", type: "number", aliases: ["dap", "dap_cm"] },
  { field: "observacoes", label: "Observações", aliases: ["observacoes", "obs", "observacao"] },
];

const CAMPOS_PRECO: CampoMap[] = [
  { field: "fornecedor_nome", label: "Fornecedor", required: true, aliases: ["fornecedor", "fornecedor_nome", "razao_social", "razao"] },
  { field: "item_nome", label: "Item", required: true, aliases: ["item", "item_nome", "planta", "nome_popular", "produto", "insumo", "nome"] },
  { field: "item_tipo", label: "Tipo", aliases: ["tipo", "item_tipo"] },
  { field: "porte", label: "Porte (m)", aliases: ["porte", "porte_m"] },
  { field: "unidade", label: "Unidade", aliases: ["unidade", "und", "un"] },
  { field: "preco", label: "Preço (R$)", required: true, type: "number", aliases: ["preco", "preco_unitario", "valor", "preco_r", "valor_r"] },
  { field: "observacoes", label: "Observações", aliases: ["observacoes", "obs", "observacao"] },
];

function camposDaEntidade(e: EntidadeCadastro): CampoMap[] {
  if (e === "fornecedores") return CAMPOS_FORN;
  if (e === "plantas") return CAMPOS_PLANTA;
  return CAMPOS_PRECO;
}

function toNumberSafe(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9,.\-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function mapearLinha(row: Record<string, any>, campos: CampoMap[]) {
  const headersNorm: Record<string, string> = {};
  for (const k of Object.keys(row)) headersNorm[norm(k)] = k;
  const out: Record<string, any> = {};
  for (const c of campos) {
    let rawKey: string | undefined;
    for (const a of c.aliases) {
      if (headersNorm[a]) { rawKey = headersNorm[a]; break; }
    }
    if (!rawKey) { out[c.field] = null; continue; }
    const v = row[rawKey];
    if (v === null || v === undefined || String(v).trim() === "") { out[c.field] = null; continue; }
    if (c.type === "number") out[c.field] = toNumberSafe(v);
    else out[c.field] = String(v).trim();
  }
  return out;
}

function validarFaltantes(dados: Record<string, any>, campos: CampoMap[]) {
  const f: string[] = [];
  for (const c of campos) {
    if (!c.required) continue;
    const v = dados[c.field];
    if (v === null || v === undefined || String(v).trim() === "") f.push(c.field);
  }
  return f;
}

// ---------- Dedup em memória ----------
function dedupFornecedor(dados: any, indice: any[]) {
  const n = norm(dados.nome);
  if (!n) return [];
  const cid = norm(dados.cidade);
  return indice
    .map((r) => {
      const rn = norm(r.nome);
      const score =
        (rn === n ? 3 : rn.includes(n) || n.includes(rn) ? 2 : 0) +
        (cid && norm(r.cidade) === cid ? 1 : 0);
      return { ...r, _score: score };
    })
    .filter((r) => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3);
}

function dedupPlanta(dados: any, indice: any[]) {
  const np = norm(dados.nome_popular);
  const ns = norm(dados.nome_cientifico);
  if (!np && !ns) return [];
  const porte = norm(dados.porte);
  return indice
    .map((r) => {
      const score =
        (np && norm(r.nome_popular) === np ? 3 : np && norm(r.nome_popular).includes(np) ? 2 : 0) +
        (ns && norm(r.nome_cientifico) === ns ? 2 : 0) +
        (porte && norm(r.porte) === porte ? 1 : 0);
      return { ...r, _score: score };
    })
    .filter((r) => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 3);
}

function matchPrecoLookup(dados: any, fornecedores: any[], itens: any[]) {
  const fn = norm(dados.fornecedor_nome);
  const itn = norm(dados.item_nome);
  const tipoHint = String(dados.item_tipo ?? "").toLowerCase();
  const forMatches = fn
    ? fornecedores
        .map((f) => ({
          ...f,
          _score: norm(f.nome) === fn ? 3 : norm(f.nome).includes(fn) ? 2 : 0,
        }))
        .filter((f) => f._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 3)
    : [];
  const itensMatches = itn
    ? itens
        .filter((i) => !tipoHint || tipoHint === "auto" || i.tipo === tipoHint)
        .map((i) => {
          const a = norm(i.nome);
          const b = norm(i.nome_cientifico);
          const score = a === itn ? 3 : a.includes(itn) ? 2 : b && b.includes(itn) ? 2 : 0;
          return { ...i, _score: score };
        })
        .filter((i) => i._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 3)
    : [];
  return { forMatches, itensMatches };
}

// ---------- Componente ----------
export function MafeCadastroPlanilha({ open, onOpenChange, entidade }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "review" | "saving" | "done">("upload");
  const [parsing, setParsing] = useState(false);
  const [propostas, setPropostas] = useState<PropostaBase[]>([]);
  const [results, setResults] = useState<{ linha: number; ok: boolean; msg: string }[]>([]);

  const campos = useMemo(() => camposDaEntidade(entidade), [entidade]);

  const reset = () => {
    setStep("upload");
    setParsing(false);
    setPropostas([]);
    setResults([]);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo grande demais", description: "Use até 10 MB.", variant: "destructive" });
      return;
    }
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      if (!rows.length) {
        toast({ title: "Planilha vazia", description: "Nenhuma linha encontrada.", variant: "destructive" });
        setParsing(false);
        return;
      }

      // Pré-carrega índices de dedup uma única vez
      let fornIdx: any[] = [];
      let plantIdx: any[] = [];
      let insumoIdx: any[] = [];
      if (entidade === "fornecedores") {
        const { data } = await supabase
          .from("fornecedores")
          .select("id,nome,cidade,estado,telefone,mercado")
          .limit(5000);
        fornIdx = (data ?? []) as any[];
      } else if (entidade === "plantas") {
        const { data } = await supabase
          .from("plantas")
          .select("id,nome_popular,nome_cientifico,porte,unidade")
          .eq("ativo", true)
          .limit(10000);
        plantIdx = (data ?? []) as any[];
      } else {
        const [forn, plant, insumo] = await Promise.all([
          supabase.from("fornecedores").select("id,nome,cidade,estado,mercado").eq("status", "ativo").limit(5000),
          supabase.from("plantas").select("id,nome_popular,nome_cientifico,porte,unidade").eq("ativo", true).limit(10000),
          supabase.from("insumos").select("id,nome,unidade").eq("ativo", true).limit(10000),
        ]);
        fornIdx = (forn.data ?? []) as any[];
        plantIdx = ((plant.data ?? []) as any[]).map((p) => ({
          id: p.id, tipo: "planta", nome: p.nome_popular, nome_cientifico: p.nome_cientifico, porte: p.porte, unidade: p.unidade,
        }));
        insumoIdx = ((insumo.data ?? []) as any[]).map((i) => ({
          id: i.id, tipo: "insumo", nome: i.nome, nome_cientifico: null, porte: null, unidade: i.unidade,
        }));
      }
      const itensIdx = [...plantIdx, ...insumoIdx];

      const props: PropostaBase[] = rows.map((r, idx) => {
        const linha = idx + 2;
        try {
          const dados = mapearLinha(r, campos);
          const faltantes = validarFaltantes(dados, campos);
          if (faltantes.length > 0) {
            return {
              _linha: linha, acao: "erro",
              motivo: `Campos obrigatórios em branco: ${faltantes.join(", ")}`,
              faltantes, candidatos: [], atualizarId: null, dados,
            };
          }
          if (entidade === "fornecedores") {
            const cand = dedupFornecedor(dados, fornIdx);
            const top = cand[0];
            const exato = top && top._score >= 3;
            return {
              _linha: linha,
              acao: exato ? "atualizar" : "criar",
              faltantes: [],
              candidatos: cand,
              atualizarId: exato ? top.id : null,
              dados,
            };
          }
          if (entidade === "plantas") {
            const cand = dedupPlanta(dados, plantIdx);
            const top = cand[0];
            const exato = top && top._score >= 3;
            return {
              _linha: linha,
              acao: exato ? "atualizar" : "criar",
              faltantes: [],
              candidatos: cand,
              atualizarId: exato ? top.id : null,
              dados,
            };
          }
          // preco_fornecedor
          const { forMatches, itensMatches } = matchPrecoLookup(dados, fornIdx, itensIdx);
          if (!forMatches.length || !itensMatches.length) {
            return {
              _linha: linha, acao: "erro",
              motivo: !forMatches.length
                ? `Fornecedor "${dados.fornecedor_nome}" não encontrado no catálogo`
                : `Item "${dados.item_nome}" não encontrado no catálogo`,
              faltantes: [], candidatos: [], atualizarId: null,
              dados: { ...dados, _forMatches: forMatches, _itensMatches: itensMatches, _forSel: forMatches[0] || null, _itemSel: itensMatches[0] || null },
            };
          }
          return {
            _linha: linha, acao: "criar", faltantes: [], candidatos: [], atualizarId: null,
            dados: { ...dados, _forMatches: forMatches, _itensMatches: itensMatches, _forSel: forMatches[0], _itemSel: itensMatches[0] },
          };
        } catch (err: any) {
          return {
            _linha: linha, acao: "erro",
            motivo: `Linha malformada: ${err?.message || "erro de leitura"}`,
            faltantes: [], candidatos: [], atualizarId: null, dados: {},
          };
        }
      });

      setPropostas(props);
      setStep("review");
    } catch (err: any) {
      toast({ title: "Erro ao ler planilha", description: err?.message || "Arquivo inválido", variant: "destructive" });
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const atualizarProposta = (i: number, patch: Partial<PropostaBase>) => {
    setPropostas((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const atualizarCampo = (i: number, field: string, value: any) => {
    setPropostas((prev) => prev.map((p, idx) => {
      if (idx !== i) return p;
      const dados = { ...p.dados, [field]: value === "" ? null : value };
      const faltantes = validarFaltantes(dados, campos);
      const acao: Acao = faltantes.length > 0 ? "erro" : p.acao === "erro" ? "criar" : p.acao;
      const motivo = faltantes.length > 0 ? `Campos obrigatórios em branco: ${faltantes.join(", ")}` : undefined;
      return { ...p, dados, faltantes, acao, motivo };
    }));
  };

  async function gravarFornecedorRow(p: PropostaBase) {
    const { contato_nome, ...rest } = p.dados;
    const limpo: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== null && v !== undefined && String(v).trim() !== "") limpo[k] = v;
    }
    let forId = p.atualizarId;
    if (p.atualizarId) {
      const { error } = await supabase.from("fornecedores").update({ ...limpo, updated_by: user?.id }).eq("id", p.atualizarId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert([{ ...(limpo as any), status: "ativo", created_by: user?.id }])
        .select("id").single();
      if (error) throw error;
      forId = data.id;
    }
    if (contato_nome && forId) {
      await supabase.from("fornecedor_atendentes").insert([{
        fornecedor_id: forId,
        nome: String(contato_nome).trim(),
        telefone: (p.dados.telefone || p.dados.whatsapp || null) as any,
        email: (p.dados.email || null) as any,
        ativo: true,
        created_by: user?.id,
      }] as any);
    }
  }

  async function gravarPlantaRow(p: PropostaBase) {
    const { categoria, ...rest } = p.dados;
    const limpo: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== null && v !== undefined && String(v).trim() !== "") limpo[k] = v;
    }
    if (limpo.altura_m != null) limpo.altura_m = Number(String(limpo.altura_m).replace(",", "."));
    if (limpo.dap_cm != null) limpo.dap_cm = Number(String(limpo.dap_cm).replace(",", "."));
    if (categoria && String(categoria).trim()) {
      const { data: cat } = await supabase.from("categorias_plantas").select("id").ilike("nome", String(categoria).trim()).maybeSingle();
      if (cat?.id) limpo.categoria_id = cat.id;
    }
    if (p.atualizarId) {
      const { error } = await supabase.from("plantas").update({ ...limpo, updated_by: user?.id }).eq("id", p.atualizarId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("plantas").insert([{ ...(limpo as any), ativo: true, created_by: user?.id }]);
      if (error) throw error;
    }
  }

  async function gravarPrecoRow(p: PropostaBase) {
    const forSel = p.dados._forSel;
    const itemSel = p.dados._itemSel;
    if (!forSel?.id || !itemSel?.id) throw new Error("Fornecedor/item não selecionados");
    const preco = toNumberSafe(p.dados.preco);
    if (!preco || preco <= 0) throw new Error("Preço inválido");
    const hoje = new Date().toISOString().slice(0, 10);
    const porte = (p.dados.porte ? String(p.dados.porte).trim() : null) || itemSel.porte || null;
    const unidade = (p.dados.unidade ? String(p.dados.unidade).trim() : null) || itemSel.unidade || null;
    const observacoes = p.dados.observacoes ? String(p.dados.observacoes).trim() : null;
    const { error } = await supabase.from("historico_precos").insert([{
      item_id: itemSel.id,
      item_tipo: itemSel.tipo,
      fornecedor_id: forSel.id,
      preco, porte, unidade,
      data_orcamento: hoje,
      registrado_por: user?.id,
      observacoes,
    }] as any);
    if (error) throw error;
    if (itemSel.tipo === "planta") {
      await supabase.from("historico_precos_fornecedor").insert([{
        fornecedor_id: forSel.id, planta_id: itemSel.id,
        porte, unidade, preco, data_cotacao: hoje,
      }] as any);
    }
  }

  const handleConfirmar = async () => {
    const aplicaveis = propostas.filter((p) => p.acao !== "erro");
    if (!aplicaveis.length) {
      toast({ title: "Nada a gravar", description: "Resolva as pendências primeiro.", variant: "destructive" });
      return;
    }
    setStep("saving");
    const res: { linha: number; ok: boolean; msg: string }[] = [];
    for (const p of propostas) {
      if (p.acao === "erro") {
        res.push({ linha: p._linha, ok: false, msg: p.motivo || "Pendência" });
        continue;
      }
      try {
        if (entidade === "fornecedores") await gravarFornecedorRow(p);
        else if (entidade === "plantas") await gravarPlantaRow(p);
        else await gravarPrecoRow(p);
        res.push({ linha: p._linha, ok: true, msg: p.acao === "atualizar" ? "Atualizado" : "Criado" });
      } catch (e: any) {
        res.push({ linha: p._linha, ok: false, msg: e?.message || "Erro ao gravar" });
      }
    }
    setResults(res);
    setStep("done");
    // Invalida caches
    if (entidade === "fornecedores") {
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      qc.invalidateQueries({ queryKey: ["fornecedores-todos"] });
    } else if (entidade === "plantas") {
      qc.invalidateQueries({ queryKey: ["plantas"] });
    } else {
      qc.invalidateQueries({ queryKey: ["historico_precos"] });
      qc.invalidateQueries({ queryKey: ["historico-precos-fornecedor"] });
    }
    const okCount = res.filter((r) => r.ok).length;
    toast({ title: "Lote processado", description: `${okCount} de ${res.length} gravados.` });
  };

  const totais = useMemo(() => {
    let criar = 0, atualizar = 0, erro = 0;
    for (const p of propostas) {
      if (p.acao === "criar") criar++;
      else if (p.acao === "atualizar") atualizar++;
      else erro++;
    }
    return { criar, atualizar, erro };
  }, [propostas]);

  const titulo =
    entidade === "fornecedores" ? "Importar planilha de fornecedores"
      : entidade === "plantas" ? "Importar planilha de plantas"
        : "Importar planilha de preços";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {titulo}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Suba um arquivo .xlsx ou .csv. A Mafe lê linha a linha, casa com o catálogo e mostra para sua revisão antes de gravar. Linhas com problema ficam separadas e não travam o lote.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-10 text-center space-y-4 max-w-xl">
              <FileSpreadsheet className="w-14 h-14 mx-auto text-primary/60" />
              <div>
                <p className="font-medium">Selecione a planilha</p>
                <p className="text-sm text-muted-foreground mt-1">Aceita .xlsx, .xls e .csv (até 10 MB)</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFile}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={parsing} className="gap-2">
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {parsing ? "Lendo..." : "Selecionar arquivo"}
              </Button>
              <div className="text-xs text-muted-foreground text-left bg-muted/40 rounded p-3">
                <p className="font-medium mb-1">Colunas reconhecidas (sinônimos aceitos):</p>
                <p>{campos.map((c) => c.label + (c.required ? " *" : "")).join(" · ")}</p>
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <>
            <div className="px-5 py-3 border-b flex items-center gap-2 flex-wrap shrink-0">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                <Plus className="w-3 h-3 mr-1" /> {totais.criar} criar
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                <RefreshCw className="w-3 h-3 mr-1" /> {totais.atualizar} atualizar
              </Badge>
              {totais.erro > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  <AlertTriangle className="w-3 h-3 mr-1" /> {totais.erro} com pendência
                </Badge>
              )}
              <div className="ml-auto text-xs text-muted-foreground">{propostas.length} linhas no total</div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {propostas.map((p, i) => (
                  <PropostaCard
                    key={i}
                    p={p}
                    entidade={entidade}
                    campos={campos}
                    onChangeAcao={(acao, atualizarId) => atualizarProposta(i, { acao, atualizarId: atualizarId ?? null })}
                    onChangeCampo={(field, value) => atualizarCampo(i, field, value)}
                    onPickPrecoSel={(forSel, itemSel) => atualizarProposta(i, {
                      dados: { ...p.dados, _forSel: forSel ?? p.dados._forSel, _itemSel: itemSel ?? p.dados._itemSel },
                      acao: forSel && itemSel ? "criar" : p.acao,
                      motivo: forSel && itemSel ? undefined : p.motivo,
                    })}
                  />
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="px-5 py-3 border-t shrink-0">
              <Button variant="ghost" onClick={reset}>Voltar</Button>
              <Button variant="terracota" onClick={handleConfirmar} disabled={!propostas.some((p) => p.acao !== "erro")}>
                Confirmar e gravar ({totais.criar + totais.atualizar})
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "saving" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Gravando lote...</p>
          </div>
        )}

        {step === "done" && (
          <>
            <div className="px-5 py-3 border-b flex items-center gap-2 flex-wrap shrink-0">
              <Badge className="bg-success/20 text-success border-success/30">
                <CheckCircle2 className="w-3 h-3 mr-1" /> {results.filter((r) => r.ok).length} gravados
              </Badge>
              {results.some((r) => !r.ok) && (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                  <XCircle className="w-3 h-3 mr-1" /> {results.filter((r) => !r.ok).length} falharam
                </Badge>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-1 text-sm">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded ${r.ok ? "bg-muted/40" : "bg-destructive/5"}`}>
                    {r.ok ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                    <span className="text-muted-foreground w-16">Linha {r.linha}</span>
                    <span className={r.ok ? "" : "text-destructive"}>{r.msg}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="px-5 py-3 border-t shrink-0">
              <Button variant="ghost" onClick={reset}>Importar outra</Button>
              <Button variant="terracota" onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Card por linha ----------
function PropostaCard({
  p, entidade, campos, onChangeAcao, onChangeCampo, onPickPrecoSel,
}: {
  p: PropostaBase;
  entidade: EntidadeCadastro;
  campos: CampoMap[];
  onChangeAcao: (acao: Acao, atualizarId?: string | null) => void;
  onChangeCampo: (field: string, value: any) => void;
  onPickPrecoSel: (forSel: any | null, itemSel: any | null) => void;
}) {
  const corBorda =
    p.acao === "erro" ? "border-destructive/40 bg-destructive/5"
      : p.acao === "atualizar" ? "border-amber-500/40 bg-amber-500/5"
        : "border-primary/30 bg-card";

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${corBorda}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Linha {p._linha}</span>
        <Badge
          variant="outline"
          className={
            p.acao === "erro" ? "bg-destructive/10 text-destructive border-destructive/30"
              : p.acao === "atualizar" ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                : "bg-primary/10 text-primary border-primary/30"
          }
        >
          {p.acao === "erro" ? "Pendência" : p.acao === "atualizar" ? "Atualizar" : "Criar novo"}
        </Badge>
        {p.motivo && <span className="text-xs text-destructive">{p.motivo}</span>}
      </div>

      {/* Linha de candidatos (criar/atualizar) */}
      {entidade !== "preco_fornecedor" && p.candidatos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">Possíveis duplicados:</span>
          {p.candidatos.map((c) => {
            const isSel = p.atualizarId === c.id;
            const label = entidade === "fornecedores"
              ? [c.nome, c.cidade, c.estado].filter(Boolean).join(" · ")
              : [c.nome_popular, c.nome_cientifico, c.porte && `porte ${c.porte}`].filter(Boolean).join(" · ");
            return (
              <button
                key={c.id}
                onClick={() => onChangeAcao(isSel ? "criar" : "atualizar", isSel ? null : c.id)}
                className={`px-2 py-0.5 rounded border text-xs ${isSel ? "bg-amber-500/20 border-amber-500/40 text-amber-800" : "bg-muted hover:bg-muted/70 border-border"}`}
              >
                {isSel ? "✓ " : ""}{label}
              </button>
            );
          })}
          <button
            onClick={() => onChangeAcao("criar", null)}
            className={`px-2 py-0.5 rounded border text-xs ${!p.atualizarId ? "bg-primary/15 border-primary/30 text-primary" : "bg-muted hover:bg-muted/70 border-border"}`}
          >
            Criar novo
          </button>
        </div>
      )}

      {/* Pickers para preço */}
      {entidade === "preco_fornecedor" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <PickList
            label="Fornecedor"
            options={p.dados._forMatches ?? []}
            value={p.dados._forSel?.id ?? null}
            getLabel={(o) => [o.nome, o.cidade].filter(Boolean).join(" · ")}
            onChange={(o) => onPickPrecoSel(o, null)}
          />
          <PickList
            label="Item do catálogo"
            options={p.dados._itensMatches ?? []}
            value={p.dados._itemSel?.id ?? null}
            getLabel={(o) => `${o.nome}${o.nome_cientifico ? ` (${o.nome_cientifico})` : ""}${o.porte ? ` · ${o.porte}m` : ""} · ${o.tipo}`}
            onChange={(o) => onPickPrecoSel(null, o)}
          />
        </div>
      )}

      {/* Campos editáveis */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {campos.map((c) => {
          const v = p.dados[c.field];
          const missing = p.faltantes.includes(c.field);
          return (
            <div key={c.field} className="space-y-0.5">
              <label className={`text-[10px] uppercase tracking-wide ${missing ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {c.label}{c.required ? " *" : ""}
              </label>
              <Input
                value={v ?? ""}
                onChange={(e) => onChangeCampo(c.field, e.target.value)}
                className={`h-8 text-sm ${missing ? "border-destructive" : ""}`}
                placeholder={missing ? "obrigatório" : ""}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PickList<T extends { id: string }>({
  label, options, value, getLabel, onChange,
}: {
  label: string;
  options: T[];
  value: string | null;
  getLabel: (o: T) => string;
  onChange: (o: T | null) => void;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</label>
      {options.length === 0 ? (
        <div className="text-xs text-destructive border border-destructive/30 rounded px-2 py-1 bg-destructive/5">
          Sem candidatos no catálogo
        </div>
      ) : (
        <Select value={value ?? ""} onValueChange={(v) => onChange(options.find((o) => o.id === v) ?? null)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id} className="text-xs">{getLabel(o)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
