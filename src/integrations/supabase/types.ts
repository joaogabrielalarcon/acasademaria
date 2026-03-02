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
          created_by: string | null
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
          updated_by: string | null
        }
        Insert: {
          assessores?: Json | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          condominio?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
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
          updated_by?: string | null
        }
        Update: {
          assessores?: Json | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          condominio?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
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
          updated_by?: string | null
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
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          foto_url: string | null
          id: string
          maquinas_ids: string[] | null
          nome: string
          observacoes: string | null
          sub_equipe: string | null
          tamanho_calca: string | null
          tamanho_calcado: string | null
          tamanho_camiseta: string | null
          telefone: string | null
          updated_at: string
          updated_by: string | null
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
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          maquinas_ids?: string[] | null
          nome: string
          observacoes?: string | null
          sub_equipe?: string | null
          tamanho_calca?: string | null
          tamanho_calcado?: string | null
          tamanho_camiseta?: string | null
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
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
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          maquinas_ids?: string[] | null
          nome?: string
          observacoes?: string | null
          sub_equipe?: string | null
          tamanho_calca?: string | null
          tamanho_calcado?: string | null
          tamanho_camiseta?: string | null
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
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
      custos_equipe: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          custo_dia_util: number | null
          data_vigencia: string
          id: string
          observacoes: string | null
          salario_mensal: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          custo_dia_util?: number | null
          data_vigencia?: string
          id?: string
          observacoes?: string | null
          salario_mensal?: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          custo_dia_util?: number | null
          data_vigencia?: string
          id?: string
          observacoes?: string | null
          salario_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_equipe_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_equipe_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      diarias: {
        Row: {
          cliente_id: string
          comentarios_jardim: string | null
          created_at: string
          created_by: string | null
          data_alerta: string | null
          data_visita: string
          equipe_presente_ids: string[] | null
          id: string
          observacoes_internas: string | null
          periodo: string
          status: string
          trecho_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          comentarios_jardim?: string | null
          created_at?: string
          created_by?: string | null
          data_alerta?: string | null
          data_visita: string
          equipe_presente_ids?: string[] | null
          id?: string
          observacoes_internas?: string | null
          periodo?: string
          status?: string
          trecho_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          comentarios_jardim?: string | null
          created_at?: string
          created_by?: string | null
          data_alerta?: string | null
          data_visita?: string
          equipe_presente_ids?: string[] | null
          id?: string
          observacoes_internas?: string | null
          periodo?: string
          status?: string
          trecho_id?: string | null
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "entregas_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
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
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string
          telefone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      historico_precos: {
        Row: {
          created_at: string
          data_alteracao: string
          fornecedor_id: string | null
          id: string
          insumo_id: string | null
          observacao: string | null
          planta_id: string | null
          preco_anterior: number | null
          preco_novo: number | null
          tipo_item: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          data_alteracao?: string
          fornecedor_id?: string | null
          id?: string
          insumo_id?: string | null
          observacao?: string | null
          planta_id?: string | null
          preco_anterior?: number | null
          preco_novo?: number | null
          tipo_item: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          data_alteracao?: string
          fornecedor_id?: string | null
          id?: string
          insumo_id?: string | null
          observacao?: string | null
          planta_id?: string | null
          preco_anterior?: number | null
          preco_novo?: number | null
          tipo_item?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_precos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_salarios: {
        Row: {
          colaborador_id: string
          data_alteracao: string
          id: string
          observacao: string | null
          salario_anterior: number | null
          salario_novo: number
          usuario_id: string | null
        }
        Insert: {
          colaborador_id: string
          data_alteracao?: string
          id?: string
          observacao?: string | null
          salario_anterior?: number | null
          salario_novo: number
          usuario_id?: string | null
        }
        Update: {
          colaborador_id?: string
          data_alteracao?: string
          id?: string
          observacao?: string | null
          salario_anterior?: number | null
          salario_novo?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_salarios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_salarios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          created_by: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          observacoes: string | null
          preco_unitario: number | null
          ultima_compra: string | null
          unidade: string | null
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_by?: string | null
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
          created_by: string | null
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
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_interno?: string | null
          created_at?: string
          created_by?: string | null
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
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_interno?: string | null
          created_at?: string
          created_by?: string | null
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
          updated_by?: string | null
        }
        Relationships: []
      }
      memorial_descritivo: {
        Row: {
          created_at: string
          id: string
          nome_cientifico: string | null
          nome_popular: string
          ordem: number | null
          porte: string | null
          projeto_id: string
          quantidade: number
          unidade: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_cientifico?: string | null
          nome_popular?: string
          ordem?: number | null
          porte?: string | null
          projeto_id: string
          quantidade?: number
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_cientifico?: string | null
          nome_popular?: string
          ordem?: number | null
          porte?: string | null
          projeto_id?: string
          quantidade?: number
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_descritivo_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_cotacoes: {
        Row: {
          created_at: string
          fornecedor_id: string | null
          fornecedor_nome: string | null
          id: string
          item_id: string
          observacao: string | null
          preco_unitario: number
          selecionada: boolean
        }
        Insert: {
          created_at?: string
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          item_id: string
          observacao?: string | null
          preco_unitario?: number
          selecionada?: boolean
        }
        Update: {
          created_at?: string
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          item_id?: string
          observacao?: string | null
          preco_unitario?: number
          selecionada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_cotacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_cotacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          insumo_id: string | null
          margem_percentual: number | null
          observacao: string | null
          ordem: number | null
          planta_id: string | null
          preco_custo: number | null
          preco_venda: number | null
          projeto_id: string
          quantidade: number
          reserva_valor: number | null
          tipo: string
          unidade: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          insumo_id?: string | null
          margem_percentual?: number | null
          observacao?: string | null
          ordem?: number | null
          planta_id?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          projeto_id: string
          quantidade?: number
          reserva_valor?: number | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          insumo_id?: string | null
          margem_percentual?: number | null
          observacao?: string | null
          ordem?: number | null
          planta_id?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          projeto_id?: string
          quantidade?: number
          reserva_valor?: number | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      plantas: {
        Row: {
          altura_cm: number | null
          ativo: boolean
          categoria_id: string | null
          created_at: string
          created_by: string | null
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
          updated_by: string | null
        }
        Insert: {
          altura_cm?: number | null
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
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
          updated_by?: string | null
        }
        Update: {
          altura_cm?: number | null
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
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
          updated_by?: string | null
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
      projeto_arquivos: {
        Row: {
          created_at: string
          id: string
          nome: string
          projeto_id: string
          tamanho: number | null
          tipo: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          projeto_id: string
          tamanho?: number | null
          tipo?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          projeto_id?: string
          tamanho?: number | null
          tipo?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_arquivos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_comentarios: {
        Row: {
          created_at: string
          id: string
          projeto_id: string
          texto: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          projeto_id: string
          texto: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          projeto_id?: string
          texto?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projeto_comentarios_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string | null
          data_previsao: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string
          updated_by: string | null
          valor_total: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_previsao?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_previsao?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          created_by: string | null
          data_envio: string | null
          data_resposta: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          status: string
          titulo: string
          updated_at: string
          updated_by: string | null
          valor: number | null
        }
        Insert: {
          cliente_id: string
          codigo: string
          created_at?: string
          created_by?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
          valor?: number | null
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
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
          created_by: string | null
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
          prioridade: string | null
          projeto_id: string | null
          proposta_id: string | null
          solicitante: string | null
          status: string
          status_solicitacao: string | null
          tags: string[] | null
          tipo: string
          trecho_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_funcional?: string | null
          categorias_ids?: string[] | null
          cliente_id: string
          colaboradores_ids?: string[] | null
          created_at?: string
          created_by?: string | null
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
          prioridade?: string | null
          projeto_id?: string | null
          proposta_id?: string | null
          solicitante?: string | null
          status?: string
          status_solicitacao?: string | null
          tags?: string[] | null
          tipo: string
          trecho_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_funcional?: string | null
          categorias_ids?: string[] | null
          cliente_id?: string
          colaboradores_ids?: string[] | null
          created_at?: string
          created_by?: string | null
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
          prioridade?: string | null
          projeto_id?: string | null
          proposta_id?: string | null
          solicitante?: string | null
          status?: string
          status_solicitacao?: string | null
          tags?: string[] | null
          tipo?: string
          trecho_id?: string | null
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "registros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
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
      registros_historico: {
        Row: {
          acao: string
          campos_alterados: string[] | null
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          campos_alterados?: string[] | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          campos_alterados?: string[] | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      system_state: {
        Row: {
          created_at: string
          key: string
          value: boolean
        }
        Insert: {
          created_at?: string
          key: string
          value?: boolean
        }
        Update: {
          created_at?: string
          key?: string
          value?: boolean
        }
        Relationships: []
      }
      trechos: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_by?: string | null
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
      colaboradores_basico: {
        Row: {
          area: string | null
          area_id: string | null
          ativo: boolean | null
          cargo: string | null
          foto_url: string | null
          id: string | null
          nome: string | null
        }
        Insert: {
          area?: string | null
          area_id?: string | null
          ativo?: boolean | null
          cargo?: string | null
          foto_url?: string | null
          id?: string | null
          nome?: string | null
        }
        Update: {
          area?: string | null
          area_id?: string | null
          ativo?: boolean | null
          cargo?: string | null
          foto_url?: string | null
          id?: string | null
          nome?: string | null
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
