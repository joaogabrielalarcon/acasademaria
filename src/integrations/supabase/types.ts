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
      assessor_dependencias: {
        Row: {
          colaborador_id: string | null
          created_at: string | null
          descricao_entrega: string
          id: string
          status_entrega: string
          tarefa_id: string
          tempo_estimado_dias: number
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string | null
          descricao_entrega: string
          id?: string
          status_entrega?: string
          tarefa_id: string
          tempo_estimado_dias?: number
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string | null
          descricao_entrega?: string
          id?: string
          status_entrega?: string
          tarefa_id?: string
          tempo_estimado_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessor_dependencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessor_dependencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessor_dependencias_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "assessor_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      assessor_tarefas: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          prazo: string | null
          prioridade: string
          status: string
          titulo: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          prazo?: string | null
          prioridade?: string
          status?: string
          titulo: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          prazo?: string | null
          prioridade?: string
          status?: string
          titulo?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessor_tarefas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessor_tarefas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      calendario_eventos: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          id: string
          recorrente: boolean
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          descricao?: string | null
          id?: string
          recorrente?: boolean
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          recorrente?: boolean
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      cargos_mo: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          membros: string | null
          nome: string
          salario_diario: number | null
          salario_mensal: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          membros?: string | null
          nome: string
          salario_diario?: number | null
          salario_mensal: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          membros?: string | null
          nome?: string
          salario_diario?: number | null
          salario_mensal?: number
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
      cliente_atividades: {
        Row: {
          acao: string
          cliente_id: string
          created_at: string
          dados_extras: Json | null
          descricao: string
          entidade_id: string | null
          id: string
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          cliente_id: string
          created_at?: string
          dados_extras?: Json | null
          descricao: string
          entidade_id?: string | null
          id?: string
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          cliente_id?: string
          created_at?: string
          dados_extras?: Json | null
          descricao?: string
          entidade_id?: string | null
          id?: string
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_feed_eventos: {
        Row: {
          cliente_id: string
          created_at: string
          dados: Json | null
          id: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
          usuario_nome: string | null
          visivel_cliente: boolean
        }
        Insert: {
          cliente_id: string
          created_at?: string
          dados?: Json | null
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          titulo: string
          usuario_nome?: string | null
          visivel_cliente?: boolean
        }
        Update: {
          cliente_id?: string
          created_at?: string
          dados?: Json | null
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
          usuario_nome?: string | null
          visivel_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cliente_feed_eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
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
      coeficientes_insumos: {
        Row: {
          adubo_por_unidade: number | null
          corda_por_unidade: number | null
          created_at: string | null
          criado_por: string | null
          id: string
          mo_por_unidade: number | null
          munck_por_unidade: number | null
          terra_por_unidade: number | null
          tipo_planta: string
          versao: number | null
          vigente: boolean | null
        }
        Insert: {
          adubo_por_unidade?: number | null
          corda_por_unidade?: number | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          mo_por_unidade?: number | null
          munck_por_unidade?: number | null
          terra_por_unidade?: number | null
          tipo_planta: string
          versao?: number | null
          vigente?: boolean | null
        }
        Update: {
          adubo_por_unidade?: number | null
          corda_por_unidade?: number | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          mo_por_unidade?: number | null
          munck_por_unidade?: number | null
          terra_por_unidade?: number | null
          tipo_planta?: string
          versao?: number | null
          vigente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "coeficientes_insumos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coeficientes_insumos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_avaliacoes: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          colaborador_id: string
          comentario: string
          created_at: string
          id: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          colaborador_id: string
          comentario: string
          created_at?: string
          id?: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          colaborador_id?: string
          comentario?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_avaliacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_avaliacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_documentos: {
        Row: {
          colaborador_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome_arquivo: string
          tipo_documento: string
          url: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_arquivo: string
          tipo_documento?: string
          url: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_arquivo?: string
          tipo_documento?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_inativacoes: {
        Row: {
          colaborador_id: string
          created_at: string
          data_inativacao: string
          id: string
          motivo: string
          registrado_por: string | null
          registrado_por_nome: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_inativacao?: string
          id?: string
          motivo: string
          registrado_por?: string | null
          registrado_por_nome?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_inativacao?: string
          id?: string
          motivo?: string
          registrado_por?: string | null
          registrado_por_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_inativacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_inativacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
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
          possui_cnh: boolean | null
          possui_conducao: boolean | null
          sub_equipe: string | null
          tamanho_calca: string | null
          tamanho_calcado: string | null
          tamanho_camiseta: string | null
          telefone: string | null
          tipo_cnh: string | null
          tipo_conducao: string | null
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
          possui_cnh?: boolean | null
          possui_conducao?: boolean | null
          sub_equipe?: string | null
          tamanho_calca?: string | null
          tamanho_calcado?: string | null
          tamanho_camiseta?: string | null
          telefone?: string | null
          tipo_cnh?: string | null
          tipo_conducao?: string | null
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
          possui_cnh?: boolean | null
          possui_conducao?: boolean | null
          sub_equipe?: string | null
          tamanho_calca?: string | null
          tamanho_calcado?: string | null
          tamanho_camiseta?: string | null
          telefone?: string | null
          tipo_cnh?: string | null
          tipo_conducao?: string | null
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
      conciliacao_extratos: {
        Row: {
          arquivo_nome: string | null
          banco: string
          created_by: string | null
          data_extrato: string
          id: string
          processado_em: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          banco: string
          created_by?: string | null
          data_extrato: string
          id?: string
          processado_em?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          banco?: string
          created_by?: string | null
          data_extrato?: string
          id?: string
          processado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conciliacao_extratos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliacao_extratos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliacao_lancamentos: {
        Row: {
          chave_pix_raw: string | null
          cliente_id: string | null
          conta_raw: string | null
          created_at: string
          data_lancamento: string
          descricao: string | null
          extrato_id: string | null
          id: string
          remetente_raw: string | null
          status: string
          valor: number
        }
        Insert: {
          chave_pix_raw?: string | null
          cliente_id?: string | null
          conta_raw?: string | null
          created_at?: string
          data_lancamento: string
          descricao?: string | null
          extrato_id?: string | null
          id?: string
          remetente_raw?: string | null
          status?: string
          valor: number
        }
        Update: {
          chave_pix_raw?: string | null
          cliente_id?: string | null
          conta_raw?: string | null
          created_at?: string
          data_lancamento?: string
          descricao?: string | null
          extrato_id?: string | null
          id?: string
          remetente_raw?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "conciliacao_lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliacao_lancamentos_extrato_id_fkey"
            columns: ["extrato_id"]
            isOneToOne: false
            referencedRelation: "conciliacao_extratos"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliacao_regras: {
        Row: {
          agencia: string | null
          chave_pix: string | null
          cliente_id: string | null
          conta: string | null
          created_at: string
          descricao_padrao: string | null
          id: string
          nome_remetente: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          chave_pix?: string | null
          cliente_id?: string | null
          conta?: string | null
          created_at?: string
          descricao_padrao?: string | null
          id?: string
          nome_remetente?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          chave_pix?: string | null
          cliente_id?: string | null
          conta?: string | null
          created_at?: string
          descricao_padrao?: string | null
          id?: string
          nome_remetente?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conciliacao_regras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cards: {
        Row: {
          cliente_id: string | null
          contato_cargo: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_whatsapp: string | null
          created_at: string | null
          id: string
          observacoes: string | null
          prazo: string | null
          projeto_id: string | null
          responsavel_id: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          created_at?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string | null
          projeto_id?: string | null
          responsavel_id?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          contato_cargo?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_whatsapp?: string | null
          created_at?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string | null
          projeto_id?: string | null
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_cards_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cards_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_correcoes_ia: {
        Row: {
          colaborador_id: string | null
          contexto: string | null
          created_at: string | null
          id: string
          o_que_deveria_ter_feito: string
          o_que_fez: string
        }
        Insert: {
          colaborador_id?: string | null
          contexto?: string | null
          created_at?: string | null
          id?: string
          o_que_deveria_ter_feito: string
          o_que_fez: string
        }
        Update: {
          colaborador_id?: string | null
          contexto?: string | null
          created_at?: string | null
          id?: string
          o_que_deveria_ter_feito?: string
          o_que_fez?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_correcoes_ia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_correcoes_ia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_followups: {
        Row: {
          card_id: string
          created_at: string | null
          data_retorno: string
          dias_alerta: number
          id: string
          observacao: string | null
          status: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          data_retorno: string
          dias_alerta?: number
          id?: string
          observacao?: string | null
          status?: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          data_retorno?: string
          dias_alerta?: number
          id?: string
          observacao?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_followups_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_historico: {
        Row: {
          card_id: string
          colaborador_id: string | null
          created_at: string | null
          descricao: string
          id: string
        }
        Insert: {
          card_id: string
          colaborador_id?: string | null
          created_at?: string | null
          descricao: string
          id?: string
        }
        Update: {
          card_id?: string
          colaborador_id?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_historico_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_historico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_historico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
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
      diario_alertas: {
        Row: {
          cliente_id: string
          created_at: string
          descricao: string
          id: string
          projeto_id: string
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por_nome: string | null
          visita_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descricao: string
          id?: string
          projeto_id: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por_nome?: string | null
          visita_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descricao?: string
          id?: string
          projeto_id?: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por_nome?: string | null
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_alertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_alertas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_alertas_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "diario_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_areas: {
        Row: {
          created_at: string
          houve_melhora: boolean
          id: string
          nome_area: string
          projeto_id: string
          relato: string | null
          servicos: string[] | null
          status_anterior: string | null
          status_area: string | null
          visita_id: string
        }
        Insert: {
          created_at?: string
          houve_melhora?: boolean
          id?: string
          nome_area: string
          projeto_id: string
          relato?: string | null
          servicos?: string[] | null
          status_anterior?: string | null
          status_area?: string | null
          visita_id: string
        }
        Update: {
          created_at?: string
          houve_melhora?: boolean
          id?: string
          nome_area?: string
          projeto_id?: string
          relato?: string | null
          servicos?: string[] | null
          status_anterior?: string | null
          status_area?: string | null
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_areas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_areas_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "diario_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_entregas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_entrega: string
          descricao: string
          hora_entrega: string | null
          id: string
          itens: Json | null
          observacoes: string | null
          projeto_id: string | null
          recebido_por: string | null
          registrado_por_nome: string | null
          tipo_entrega: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_entrega: string
          descricao: string
          hora_entrega?: string | null
          id?: string
          itens?: Json | null
          observacoes?: string | null
          projeto_id?: string | null
          recebido_por?: string | null
          registrado_por_nome?: string | null
          tipo_entrega?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_entrega?: string
          descricao?: string
          hora_entrega?: string | null
          id?: string
          itens?: Json | null
          observacoes?: string | null
          projeto_id?: string | null
          recebido_por?: string | null
          registrado_por_nome?: string | null
          tipo_entrega?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diario_entregas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_entregas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_equipe_area: {
        Row: {
          area_id: string
          colaborador_id: string | null
          colaborador_nome: string
          created_at: string
          descricao_atividade: string | null
          funcao: string | null
          id: string
          visita_id: string
        }
        Insert: {
          area_id: string
          colaborador_id?: string | null
          colaborador_nome: string
          created_at?: string
          descricao_atividade?: string | null
          funcao?: string | null
          id?: string
          visita_id: string
        }
        Update: {
          area_id?: string
          colaborador_id?: string | null
          colaborador_nome?: string
          created_at?: string
          descricao_atividade?: string | null
          funcao?: string | null
          id?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_equipe_area_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "diario_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_equipe_area_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_equipe_area_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_equipe_area_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "diario_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_insumos_area: {
        Row: {
          area_id: string
          created_at: string
          id: string
          insumo_id: string | null
          insumo_nome: string
          quantidade: string | null
          unidade: string | null
          visita_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          insumo_id?: string | null
          insumo_nome: string
          quantidade?: string | null
          unidade?: string | null
          visita_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          insumo_id?: string | null
          insumo_nome?: string
          quantidade?: string | null
          unidade?: string | null
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_insumos_area_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "diario_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_insumos_area_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_insumos_area_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "diario_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_maquinas_area: {
        Row: {
          area_id: string
          created_at: string
          id: string
          maquina_id: string | null
          maquina_nome: string
          visita_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          maquina_id?: string | null
          maquina_nome: string
          visita_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          maquina_id?: string | null
          maquina_nome?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_maquinas_area_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "diario_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_maquinas_area_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_maquinas_area_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "diario_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_midia: {
        Row: {
          area_id: string | null
          created_at: string
          descricao: string | null
          id: string
          thumbnail_url: string | null
          tipo: string | null
          url: string
          visita_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          thumbnail_url?: string | null
          tipo?: string | null
          url: string
          visita_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          thumbnail_url?: string | null
          tipo?: string | null
          url?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_midia_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "diario_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_midia_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "diario_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_visitas: {
        Row: {
          cliente_id: string
          created_at: string
          data_visita: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          observacoes_internas: string | null
          periodo: string | null
          projeto_id: string
          registrado_por_nome: string | null
          status_geral: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_visita: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          observacoes_internas?: string | null
          periodo?: string | null
          projeto_id: string
          registrado_por_nome?: string | null
          status_geral?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_visita?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          observacoes_internas?: string | null
          periodo?: string | null
          projeto_id?: string
          registrado_por_nome?: string | null
          status_geral?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diario_visitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_visitas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
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
      estoque_movimentacoes: {
        Row: {
          created_at: string
          fornecedor_id: string | null
          id: string
          item_id: string
          item_tipo: string
          observacoes: string | null
          origem: string
          preco_unitario: number | null
          quantidade: number
          referencia_id: string | null
          registrado_por_nome: string | null
          tipo_movimento: string
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          item_id: string
          item_tipo: string
          observacoes?: string | null
          origem?: string
          preco_unitario?: number | null
          quantidade: number
          referencia_id?: string | null
          registrado_por_nome?: string | null
          tipo_movimento: string
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          item_id?: string
          item_tipo?: string
          observacoes?: string | null
          origem?: string
          preco_unitario?: number | null
          quantidade?: number
          referencia_id?: string | null
          registrado_por_nome?: string | null
          tipo_movimento?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_movimentacoes: {
        Row: {
          categoria: string
          created_at: string
          data_movimentacao: string
          descricao: string
          estoque_movimentacao_id: string | null
          fornecedor_id: string | null
          id: string
          registrado_por_nome: string | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_movimentacao?: string
          descricao: string
          estoque_movimentacao_id?: string | null
          fornecedor_id?: string | null
          id?: string
          registrado_por_nome?: string | null
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_movimentacao?: string
          descricao?: string
          estoque_movimentacao_id?: string | null
          fornecedor_id?: string | null
          id?: string
          registrado_por_nome?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_movimentacoes_estoque_movimentacao_id_fkey"
            columns: ["estoque_movimentacao_id"]
            isOneToOne: false
            referencedRelation: "estoque_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_movimentacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_parcelas: {
        Row: {
          cliente_id: string
          created_at: string
          data_vencimento: string | null
          id: string
          numero_parcela: number
          observacoes: string | null
          projeto_id: string
          renovacao_alertada: boolean
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_vencimento?: string | null
          id?: string
          numero_parcela?: number
          observacoes?: string | null
          projeto_id: string
          renovacao_alertada?: boolean
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_vencimento?: string | null
          id?: string
          numero_parcela?: number
          observacoes?: string | null
          projeto_id?: string
          renovacao_alertada?: boolean
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_parcelas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_parcelas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          categoria_fornecedor: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          mercado: string | null
          nome: string
          nome_alternativo: string | null
          observacoes: string | null
          status: string
          telefone: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          categoria_fornecedor?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          mercado?: string | null
          nome: string
          nome_alternativo?: string | null
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          categoria_fornecedor?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          mercado?: string | null
          nome?: string
          nome_alternativo?: string | null
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      fornecedores_merge_log: {
        Row: {
          contadores: Json
          dados_anteriores: Json
          duplicado_id: string
          duplicado_nome: string
          executado_em: string
          executado_por: string | null
          executado_por_nome: string | null
          id: string
          principal_id: string
        }
        Insert: {
          contadores?: Json
          dados_anteriores: Json
          duplicado_id: string
          duplicado_nome: string
          executado_em?: string
          executado_por?: string | null
          executado_por_nome?: string | null
          id?: string
          principal_id: string
        }
        Update: {
          contadores?: Json
          dados_anteriores?: Json
          duplicado_id?: string
          duplicado_nome?: string
          executado_em?: string
          executado_por?: string | null
          executado_por_nome?: string | null
          id?: string
          principal_id?: string
        }
        Relationships: []
      }
      historico_precos: {
        Row: {
          criado_em: string | null
          data_orcamento: string
          fornecedor_id: string | null
          id: string
          item_id: string
          item_tipo: string
          observacoes: string | null
          preco: number
          registrado_por: string | null
        }
        Insert: {
          criado_em?: string | null
          data_orcamento: string
          fornecedor_id?: string | null
          id?: string
          item_id: string
          item_tipo: string
          observacoes?: string | null
          preco: number
          registrado_por?: string | null
        }
        Update: {
          criado_em?: string | null
          data_orcamento?: string
          fornecedor_id?: string | null
          id?: string
          item_id?: string
          item_tipo?: string
          observacoes?: string | null
          preco?: number
          registrado_por?: string | null
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
            foreignKeyName: "historico_precos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_precos_fornecedor: {
        Row: {
          created_at: string | null
          data_cotacao: string
          fornecedor_id: string | null
          id: string
          planta_id: string | null
          porte: string | null
          preco: number
          projeto_id: string | null
          unidade: string | null
        }
        Insert: {
          created_at?: string | null
          data_cotacao: string
          fornecedor_id?: string | null
          id?: string
          planta_id?: string | null
          porte?: string | null
          preco: number
          projeto_id?: string | null
          unidade?: string | null
        }
        Update: {
          created_at?: string | null
          data_cotacao?: string
          fornecedor_id?: string | null
          id?: string
          planta_id?: string | null
          porte?: string | null
          preco?: number
          projeto_id?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_precos_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_fornecedor_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_fornecedor_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
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
          descricao_produto: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          observacoes: string | null
          preco_unitario: number | null
          ultima_compra: string | null
          unidade: string | null
          updated_at: string | null
          updated_by: string | null
          volume_apresentacao: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao_produto?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string | null
          updated_by?: string | null
          volume_apresentacao?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao_produto?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string | null
          updated_by?: string | null
          volume_apresentacao?: string | null
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
      irrigacao_historico: {
        Row: {
          colaborador_id: string | null
          created_at: string | null
          id: string
          observacao: string | null
          origem: string | null
          projeto_id: string
          setor_id: string
          tempo_anterior_minutos: number | null
          tempo_novo_minutos: number
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string | null
          id?: string
          observacao?: string | null
          origem?: string | null
          projeto_id: string
          setor_id: string
          tempo_anterior_minutos?: number | null
          tempo_novo_minutos: number
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string | null
          id?: string
          observacao?: string | null
          origem?: string | null
          projeto_id?: string
          setor_id?: string
          tempo_anterior_minutos?: number | null
          tempo_novo_minutos?: number
        }
        Relationships: [
          {
            foreignKeyName: "irrigacao_historico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irrigacao_historico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irrigacao_historico_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irrigacao_historico_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "irrigacao_setores"
            referencedColumns: ["id"]
          },
        ]
      }
      irrigacao_setores: {
        Row: {
          created_at: string | null
          descricao_area: string | null
          foto_url: string | null
          id: string
          nome: string
          projeto_id: string
          tempo_atual_minutos: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao_area?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          projeto_id: string
          tempo_atual_minutos?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao_area?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          projeto_id?: string
          tempo_atual_minutos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "irrigacao_setores_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_cliente: {
        Row: {
          assessores: string | null
          cliente_id: string
          cnpj: string | null
          contato_principal: string | null
          cpf: string | null
          created_at: string | null
          data_aniversario: string | null
          email: string | null
          endereco_completo: string | null
          funcionarios_casa: string | null
          id: string
          inscricao_estadual: string | null
          nome: string
          observacoes: string | null
          razao_social: string | null
          tipo_pessoa: string
        }
        Insert: {
          assessores?: string | null
          cliente_id: string
          cnpj?: string | null
          contato_principal?: string | null
          cpf?: string | null
          created_at?: string | null
          data_aniversario?: string | null
          email?: string | null
          endereco_completo?: string | null
          funcionarios_casa?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome: string
          observacoes?: string | null
          razao_social?: string | null
          tipo_pessoa?: string
        }
        Update: {
          assessores?: string | null
          cliente_id?: string
          cnpj?: string | null
          contato_principal?: string | null
          cpf?: string | null
          created_at?: string | null
          data_aniversario?: string | null
          email?: string | null
          endereco_completo?: string | null
          funcionarios_casa?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome?: string
          observacoes?: string | null
          razao_social?: string | null
          tipo_pessoa?: string
        }
        Relationships: [
          {
            foreignKeyName: "locais_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      mafe_correcoes_ia: {
        Row: {
          colaborador_id: string | null
          contexto: string | null
          created_at: string | null
          id: string
          o_que_deveria_ter_feito: string
          o_que_fez: string
          projeto_id: string | null
        }
        Insert: {
          colaborador_id?: string | null
          contexto?: string | null
          created_at?: string | null
          id?: string
          o_que_deveria_ter_feito: string
          o_que_fez: string
          projeto_id?: string | null
        }
        Update: {
          colaborador_id?: string | null
          contexto?: string | null
          created_at?: string | null
          id?: string
          o_que_deveria_ter_feito?: string
          o_que_fez?: string
          projeto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mafe_correcoes_ia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mafe_correcoes_ia_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mafe_correcoes_ia_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencao_recursos: {
        Row: {
          created_at: string
          horas_uso: number | null
          id: string
          insumo_id: string | null
          maquina_id: string | null
          observacao: string | null
          quantidade: number | null
          tipo: string
          unidade: string | null
          visita_id: string
        }
        Insert: {
          created_at?: string
          horas_uso?: number | null
          id?: string
          insumo_id?: string | null
          maquina_id?: string | null
          observacao?: string | null
          quantidade?: number | null
          tipo: string
          unidade?: string | null
          visita_id: string
        }
        Update: {
          created_at?: string
          horas_uso?: number | null
          id?: string
          insumo_id?: string | null
          maquina_id?: string | null
          observacao?: string | null
          quantidade?: number | null
          tipo?: string
          unidade?: string | null
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_recursos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencao_recursos_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencao_recursos_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "manutencao_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencao_servicos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          observacao: string | null
          quantidade: number | null
          tipo: string
          unidade: string | null
          visita_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          quantidade?: number | null
          tipo: string
          unidade?: string | null
          visita_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          quantidade?: number | null
          tipo?: string
          unidade?: string | null
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_servicos_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "manutencao_visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencao_visitas: {
        Row: {
          created_at: string
          created_by: string | null
          data_visita: string
          equipe_ids: string[]
          horas_por_pessoa: Json | null
          horas_trabalhadas: number
          id: string
          midia: Json | null
          observacoes_internas: string | null
          ocorrencias: string | null
          projeto_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_visita: string
          equipe_ids?: string[]
          horas_por_pessoa?: Json | null
          horas_trabalhadas?: number
          id?: string
          midia?: Json | null
          observacoes_internas?: string | null
          ocorrencias?: string | null
          projeto_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_visita?: string
          equipe_ids?: string[]
          horas_por_pessoa?: Json | null
          horas_trabalhadas?: number
          id?: string
          midia?: Json | null
          observacoes_internas?: string | null
          ocorrencias?: string | null
          projeto_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_visitas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
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
      maquinas_manutencoes: {
        Row: {
          created_at: string
          created_by: string | null
          custo: number | null
          data_manutencao: string
          descricao: string
          id: string
          maquina_id: string
          observacoes: string | null
          realizado_por: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_manutencao: string
          descricao: string
          id?: string
          maquina_id: string
          observacoes?: string | null
          realizado_por?: string | null
          tipo?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_manutencao?: string
          descricao?: string
          id?: string
          maquina_id?: string
          observacoes?: string | null
          realizado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "maquinas_manutencoes_maquina_id_fkey"
            columns: ["maquina_id"]
            isOneToOne: false
            referencedRelation: "maquinas"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_descritivo: {
        Row: {
          altura_m: number | null
          altura_max_m: number | null
          altura_min_m: number | null
          categoria: string | null
          created_at: string
          dap: string | null
          id: string
          insumo_id: string | null
          nome_cientifico: string | null
          nome_popular: string
          ordem: number | null
          planta_id: string | null
          projeto_id: string
          quantidade: number
          tipo: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          altura_m?: number | null
          altura_max_m?: number | null
          altura_min_m?: number | null
          categoria?: string | null
          created_at?: string
          dap?: string | null
          id?: string
          insumo_id?: string | null
          nome_cientifico?: string | null
          nome_popular?: string
          ordem?: number | null
          planta_id?: string | null
          projeto_id: string
          quantidade?: number
          tipo?: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          altura_m?: number | null
          altura_max_m?: number | null
          altura_min_m?: number | null
          categoria?: string | null
          created_at?: string
          dap?: string | null
          id?: string
          insumo_id?: string | null
          nome_cientifico?: string | null
          nome_popular?: string
          ordem?: number | null
          planta_id?: string | null
          projeto_id?: string
          quantidade?: number
          tipo?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_descritivo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_descritivo_planta_id_fkey"
            columns: ["planta_id"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_descritivo_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_checklist: {
        Row: {
          created_at: string | null
          fornecedor_id: string | null
          id: string
          item_id: string | null
          obs: string | null
          orcamento_id: string | null
          qtd_recebida: number | null
          recebido: string | null
          recebido_em: string | null
          recebido_por: string | null
          unidade: string | null
        }
        Insert: {
          created_at?: string | null
          fornecedor_id?: string | null
          id?: string
          item_id?: string | null
          obs?: string | null
          orcamento_id?: string | null
          qtd_recebida?: number | null
          recebido?: string | null
          recebido_em?: string | null
          recebido_por?: string | null
          unidade?: string | null
        }
        Update: {
          created_at?: string | null
          fornecedor_id?: string | null
          id?: string
          item_id?: string | null
          obs?: string | null
          orcamento_id?: string | null
          qtd_recebida?: number | null
          recebido?: string | null
          recebido_em?: string | null
          recebido_por?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_checklist_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_checklist_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "orcamento_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_checklist_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_checklist_recebido_por_fkey"
            columns: ["recebido_por"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_checklist_recebido_por_fkey"
            columns: ["recebido_por"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_comissoes: {
        Row: {
          beneficiario: string | null
          created_at: string | null
          id: string
          orcamento_id: string | null
          percentual: number | null
          tipo: string | null
          valor_calculado: number | null
        }
        Insert: {
          beneficiario?: string | null
          created_at?: string | null
          id?: string
          orcamento_id?: string | null
          percentual?: number | null
          tipo?: string | null
          valor_calculado?: number | null
        }
        Update: {
          beneficiario?: string | null
          created_at?: string | null
          id?: string
          orcamento_id?: string | null
          percentual?: number | null
          tipo?: string | null
          valor_calculado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_comissoes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_cotacoes: {
        Row: {
          cotado_em: string | null
          cotado_por: string | null
          disponivel: string | null
          fornecedor_id: string | null
          id: string
          item_id: string | null
          obs: string | null
          porte_ofertado: string | null
          status_selecao: string | null
          unidade_ofertada: string | null
          valor_unitario_cotado: number | null
        }
        Insert: {
          cotado_em?: string | null
          cotado_por?: string | null
          disponivel?: string | null
          fornecedor_id?: string | null
          id?: string
          item_id?: string | null
          obs?: string | null
          porte_ofertado?: string | null
          status_selecao?: string | null
          unidade_ofertada?: string | null
          valor_unitario_cotado?: number | null
        }
        Update: {
          cotado_em?: string | null
          cotado_por?: string | null
          disponivel?: string | null
          fornecedor_id?: string | null
          id?: string
          item_id?: string | null
          obs?: string | null
          porte_ofertado?: string | null
          status_selecao?: string | null
          unidade_ofertada?: string | null
          valor_unitario_cotado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_cotacoes_cotado_por_fkey"
            columns: ["cotado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_cotacoes_cotado_por_fkey"
            columns: ["cotado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
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
      orcamento_custos_indiretos: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          obs: string | null
          orcamento_id: string | null
          quantidade: number | null
          tipo: string | null
          total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          obs?: string | null
          orcamento_id?: string | null
          quantidade?: number | null
          tipo?: string | null
          total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          obs?: string | null
          orcamento_id?: string | null
          quantidade?: number | null
          tipo?: string | null
          total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_custos_indiretos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_fretes: {
        Row: {
          created_at: string | null
          descricao_percurso: string
          id: string
          margem_seguranca_pct: number | null
          obs: string | null
          orcamento_id: string | null
          qtd_esperada: number | null
          qtd_orcar: number | null
          transportador: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          descricao_percurso: string
          id?: string
          margem_seguranca_pct?: number | null
          obs?: string | null
          orcamento_id?: string | null
          qtd_esperada?: number | null
          qtd_orcar?: number | null
          transportador?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          descricao_percurso?: string
          id?: string
          margem_seguranca_pct?: number | null
          obs?: string | null
          orcamento_id?: string | null
          qtd_esperada?: number | null
          qtd_orcar?: number | null
          transportador?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_fretes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_insumos: {
        Row: {
          calculado_automaticamente: boolean | null
          created_at: string | null
          fornecedor_id: string | null
          id: string
          insumo_id: string | null
          margem_seguranca_pct: number | null
          markup_pct: number | null
          nome: string
          obs_interna: string | null
          obs_proposta: string | null
          orcamento_id: string | null
          ordem: number | null
          preco_venda_total: number | null
          preco_venda_unitario: number | null
          quantidade_esperada: number | null
          quantidade_orcar: number | null
          unidade: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          calculado_automaticamente?: boolean | null
          created_at?: string | null
          fornecedor_id?: string | null
          id?: string
          insumo_id?: string | null
          margem_seguranca_pct?: number | null
          markup_pct?: number | null
          nome: string
          obs_interna?: string | null
          obs_proposta?: string | null
          orcamento_id?: string | null
          ordem?: number | null
          preco_venda_total?: number | null
          preco_venda_unitario?: number | null
          quantidade_esperada?: number | null
          quantidade_orcar?: number | null
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          calculado_automaticamente?: boolean | null
          created_at?: string | null
          fornecedor_id?: string | null
          id?: string
          insumo_id?: string | null
          margem_seguranca_pct?: number | null
          markup_pct?: number | null
          nome?: string
          obs_interna?: string | null
          obs_proposta?: string | null
          orcamento_id?: string | null
          ordem?: number | null
          preco_venda_total?: number | null
          preco_venda_unitario?: number | null
          quantidade_esperada?: number | null
          quantidade_orcar?: number | null
          unidade?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_insumos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_insumos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          categoria: string | null
          created_at: string | null
          custo_unitario: number | null
          fornecedor_escolhido_id: string | null
          id: string
          imposto_pct: number | null
          margem_bruta_pct: number | null
          margem_seguranca_pct: number | null
          markup_motivo: string | null
          markup_pct: number | null
          nome_cientifico: string | null
          nome_popular: string
          obs_interna: string | null
          obs_proposta: string | null
          orcamento_id: string | null
          ordem: number | null
          origem: string | null
          porte_divergente: boolean | null
          porte_fornecedor: string | null
          porte_solicitado: string | null
          preco_venda_final: number | null
          preco_venda_unitario: number | null
          quantidade_esperada: number
          quantidade_orcar: number | null
          unidade: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          custo_unitario?: number | null
          fornecedor_escolhido_id?: string | null
          id?: string
          imposto_pct?: number | null
          margem_bruta_pct?: number | null
          margem_seguranca_pct?: number | null
          markup_motivo?: string | null
          markup_pct?: number | null
          nome_cientifico?: string | null
          nome_popular: string
          obs_interna?: string | null
          obs_proposta?: string | null
          orcamento_id?: string | null
          ordem?: number | null
          origem?: string | null
          porte_divergente?: boolean | null
          porte_fornecedor?: string | null
          porte_solicitado?: string | null
          preco_venda_final?: number | null
          preco_venda_unitario?: number | null
          quantidade_esperada: number
          quantidade_orcar?: number | null
          unidade?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          custo_unitario?: number | null
          fornecedor_escolhido_id?: string | null
          id?: string
          imposto_pct?: number | null
          margem_bruta_pct?: number | null
          margem_seguranca_pct?: number | null
          markup_motivo?: string | null
          markup_pct?: number | null
          nome_cientifico?: string | null
          nome_popular?: string
          obs_interna?: string | null
          obs_proposta?: string | null
          orcamento_id?: string | null
          ordem?: number | null
          origem?: string | null
          porte_divergente?: boolean | null
          porte_fornecedor?: string | null
          porte_solicitado?: string | null
          preco_venda_final?: number | null
          preco_venda_unitario?: number | null
          quantidade_esperada?: number
          quantidade_orcar?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_fornecedor_escolhido_id_fkey"
            columns: ["fornecedor_escolhido_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_mo: {
        Row: {
          aliquota_mes_pct: number | null
          cargo_id: string | null
          created_at: string | null
          custo_total: number | null
          id: string
          orcamento_id: string | null
          qtd_dias: number | null
          qtd_funcionarios: number | null
          salario_diario: number | null
          tipo_nf: string | null
          valor_com_imposto: number | null
        }
        Insert: {
          aliquota_mes_pct?: number | null
          cargo_id?: string | null
          created_at?: string | null
          custo_total?: number | null
          id?: string
          orcamento_id?: string | null
          qtd_dias?: number | null
          qtd_funcionarios?: number | null
          salario_diario?: number | null
          tipo_nf?: string | null
          valor_com_imposto?: number | null
        }
        Update: {
          aliquota_mes_pct?: number | null
          cargo_id?: string | null
          created_at?: string | null
          custo_total?: number | null
          id?: string
          orcamento_id?: string | null
          qtd_dias?: number | null
          qtd_funcionarios?: number | null
          salario_diario?: number | null
          tipo_nf?: string | null
          valor_com_imposto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_mo_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos_mo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_mo_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_transporte: {
        Row: {
          created_at: string | null
          id: string
          orcamento_id: string | null
          qtd_dias: number | null
          qtd_km: number | null
          subtotal: number | null
          tipo: string | null
          valor_km: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          orcamento_id?: string | null
          qtd_dias?: number | null
          qtd_km?: number | null
          subtotal?: number | null
          tipo?: string | null
          valor_km?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          orcamento_id?: string | null
          qtd_dias?: number | null
          qtd_km?: number | null
          subtotal?: number | null
          tipo?: string | null
          valor_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_transporte_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_versoes: {
        Row: {
          campo_alterado: string | null
          created_at: string | null
          id: string
          motivo: string | null
          orcamento_id: string | null
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
          versao_sufixo: string | null
        }
        Insert: {
          campo_alterado?: string | null
          created_at?: string | null
          id?: string
          motivo?: string | null
          orcamento_id?: string | null
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          versao_sufixo?: string | null
        }
        Update: {
          campo_alterado?: string | null
          created_at?: string | null
          id?: string
          motivo?: string | null
          orcamento_id?: string | null
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          versao_sufixo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_versoes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_versoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_versoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          aliquota_mes_pct: number | null
          aprovado_por: string | null
          area_m2: number | null
          cidade: string | null
          cliente_id: string | null
          codigo: string
          created_at: string | null
          data_aprovacao: string | null
          data_criacao: string | null
          data_envio: string | null
          data_expiracao: string | null
          data_nao_aprovacao: string | null
          editavel: boolean | null
          estado: string | null
          id: string
          local_endereco: string | null
          margem_negociacao_pct: number | null
          motivo_nao_aprovacao: string | null
          obs_interna: string | null
          obs_proposta: string | null
          perfil_markup_id: string | null
          prazo_validade_dias: number | null
          responsavel_id: string | null
          status: string
          tipo_cliente: string | null
          tipo_nf: string | null
          tipo_proposta_id: string | null
          updated_at: string | null
          valor_negociado_final: number | null
          versao_sufixo: string | null
        }
        Insert: {
          aliquota_mes_pct?: number | null
          aprovado_por?: string | null
          area_m2?: number | null
          cidade?: string | null
          cliente_id?: string | null
          codigo: string
          created_at?: string | null
          data_aprovacao?: string | null
          data_criacao?: string | null
          data_envio?: string | null
          data_expiracao?: string | null
          data_nao_aprovacao?: string | null
          editavel?: boolean | null
          estado?: string | null
          id?: string
          local_endereco?: string | null
          margem_negociacao_pct?: number | null
          motivo_nao_aprovacao?: string | null
          obs_interna?: string | null
          obs_proposta?: string | null
          perfil_markup_id?: string | null
          prazo_validade_dias?: number | null
          responsavel_id?: string | null
          status?: string
          tipo_cliente?: string | null
          tipo_nf?: string | null
          tipo_proposta_id?: string | null
          updated_at?: string | null
          valor_negociado_final?: number | null
          versao_sufixo?: string | null
        }
        Update: {
          aliquota_mes_pct?: number | null
          aprovado_por?: string | null
          area_m2?: number | null
          cidade?: string | null
          cliente_id?: string | null
          codigo?: string
          created_at?: string | null
          data_aprovacao?: string | null
          data_criacao?: string | null
          data_envio?: string | null
          data_expiracao?: string | null
          data_nao_aprovacao?: string | null
          editavel?: boolean | null
          estado?: string | null
          id?: string
          local_endereco?: string | null
          margem_negociacao_pct?: number | null
          motivo_nao_aprovacao?: string | null
          obs_interna?: string | null
          obs_proposta?: string | null
          perfil_markup_id?: string | null
          prazo_validade_dias?: number | null
          responsavel_id?: string | null
          status?: string
          tipo_cliente?: string | null
          tipo_nf?: string | null
          tipo_proposta_id?: string | null
          updated_at?: string | null
          valor_negociado_final?: number | null
          versao_sufixo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_perfil_markup_id_fkey"
            columns: ["perfil_markup_id"]
            isOneToOne: false
            referencedRelation: "perfis_markup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_tipo_proposta_id_fkey"
            columns: ["tipo_proposta_id"]
            isOneToOne: false
            referencedRelation: "tipos_proposta"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_markup: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_markup_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_markup_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "colaboradores_basico"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_markup_categorias: {
        Row: {
          categoria: string
          created_at: string | null
          id: string
          imposto_pct: number | null
          markup_pct: number
          perfil_id: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          id?: string
          imposto_pct?: number | null
          markup_pct: number
          perfil_id?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          id?: string
          imposto_pct?: number | null
          markup_pct?: number
          perfil_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_markup_categorias_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_markup"
            referencedColumns: ["id"]
          },
        ]
      }
      plantas: {
        Row: {
          altura_m: number | null
          altura_max_m: number | null
          altura_min_m: number | null
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
          preco_unitario: number | null
          ultima_compra: string | null
          unidade: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          altura_m?: number | null
          altura_max_m?: number | null
          altura_min_m?: number | null
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
          preco_unitario?: number | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          altura_m?: number | null
          altura_max_m?: number | null
          altura_min_m?: number | null
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
      processo_etapas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          processo_id: string
          responsavel: string | null
          titulo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          processo_id: string
          responsavel?: string | null
          titulo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          processo_id?: string
          responsavel?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "processo_etapas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          area_id: string
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          objetivo: string | null
          ordem: number | null
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_id: string
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          objetivo?: string | null
          ordem?: number | null
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_id?: string
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          objetivo?: string | null
          ordem?: number | null
          titulo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
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
          ultimo_acesso: string | null
          updated_at: string
          whatsapp: string | null
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
          ultimo_acesso?: string | null
          updated_at?: string
          whatsapp?: string | null
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
          ultimo_acesso?: string | null
          updated_at?: string
          whatsapp?: string | null
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
      projeto_mao_de_obra: {
        Row: {
          created_at: string
          descricao: string
          dias_previstos: number
          id: string
          observacoes: string | null
          ordem: number | null
          projeto_id: string
          quantidade_funcionarios: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          dias_previstos?: number
          id?: string
          observacoes?: string | null
          ordem?: number | null
          projeto_id: string
          quantidade_funcionarios?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          dias_previstos?: number
          id?: string
          observacoes?: string | null
          ordem?: number | null
          projeto_id?: string
          quantidade_funcionarios?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_mao_de_obra_projeto_id_fkey"
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
          dia_vencimento: number | null
          id: string
          local_id: string | null
          observacoes: string | null
          parcelas_config: Json | null
          responsavel_id: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          updated_by: string | null
          valor_mensal: number | null
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
          dia_vencimento?: number | null
          id?: string
          local_id?: string | null
          observacoes?: string | null
          parcelas_config?: Json | null
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
          valor_mensal?: number | null
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
          dia_vencimento?: number | null
          id?: string
          local_id?: string | null
          observacoes?: string | null
          parcelas_config?: Json | null
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          valor_mensal?: number | null
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
          {
            foreignKeyName: "projetos_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais_cliente"
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
          altura_m: number | null
          altura_max_m: number | null
          altura_min_m: number | null
          created_at: string
          dap_cm: number | null
          id: string
          insumo_id: string | null
          observacao: string | null
          planta_id: string | null
          quantidade: number
          registro_id: string
          tipo_item: string
          unidade: string | null
        }
        Insert: {
          altura_m?: number | null
          altura_max_m?: number | null
          altura_min_m?: number | null
          created_at?: string
          dap_cm?: number | null
          id?: string
          insumo_id?: string | null
          observacao?: string | null
          planta_id?: string | null
          quantidade: number
          registro_id: string
          tipo_item: string
          unidade?: string | null
        }
        Update: {
          altura_m?: number | null
          altura_max_m?: number | null
          altura_min_m?: number | null
          created_at?: string
          dap_cm?: number | null
          id?: string
          insumo_id?: string | null
          observacao?: string | null
          planta_id?: string | null
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
      solicitacoes_compras: {
        Row: {
          condicao_pagamento: string | null
          created_at: string
          data_solicitacao: string
          decidido_em: string | null
          decidido_por: string | null
          decidido_por_nome: string | null
          id: string
          link_ou_contato: string | null
          motivo: string
          motivo_recusa: string | null
          observacoes: string | null
          solicitante_id: string | null
          solicitante_nome: string
          status: string
          updated_at: string
          urgencia: string
          valor_estimado: number | null
        }
        Insert: {
          condicao_pagamento?: string | null
          created_at?: string
          data_solicitacao?: string
          decidido_em?: string | null
          decidido_por?: string | null
          decidido_por_nome?: string | null
          id?: string
          link_ou_contato?: string | null
          motivo: string
          motivo_recusa?: string | null
          observacoes?: string | null
          solicitante_id?: string | null
          solicitante_nome: string
          status?: string
          updated_at?: string
          urgencia?: string
          valor_estimado?: number | null
        }
        Update: {
          condicao_pagamento?: string | null
          created_at?: string
          data_solicitacao?: string
          decidido_em?: string | null
          decidido_por?: string | null
          decidido_por_nome?: string | null
          id?: string
          link_ou_contato?: string | null
          motivo?: string
          motivo_recusa?: string | null
          observacoes?: string | null
          solicitante_id?: string | null
          solicitante_nome?: string
          status?: string
          updated_at?: string
          urgencia?: string
          valor_estimado?: number | null
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
      tipos_proposta: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome_completo: string
          sigla: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_completo: string
          sigla: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_completo?: string
          sigla?: string
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
      estoque_saldo: {
        Row: {
          item_id: string | null
          item_tipo: string | null
          saldo: number | null
          total_entradas: number | null
          total_saidas: number | null
          ultima_movimentacao: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_avaliacao: {
        Args: { p_colaborador_id: string; p_user_id: string }
        Returns: boolean
      }
      can_access_diario_project: {
        Args: { _projeto_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_manutencao_client: {
        Args: { _cliente_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_users: { Args: { _user_id: string }; Returns: boolean }
      check_inactive_clients: { Args: never; Returns: undefined }
      create_diario_visita_with_details: {
        Args: { payload: Json }
        Returns: string
      }
      detectar_fornecedores_duplicados: { Args: never; Returns: Json }
      get_colaborador_id: { Args: { _user_id: string }; Returns: string }
      get_user_area: { Args: { _user_id: string }; Returns: string }
      get_user_id_by_username: { Args: { _username: string }; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["user_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_allocated_to_project: {
        Args: { _projeto_id: string; _user_id: string }
        Returns: boolean
      }
      is_colaborador_ativo: { Args: { _user_id: string }; Returns: boolean }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
      merge_fornecedores: {
        Args: { p_duplicado_ids: string[]; p_principal_id: string }
        Returns: Json
      }
      normalize_cnpj: { Args: { _cnpj: string }; Returns: string }
      normalize_fornecedor_nome: { Args: { _nome: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      user_role:
        | "admin"
        | "gestor"
        | "operador"
        | "administrativo"
        | "gestao_campo"
        | "responsavel_obra"
        | "operador_campo"
        | "arquitetura"
        | "diretor"
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
      user_role: [
        "admin",
        "gestor",
        "operador",
        "administrativo",
        "gestao_campo",
        "responsavel_obra",
        "operador_campo",
        "arquitetura",
        "diretor",
      ],
    },
  },
} as const
