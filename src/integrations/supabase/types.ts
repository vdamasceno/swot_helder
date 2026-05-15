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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      consolidated_items: {
        Row: {
          category: Database["public"]["Enums"]["swot_category"]
          content: string
          created_at: string
          id: string
          indicator: string
          item_code: string
          period_id: string
          position: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["swot_category"]
          content: string
          created_at?: string
          id?: string
          indicator: string
          item_code: string
          period_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["swot_category"]
          content?: string
          created_at?: string
          id?: string
          indicator?: string
          item_code?: string
          period_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consolidated_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_periods: {
        Row: {
          closed_at: string | null
          concord_threshold: number
          created_at: string
          created_by: string | null
          id: string
          is_open: boolean
          name: string
          opened_at: string
          phase: Database["public"]["Enums"]["cycle_phase"]
          response_days: number
          year: number
        }
        Insert: {
          closed_at?: string | null
          concord_threshold?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_open?: boolean
          name: string
          opened_at?: string
          phase?: Database["public"]["Enums"]["cycle_phase"]
          response_days?: number
          year: number
        }
        Update: {
          closed_at?: string | null
          concord_threshold?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_open?: boolean
          name?: string
          opened_at?: string
          phase?: Database["public"]["Enums"]["cycle_phase"]
          response_days?: number
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      swot_entries: {
        Row: {
          category: Database["public"]["Enums"]["swot_category"]
          content: string
          created_at: string
          id: string
          item_code: string
          period_id: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["swot_category"]
          content: string
          created_at?: string
          id?: string
          item_code: string
          period_id: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["swot_category"]
          content?: string
          created_at?: string
          id?: string
          item_code?: string
          period_id?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swot_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      action_plans: {
        Row: {
          id: string
          period_id: string
          code: string
          action: string
          goal: string
          verification_indicator: string
          deadline_type: string
          deadline_date: string
          responsible: string
          resources: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          period_id: string
          code: string
          action?: string
          goal?: string
          verification_indicator?: string
          deadline_type?: string
          deadline_date?: string
          responsible?: string
          resources?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          period_id?: string
          code?: string
          action?: string
          goal?: string
          verification_indicator?: string
          deadline_type?: string
          deadline_date?: string
          responsible?: string
          resources?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_responses: {
        Row: {
          created_at: string
          id: string
          item_id: string
          period_id: string
          priority: Database["public"]["Enums"]["priority_temporal"] | null
          impact_level: Database["public"]["Enums"]["impact_level"] | null
          updated_at: string
          user_id: string
          vote: Database["public"]["Enums"]["validation_vote"]
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          period_id: string
          priority?: Database["public"]["Enums"]["priority_temporal"] | null
          impact_level?: Database["public"]["Enums"]["impact_level"] | null
          updated_at?: string
          user_id: string
          vote: Database["public"]["Enums"]["validation_vote"]
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          period_id?: string
          priority?: Database["public"]["Enums"]["priority_temporal"] | null
          impact_level?: Database["public"]["Enums"]["impact_level"] | null
          updated_at?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["validation_vote"]
        }
        Relationships: [
          {
            foreignKeyName: "validation_responses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "consolidated_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_responses_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "evaluation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_period_open: { Args: { _period_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "gestor" | "professor"
      cycle_phase: "rodada1" | "consolidacao" | "rodada2" | "encerrado"
      impact_level: "alto" | "medio" | "baixo"
      participant_type: "docente" | "discente" | "tecnico" | "egresso"
      priority_temporal: "curto" | "medio" | "longo"
      profile_status: "pending" | "approved" | "rejected"
      swot_category: "strength" | "weakness" | "opportunity" | "threat"
      validation_vote: "C" | "D" | "N"
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
      app_role: ["gestor", "professor"],
      cycle_phase: ["rodada1", "consolidacao", "rodada2", "encerrado"],
      impact_level: ["alto", "medio", "baixo"],
      participant_type: ["docente", "discente", "tecnico", "egresso"],
      priority_temporal: ["curto", "medio", "longo"],
      profile_status: ["pending", "approved", "rejected"],
      swot_category: ["strength", "weakness", "opportunity", "threat"],
      validation_vote: ["C", "D", "N"],
    },
  },
} as const
