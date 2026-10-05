
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
                },"achievements": {
                  Row: {
                    "code": string,"color": string,"description": string,"enabled": boolean,"icon": string,"metric": string,"name": string,"sort_order": number,"threshold": number,"xp_reward": number
                  }
                  Insert: {
                    "code": string,"color": string,"description": string,"enabled"?: boolean,"icon": string,"metric": string,"name": string,"sort_order"?: number,"threshold": number,"xp_reward": number
                  }
                  Update: {
                    "code"?: string,"color"?: string,"description"?: string,"enabled"?: boolean,"icon"?: string,"metric"?: string,"name"?: string,"sort_order"?: number,"threshold"?: number,"xp_reward"?: number
                  }
                  Relationships: [
                    
                  ]
                },"activity_days": {
                  Row: {
                    "day": string,"profile_id": string
                  }
                  Insert: {
                    "day": string,"profile_id": string
                  }
                  Update: {
                    "day"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_days_profile_id_fkey"
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
                },"goal_contributions": {
                  Row: {
                    "amount_cents": number,"created_at": string,"deleted_at": string | null,"goal_id": string,"id": string,"note": string | null,"occurred_on": string,"profile_id": string,"updated_at": string
                  }
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"deleted_at"?: string | null,"goal_id": string,"id"?: string,"note"?: string | null,"occurred_on": string,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"deleted_at"?: string | null,"goal_id"?: string,"id"?: string,"note"?: string | null,"occurred_on"?: string,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goal_contributions_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "goal_contributions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"deadline": string | null,"expense_category_id": string | null,"id": string,"kind": string,"name": string,"profile_id": string,"status": string,"target_cents": number,"updated_at": string
                  }
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"deadline"?: string | null,"expense_category_id"?: string | null,"id"?: string,"kind": string,"name": string,"profile_id": string,"status"?: string,"target_cents": number,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"deadline"?: string | null,"expense_category_id"?: string | null,"id"?: string,"kind"?: string,"name"?: string,"profile_id"?: string,"status"?: string,"target_cents"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goals_expense_category_id_fkey"
      columns: ["expense_category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "goals_profile_id_fkey"
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
                },"levels": {
                  Row: {
                    "level": number,"min_xp": number,"name": string
                  }
                  Insert: {
                    "level": number,"min_xp": number,"name": string
                  }
                  Update: {
                    "level"?: number,"min_xp"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mission_templates": {
                  Row: {
                    "code": string,"description": string,"enabled": boolean,"metric": string,"period": string,"sort_order": number,"target": number,"title": string,"xp_reward": number
                  }
                  Insert: {
                    "code": string,"description": string,"enabled"?: boolean,"metric": string,"period": string,"sort_order"?: number,"target": number,"title": string,"xp_reward": number
                  }
                  Update: {
                    "code"?: string,"description"?: string,"enabled"?: boolean,"metric"?: string,"period"?: string,"sort_order"?: number,"target"?: number,"title"?: string,"xp_reward"?: number
                  }
                  Relationships: [
                    
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
                },"user_achievements": {
                  Row: {
                    "code": string,"profile_id": string,"unlocked_at": string
                  }
                  Insert: {
                    "code": string,"profile_id": string,"unlocked_at"?: string
                  }
                  Update: {
                    "code"?: string,"profile_id"?: string,"unlocked_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_achievements_code_fkey"
      columns: ["code"]
isOneToOne: false
      referencedRelation: "achievements"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "user_achievements_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_missions": {
                  Row: {
                    "completed_at": string | null,"period_start": string,"profile_id": string,"progress": number,"template_code": string
                  }
                  Insert: {
                    "completed_at"?: string | null,"period_start": string,"profile_id": string,"progress"?: number,"template_code": string
                  }
                  Update: {
                    "completed_at"?: string | null,"period_start"?: string,"profile_id"?: string,"progress"?: number,"template_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_missions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_missions_template_code_fkey"
      columns: ["template_code"]
isOneToOne: false
      referencedRelation: "mission_templates"
      referencedColumns: ["code"]
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
                },"user_stats": {
                  Row: {
                    "best_streak": number,"celebrated_level": number,"current_streak": number,"last_active_on": string | null,"level": number,"profile_id": string,"total_xp": number,"updated_at": string
                  }
                  Insert: {
                    "best_streak"?: number,"celebrated_level"?: number,"current_streak"?: number,"last_active_on"?: string | null,"level"?: number,"profile_id": string,"total_xp"?: number,"updated_at"?: string
                  }
                  Update: {
                    "best_streak"?: number,"celebrated_level"?: number,"current_streak"?: number,"last_active_on"?: string | null,"level"?: number,"profile_id"?: string,"total_xp"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_stats_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"xp_events": {
                  Row: {
                    "awarded_on": string,"created_at": string,"id": string,"idempotency_key": string,"profile_id": string,"ref_id": string | null,"source": string,"xp": number
                  }
                  Insert: {
                    "awarded_on": string,"created_at"?: string,"id"?: string,"idempotency_key": string,"profile_id": string,"ref_id"?: string | null,"source": string,"xp": number
                  }
                  Update: {
                    "awarded_on"?: string,"created_at"?: string,"id"?: string,"idempotency_key"?: string,"profile_id"?: string,"ref_id"?: string | null,"source"?: string,"xp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "xp_events_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "xp_events_source_fkey"
      columns: ["source"]
isOneToOne: false
      referencedRelation: "xp_rules"
      referencedColumns: ["source"]
    }
                  ]
                },"xp_rules": {
                  Row: {
                    "daily_cap": number | null,"description": string,"enabled": boolean,"label": string,"source": string,"variable": boolean,"xp": number
                  }
                  Insert: {
                    "daily_cap"?: number | null,"description": string,"enabled"?: boolean,"label": string,"source": string,"variable"?: boolean,"xp": number
                  }
                  Update: {
                    "daily_cap"?: number | null,"description"?: string,"enabled"?: boolean,"label"?: string,"source"?: string,"variable"?: boolean,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "acknowledge_level":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"award_xp":
{ Args: { "p_key": string,"p_profile": string,"p_ref": string,"p_source": string,"p_xp"?: number }; Returns: number
                           },
"bump_missions":
{ Args: { "p_metric": string,"p_n"?: number,"p_profile": string }; Returns: undefined
                           },
"check_achievements":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"local_today":
{ Args: { "p_profile": string }; Returns: string
                           },
"mark_active_day":
{ Args: { "p_profile": string }; Returns: undefined
                           },
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
