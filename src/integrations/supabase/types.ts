export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      categorias_plantas: {
        Row: {
          ativo: boolean
          campos_obrigatorios: Json | null
          created_at: string
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean
          campos_obrigatorios?: Json | null
          created_at?: string
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean
          campos_obrigatorios?: Json | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      categorias_servico: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          assessores: Json | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          condominio: string | null
          cpf_cnpj: string | null
          created_at: string
          datas_importantes: Json | null
          email: string | null
          endereco: string | null
          estado: string | null
          funcionarios_casa: Json | null
          id: string
          inscricao_estadual: string | null
          nome: string
          notas: string | null
          particularidades: string | null
          proprietarios: Json | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          assessores?: Json | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          condominio?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          datas_importantes?: Json | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          funcionarios_casa?: Json | null
          id?: string
          inscricao_estadual?: string | null
          nome: string
          notas?: string | null
          particularidades?: string | null
          proprietarios?: Json | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          assessores?: Json | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          condominio?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          datas_importantes?: Json | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          funcionarios_casa?: Json | null
          id?: string
          inscricao_estadual?: string | null
          nome?: string
          notas?: string | null
          particularidades?: string | null
          proprietarios?: Json | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          area: string | null
          area_id: string | null
          ativo: boolean
          cargo: string | null
          cep: string | null
          cidade: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          foto_url: string | null
          id: string
          maquinas_ids: string[] | null
          nome: string
          observacoes: string | null
          tamanho_calca: string | null
          tamanho_calcado: string | null
          tamanho_camiseta: string | null
          telefone: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          area?: string | null
          area_id?: string | null
          ativo?: boolean
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          maquinas_ids?: string[] | null
          nome: string
          observacoes?: string | null
          tamanho_calca?: string | null
          tamanho_calcado?: string | null
          tamanho_camiseta?: string | null
          telefone?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          area?: string | null
          area_id?: string | null
          ativo?: boolean
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          maquinas_ids?: string[] | null
          nome?: string
          observacoes?: string | null
          tamanho_calca?: string | null
          tamanho_calcado?: string | null
          tamanho_camiseta?: string | null
          telefone?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      diarias: {
        Row: {
          cliente_id: string
          comentarios_jardim: string | null
          created_at: string
          data_alerta: string | null
          data_visita: string
          equipe_presente_ids: string[] | null
          id: string
          observacoes_internas: string | null
          periodo: string
          status: string
          trecho_id: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          comentarios_jardim?: string | null
          created_at?: string
          data_alerta?: string | null
          data_visita: string
          equipe_presente_ids?: string[] | null
          id?: string
          observacoes_internas?: string | null
          periodo?: string
          status?: string
          trecho_id?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          comentarios_jardim?: string | null
          created_at?: string
          data_alerta?: string | null
          data_visita?: string
          equipe_presente_ids?: string[] | null
          id?: string
          observacoes_internas?: string | null
          periodo?: string
          status?: string
          trecho_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diarias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diarias_trecho_id_fkey"
            columns: ["trecho_id"]
            isOneToOne: false
            referencedRelation: "trechos"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_colaborador: {
        Row: {
          colaborador_id: string
          created_at: string
          data_entrega: string
          id: string
          insumo_id: string
          observacao: string | null
          quantidade: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_entrega?: string
          id?: string
          insumo_id: string
          observacao?: string | null
          quantidade?: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_entrega?: string
          id?: string
          insumo_id?: string
          observacao?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "entregas_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_colaborador_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      insumos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          fornecedor_id: string | null
          id: string
          nome: string
          observacoes: string | null
          preco_unitario: number | null
          ultima_compra: string | null
          unidade: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinas: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_interno: string | null
          created_at: string
          horas_acumuladas: number
          horas_limite_manutencao: number
          id: string
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacoes: string | null
          proxima_manutencao_em: number | null
          status: string
          ultima_manutencao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_interno?: string | null
          created_at?: string
          horas_acumuladas?: number
          horas_limite_manutencao?: number
          id?: string
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          proxima_manutencao_em?: number | null
          status?: string
          ultima_manutencao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_interno?: string | null
          created_at?: string
          horas_acumuladas?: number
          horas_limite_manutencao?: number
          id?: string
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          proxima_manutencao_em?: number | null
          status?: string
          ultima_manutencao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plantas: {
        Row: {
          altura_cm: number | null
          ativo: boolean
          categoria_id: string | null
          created_at: string
          dap_cm: number | null
          fornecedor_id: string | null
          id: string
          midia: Json | null
          nome_cientifico: string | null
          nome_popular: string
          nota_qualidade: number | null
          observacoes: string | null
          porte: string | null
          preco_unitario: number | null
          ultima_compra: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          altura_cm?: number | null
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          dap_cm?: number | null
          fornecedor_id?: string | null
          id?: string
          midia?: Json | null
          nome_cientifico?: string | null
          nome_popular: string
          nota_qualidade?: number | null
          observacoes?: string | null
          porte?: string | null
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          altura_cm?: number | null
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          dap_cm?: number | null
          fornecedor_id?: string | null
          id?: string
          midia?: Json | null
          nome_cientifico?: string | null
          nome_popular?: string
          nota_qualidade?: number | null
          observacoes?: string | null
          porte?: string | null
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area_id: string | null
          ativo: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          data_envio: string | null
          data_resposta: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          status: string
          titulo: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          cliente_id: string
          codigo: string
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          titulo: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_itens: {
        Row: {
          altura_cm: number | null
          created_at: string
          dap_cm: number | null
          id: string
          insumo_id: string | null
          observacao: string | null
          planta_id: string | null
          porte: string | null
          quantidade: number
          registro_id: string
          tipo_item: string
          unidade: string | null
        }
        Insert: {
          altura_cm?: number | null
          created_at?: string
          dap_cm?: number | null
          id?: string
          insumo_id?: string | null
          observacao?: string | null
          planta_id?: string | null
          porte?: string | null
          quantidade: number
          registro_id: string
          tipo_item: string
          unidade?: string | null
        }
        Update: {
          altura_cm?: number | null
          created_at?: string
          dap_cm?: number | null
          id?: string
          insumo_id?: string | null
          observacao?: string | null
          planta_id?: string | null
          porte?: string | null
          quantidade?: number
          registro_id?: string
          tipo_item?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_itens_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_itens_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_insumos: {
        Row: {
          created_at: string
          id: string
          insumo_id: string
          observacao: string | null
          quantidade: number
          registro_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id: string
          observacao?: string | null
          quantidade: number
          registro_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string
          observacao?: string | null
          quantidade?: number
          registro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_insumos_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_maquinas: {
        Row: {
          created_at: string
          horas_utilizadas: number
          id: string
          maquina_id: string
          observacao: string | null
          registro_id: string
        }
        Insert: {
          created_at?: string
          horas_utilizadas?: number
          id?: string
          maquina_id: string
          observacao?: string | null
          registro_id: string
        }
        Update: {
          created_at?: string
          horas_utilizadas?: number
          id?: string
          maquina_id?: string
          observacao?: string | null
          registro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_maquinas_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_maquinas_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros"
            referencedColumns: ["id"]
          },
        ]
      }
      registros: {
        Row: {
          area_funcional: string | null
          categorias_ids: string[] | null
          cliente_id: string
          colaboradores_ids: string[] | null
          created_at: string
          data_alerta: string | null
          data_servico: string
          descricao: string
          diaria_id: string | null
          equipe_presente_ids: string[] | null
          executores_ids: string[] | null
          hora_servico: string | null
          humor_do_jardim: string | null
          id: string
          midia: Json | null
          observacoes_internas: string | null
          proposta_id: string | null
          solicitante: string | null
          status: string
          tags: string[] | null
          tipo: string
          trecho_id: string | null
          updated_at: string
        }
        Insert: {
          area_funcional?: string | null
          categorias_ids?: string[] | null
          cliente_id: string
          colaboradores_ids?: string[] | null
          created_at?: string
          data_alerta?: string | null
          data_servico: string
          descricao: string
          diaria_id?: string | null
          equipe_presente_ids?: string[] | null
          executores_ids?: string[] | null
          hora_servico?: string | null
          humor_do_jardim?: string | null
          id?: string
          midia?: Json | null
          observacoes_internas?: string | null
          proposta_id?: string | null
          solicitante?: string | null
          status?: string
          tags?: string[] | null
          tipo: string
          trecho_id?: string | null
          updated_at?: string
        }
        Update: {
          area_funcional?: string | null
          categorias_ids?: string[] | null
          cliente_id?: string
          colaboradores_ids?: string[] | null
          created_at?: string
          data_alerta?: string | null
          data_servico?: string
          descricao?: string
          diaria_id?: string | null
          equipe_presente_ids?: string[] | null
          executores_ids?: string[] | null
          hora_servico?: string | null
          humor_do_jardim?: string | null
          id?: string
          midia?: Json | null
          observacoes_internas?: string | null
          proposta_id?: string | null
          solicitante?: string | null
          status?: string
          tags?: string[] | null
          tipo?: string
          trecho_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_diaria_id_fkey"
            columns: ["diaria_id"]
            isOneToOne: false
            referencedRelation: "diarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_trecho_id_fkey"
            columns: ["trecho_id"]
            isOneToOne: false
            referencedRelation: "trechos"
            referencedColumns: ["id"]
          },
        ]
      }
      trechos: {
        Row: {
          cliente_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trechos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_users: { Args: { _user_id: string }; Returns: boolean }
      check_inactive_clients: { Args: never; Returns: undefined }
      get_user_area: { Args: { _user_id: string }; Returns: string }
      get_user_id_by_username: { Args: { _username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_colaborador_ativo: { Args: { _user_id: string }; Returns: boolean }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      user_role: "admin" | "gestor" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "gestor", "operador"],
    },
  },
} as const
