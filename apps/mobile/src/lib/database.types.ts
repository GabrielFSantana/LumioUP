
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "accounts": {
                  Row: {
                    "created_at": string,"id": string,"is_archived": boolean,"kind": string,"name": string,"opening_balance_cents": number,"profile_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_archived"?: boolean,"kind"?: string,"name": string,"opening_balance_cents"?: number,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_archived"?: boolean,"kind"?: string,"name"?: string,"opening_balance_cents"?: number,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accounts_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "color": string,"created_at": string,"icon": string,"id": string,"is_archived": boolean,"kind": string,"name": string,"profile_id": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "color"?: string,"created_at"?: string,"icon"?: string,"id"?: string,"is_archived"?: boolean,"kind": string,"name": string,"profile_id": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"icon"?: string,"id"?: string,"is_archived"?: boolean,"kind"?: string,"name"?: string,"profile_id"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "accepted_at": string,"id": string,"profile_id": string,"type": string,"version": string
                  }
                  Insert: {
                    "accepted_at"?: string,"id"?: string,"profile_id": string,"type": string,"version": string
                  }
                  Update: {
                    "accepted_at"?: string,"id"?: string,"profile_id"?: string,"type"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"holdings": {
                  Row: {
                    "category_id": string,"created_at": string,"id": string,"is_archived": boolean,"name": string,"profile_id": string,"updated_at": string
                  }
                  Insert: {
                    "category_id": string,"created_at"?: string,"id"?: string,"is_archived"?: boolean,"name": string,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"id"?: string,"is_archived"?: boolean,"name"?: string,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "holdings_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "holdings_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string,"currency": string,"display_name": string,"experience_level": string,"id": string,"onboarding_done": boolean,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"currency"?: string,"display_name": string,"experience_level"?: string,"id": string,"onboarding_done"?: boolean,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"currency"?: string,"display_name"?: string,"experience_level"?: string,"id"?: string,"onboarding_done"?: boolean,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"transactions": {
                  Row: {
                    "account_id": string | null,"amount_cents": number,"category_id": string | null,"created_at": string,"deleted_at": string | null,"description": string | null,"holding_id": string | null,"id": string,"kind": string,"notes": string | null,"occurred_on": string,"payment_method": string | null,"profile_id": string,"to_account_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "account_id"?: string | null,"amount_cents": number,"category_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"holding_id"?: string | null,"id"?: string,"kind": string,"notes"?: string | null,"occurred_on": string,"payment_method"?: string | null,"profile_id": string,"to_account_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "account_id"?: string | null,"amount_cents"?: number,"category_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"holding_id"?: string | null,"id"?: string,"kind"?: string,"notes"?: string | null,"occurred_on"?: string,"payment_method"?: string | null,"profile_id"?: string,"to_account_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_holding_id_fkey"
      columns: ["holding_id"]
isOneToOne: false
      referencedRelation: "holdings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_to_account_id_fkey"
      columns: ["to_account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    }
                  ]
                },"user_settings": {
                  Row: {
                    "biometric_lock": boolean,"created_at": string,"profile_id": string,"share_amounts_with_clubs": boolean,"show_in_club_ranking": boolean,"updated_at": string
                  }
                  Insert: {
                    "biometric_lock"?: boolean,"created_at"?: string,"profile_id": string,"share_amounts_with_clubs"?: boolean,"show_in_club_ranking"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "biometric_lock"?: boolean,"created_at"?: string,"profile_id"?: string,"share_amounts_with_clubs"?: boolean,"show_in_club_ranking"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_settings_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "seed_default_data":
{ Args: { "p_profile": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
