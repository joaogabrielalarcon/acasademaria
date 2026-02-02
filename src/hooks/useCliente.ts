import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Proprietario {
  nome: string;
  telefone?: string;
  email?: string;
}

export interface FuncionarioCasa {
  nome: string;
  funcao?: string;
  telefone?: string;
}

export interface Assessor {
  nome: string;
  empresa?: string;
  telefone?: string;
}

export interface DataImportante {
  data: string;
  descricao: string;
  recorrente?: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  condominio: string | null;
  telefone: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
  status: string;
  notas: string | null;
  particularidades: string | null;
  proprietarios: Proprietario[];
  funcionarios_casa: FuncionarioCasa[];
  assessores: Assessor[];
  datas_importantes: DataImportante[];
  created_at: string;
  updated_at: string;
}

export interface Trecho {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number | null;
}

export interface Proposta {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
  data_envio: string | null;
  valor: number | null;
  descricao: string | null;
  observacoes: string | null;
}

export interface RegistroInsumo {
  id: string;
  insumo_id: string;
  quantidade: number;
  observacao: string | null;
  insumo?: {
    nome: string;
    unidade: string | null;
  };
}

export interface Registro {
  id: string;
  data_servico: string;
  tipo: string;
  status: string;
  descricao: string;
  solicitante: string | null;
  observacoes_internas: string | null;
  trecho_id: string | null;
  proposta_id: string | null;
  equipe_presente_ids: string[];
  executores_ids: string[];
  categorias_ids: string[];
  midia: { url: string; type: string }[] | null;
  prioridade: string | null;
  status_solicitacao: string | null;
  trecho?: {
    nome: string;
  };
  proposta?: {
    codigo: string;
    titulo: string;
  };
  registro_insumos?: RegistroInsumo[];
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Parse JSON fields
      if (data) {
        return {
          ...data,
          proprietarios: (data.proprietarios as unknown as Proprietario[]) || [],
          funcionarios_casa: (data.funcionarios_casa as unknown as FuncionarioCasa[]) || [],
          assessores: (data.assessores as unknown as Assessor[]) || [],
          datas_importantes: (data.datas_importantes as unknown as DataImportante[]) || [],
        } as Cliente;
      }
      
      return null;
    },
    enabled: !!id,
  });
}

export function useTrechosCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["trechos", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .from("trechos")
        .select("id, nome, descricao, ordem")
        .eq("cliente_id", clienteId)
        .order("ordem");
      
      if (error) throw error;
      return data as Trecho[];
    },
    enabled: !!clienteId,
  });
}

export function usePropostasCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["propostas", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .from("propostas")
        .select("id, codigo, titulo, status, data_envio, valor, descricao, observacoes")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Proposta[];
    },
    enabled: !!clienteId,
  });
}

export function useRegistrosCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["registros", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .from("registros")
        .select(`
          id, 
          data_servico, 
          tipo, 
          status, 
          descricao, 
          solicitante, 
          observacoes_internas,
          trecho_id,
          proposta_id,
          equipe_presente_ids,
          executores_ids,
          categorias_ids,
          midia,
          prioridade,
          status_solicitacao
        `)
        .eq("cliente_id", clienteId)
        .order("data_servico", { ascending: false });
      
      if (error) throw error;
      return data as Registro[];
    },
    enabled: !!clienteId,
  });
}

// Fetch additional data for registros (trechos, propostas, insumos, colaboradores, categorias)
export function useRegistrosComDetalhes(clienteId: string | undefined) {
  const { data: registros = [], isLoading: loadingRegistros } = useRegistrosCliente(clienteId);
  const { data: trechos = [] } = useTrechosCliente(clienteId);
  const { data: propostas = [] } = usePropostasCliente(clienteId);
  
  // Get colaboradores for names
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  // Get all categorias_servico
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias-servico-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_servico")
        .select("id, nome, cor")
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });
  
  // Get insumos used in registros
  const registroIds = registros.map(r => r.id);
  const { data: registroInsumos = [] } = useQuery({
    queryKey: ["registro-insumos", registroIds],
    queryFn: async () => {
      if (registroIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("registro_insumos")
        .select(`
          id,
          registro_id,
          quantidade,
          observacao,
          insumo_id
        `)
        .in("registro_id", registroIds);
      
      if (error) throw error;
      return data;
    },
    enabled: registroIds.length > 0,
  });
  
  // Get insumo names
  const insumoIds = [...new Set(registroInsumos.map(ri => ri.insumo_id))];
  const { data: insumos = [] } = useQuery({
    queryKey: ["insumos-names", insumoIds],
    queryFn: async () => {
      if (insumoIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("insumos")
        .select("id, nome, unidade")
        .in("id", insumoIds);
      
      if (error) throw error;
      return data;
    },
    enabled: insumoIds.length > 0,
  });
  
  // Map colaborador IDs to names
  const colaboradorMap = new Map(colaboradores.map(c => [c.id, c.nome]));
  const trechoMap = new Map(trechos.map(t => [t.id, t.nome]));
  const propostaMap = new Map(propostas.map(p => [p.id, { codigo: p.codigo, titulo: p.titulo }]));
  const insumoMap = new Map(insumos.map(i => [i.id, { nome: i.nome, unidade: i.unidade }]));
  const categoriaMap = new Map(categorias.map(c => [c.id, { nome: c.nome, cor: c.cor }]));
  
  // Build enriched registros
  const registrosEnriquecidos = registros.map(registro => {
    const registroInsumosFiltered = registroInsumos.filter(ri => ri.registro_id === registro.id);
    
    return {
      ...registro,
      trecho: registro.trecho_id ? trechoMap.get(registro.trecho_id) : null,
      proposta: registro.proposta_id ? propostaMap.get(registro.proposta_id) : null,
      equipePresente: (registro.equipe_presente_ids || []).map(id => colaboradorMap.get(id) || "Desconhecido"),
      executores: (registro.executores_ids || []).map(id => colaboradorMap.get(id) || "Desconhecido"),
      categorias: (registro.categorias_ids || []).map(id => categoriaMap.get(id)).filter(Boolean) as { nome: string; cor: string }[],
      insumos: registroInsumosFiltered.map(ri => {
        const insumo = insumoMap.get(ri.insumo_id);
        return {
          nome: insumo?.nome || "Insumo desconhecido",
          quantidade: ri.quantidade,
          unidade: insumo?.unidade || "un",
        };
      }),
      prioridade: registro.prioridade || null,
      statusSolicitacao: registro.status_solicitacao || null,
    };
  });
  
  return {
    registros: registrosEnriquecidos,
    isLoading: loadingRegistros,
  };
}
