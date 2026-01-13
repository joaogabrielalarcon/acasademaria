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
          ativo: boolean
          created_at: string
          funcao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      insumos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          id: string
          nome: string
          unidade: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          nome: string
          unidade?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          nome?: string
          unidade?: string | null
        }
        Relationships: []
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
      registros: {
        Row: {
          area_funcional: string | null
          cliente_id: string
          colaboradores_ids: string[] | null
          created_at: string
          data_servico: string
          descricao: string
          hora_servico: string | null
          humor_do_jardim: string | null
          id: string
          midia: Json | null
          observacoes_internas: string | null
          tags: string[] | null
          tipo: string
          trecho_id: string | null
          updated_at: string
        }
        Insert: {
          area_funcional?: string | null
          cliente_id: string
          colaboradores_ids?: string[] | null
          created_at?: string
          data_servico: string
          descricao: string
          hora_servico?: string | null
          humor_do_jardim?: string | null
          id?: string
          midia?: Json | null
          observacoes_internas?: string | null
          tags?: string[] | null
          tipo: string
          trecho_id?: string | null
          updated_at?: string
        }
        Update: {
          area_funcional?: string | null
          cliente_id?: string
          colaboradores_ids?: string[] | null
          created_at?: string
          data_servico?: string
          descricao?: string
          hora_servico?: string | null
          humor_do_jardim?: string | null
          id?: string
          midia?: Json | null
          observacoes_internas?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
