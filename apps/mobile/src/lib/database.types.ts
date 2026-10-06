
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "accounts": {
                  Row: {
                    "created_at": string,"id": string,"is_archived": boolean,"kind": string,"name": string,"opening_balance_cents": number,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
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
                  ComputedFields: never
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
                  ComputedFields: never
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
                },"article_progress": {
                  Row: {
                    "article_slug": string,"completed_at": string | null,"profile_id": string,"quiz_best_pct": number | null,"quiz_passed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "article_slug": string,"completed_at"?: string | null,"profile_id": string,"quiz_best_pct"?: number | null,"quiz_passed_at"?: string | null
                  }
                  Update: {
                    "article_slug"?: string,"completed_at"?: string | null,"profile_id"?: string,"quiz_best_pct"?: number | null,"quiz_passed_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "article_progress_article_slug_fkey"
      columns: ["article_slug"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "article_progress_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"articles": {
                  Row: {
                    "body": string,"enabled": boolean,"level": string,"read_minutes": number,"slug": string,"sort_order": number,"summary": string,"title": string,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"enabled"?: boolean,"level": string,"read_minutes": number,"slug": string,"sort_order"?: number,"summary": string,"title": string,"topic": string
                  }
                  Update: {
                    "body"?: string,"enabled"?: boolean,"level"?: string,"read_minutes"?: number,"slug"?: string,"sort_order"?: number,"summary"?: string,"title"?: string,"topic"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "color": string,"created_at": string,"icon": string,"id": string,"is_archived": boolean,"kind": string,"name": string,"profile_id": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
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
                },"challenge_participants": {
                  Row: {
                    "challenge_id": string,"completed_at": string | null,"joined_on": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id": string,"completed_at"?: string | null,"joined_on": string,"profile_id": string
                  }
                  Update: {
                    "challenge_id"?: string,"completed_at"?: string | null,"joined_on"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenge_participants_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenge_participants_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"challenges": {
                  Row: {
                    "club_id": string,"created_at": string,"created_by": string | null,"ends_on": string,"id": string,"kind": string,"starts_on": string,"target": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": string,"created_at"?: string,"created_by"?: string | null,"ends_on": string,"id"?: string,"kind": string,"starts_on": string,"target": number,"title": string
                  }
                  Update: {
                    "club_id"?: string,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string,"id"?: string,"kind"?: string,"starts_on"?: string,"target"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenges_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenges_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"club_join_attempts": {
                  Row: {
                    "attempted_at": string,"id": number,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"id"?: never,"profile_id": string
                  }
                  Update: {
                    "attempted_at"?: string,"id"?: never,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_join_attempts_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"club_members": {
                  Row: {
                    "club_id": string,"joined_at": string,"profile_id": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": string,"joined_at"?: string,"profile_id": string,"role": string
                  }
                  Update: {
                    "club_id"?: string,"joined_at"?: string,"profile_id"?: string,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_members_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clubs": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"invite_code": string,"invites_enabled": boolean,"max_members": number,"name": string,"owner_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"invite_code": string,"invites_enabled"?: boolean,"max_members"?: number,"name": string,"owner_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"invite_code"?: string,"invites_enabled"?: boolean,"max_members"?: number,"name"?: string,"owner_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clubs_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "accepted_at": string,"id": string,"profile_id": string,"type": string,"version": string
                  }
                  ComputedFields: never
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
                },"glossary_terms": {
                  Row: {
                    "definition": string,"sort_order": number,"term": string,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "definition": string,"sort_order"?: number,"term": string,"topic": string
                  }
                  Update: {
                    "definition"?: string,"sort_order"?: number,"term"?: string,"topic"?: string
                  }
                  Relationships: [
                    
                  ]
                },"goal_contributions": {
                  Row: {
                    "amount_cents": number,"created_at": string,"deleted_at": string | null,"goal_id": string,"id": string,"note": string | null,"occurred_on": string,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
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
                  ComputedFields: never
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
                  ComputedFields: never
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
                },"learning_tracks": {
                  Row: {
                    "description": string,"slug": string,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"slug": string,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "description"?: string,"slug"?: string,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"levels": {
                  Row: {
                    "level": number,"min_xp": number,"name": string
                  }
                  ComputedFields: never
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
                  ComputedFields: never
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
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"currency"?: string,"display_name": string,"experience_level"?: string,"id": string,"onboarding_done"?: boolean,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"currency"?: string,"display_name"?: string,"experience_level"?: string,"id"?: string,"onboarding_done"?: boolean,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quiz_questions": {
                  Row: {
                    "article_slug": string,"correct_index": number,"explanation": string,"id": string,"options": (string)[],"position": number,"prompt": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_slug": string,"correct_index": number,"explanation": string,"id"?: string,"options": (string)[],"position": number,"prompt": string
                  }
                  Update: {
                    "article_slug"?: string,"correct_index"?: number,"explanation"?: string,"id"?: string,"options"?: (string)[],"position"?: number,"prompt"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_questions_article_slug_fkey"
      columns: ["article_slug"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["slug"]
    }
                  ]
                },"track_items": {
                  Row: {
                    "article_slug": string,"position": number,"track_slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_slug": string,"position": number,"track_slug": string
                  }
                  Update: {
                    "article_slug"?: string,"position"?: number,"track_slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "track_items_article_slug_fkey"
      columns: ["article_slug"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "track_items_track_slug_fkey"
      columns: ["track_slug"]
isOneToOne: false
      referencedRelation: "learning_tracks"
      referencedColumns: ["slug"]
    }
                  ]
                },"transactions": {
                  Row: {
                    "account_id": string | null,"amount_cents": number,"category_id": string | null,"created_at": string,"deleted_at": string | null,"description": string | null,"holding_id": string | null,"id": string,"kind": string,"notes": string | null,"occurred_on": string,"payment_method": string | null,"profile_id": string,"to_account_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
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
                  ComputedFields: never
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
                  ComputedFields: never
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
                    "biometric_lock": boolean,"created_at": string,"notif_daily_reminder": boolean,"notif_daily_time": string,"notif_goal_deadlines": boolean,"notif_missions": boolean,"notif_monthly_summary": boolean,"notif_weekly_review": boolean,"profile_id": string,"share_amounts_with_clubs": boolean,"show_in_club_ranking": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "biometric_lock"?: boolean,"created_at"?: string,"notif_daily_reminder"?: boolean,"notif_daily_time"?: string,"notif_goal_deadlines"?: boolean,"notif_missions"?: boolean,"notif_monthly_summary"?: boolean,"notif_weekly_review"?: boolean,"profile_id": string,"share_amounts_with_clubs"?: boolean,"show_in_club_ranking"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "biometric_lock"?: boolean,"created_at"?: string,"notif_daily_reminder"?: boolean,"notif_daily_time"?: string,"notif_goal_deadlines"?: boolean,"notif_missions"?: boolean,"notif_monthly_summary"?: boolean,"notif_weekly_review"?: boolean,"profile_id"?: string,"share_amounts_with_clubs"?: boolean,"show_in_club_ranking"?: boolean,"updated_at"?: string
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
                  ComputedFields: never
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
                  ComputedFields: never
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
                  ComputedFields: never
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
"assert_join_rate":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"award_xp":
{ Args: { "p_key": string,"p_profile": string,"p_ref": string,"p_source": string,"p_xp"?: number }; Returns: number
                           },
"bump_missions":
{ Args: { "p_metric": string,"p_n"?: number,"p_profile": string }; Returns: undefined
                           },
"challenge_count":
{ Args: { "p_challenge": string,"p_profile": string }; Returns: number
                           },
"challenge_standings":
{ Args: { "p_challenge": string }; Returns: {
              "action_count": number,"completed": boolean,"display_name": string,"is_self": boolean,"profile_id": string,"progress_pct": number
            }[]
                           },
"check_achievements":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"check_tracks":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"club_ranking":
{ Args: { "p_club": string,"p_period": string }; Returns: {
              "achievements": number,"current_streak": number,"display_name": string,"is_self": boolean,"level": number,"missions_completed": number,"profile_id": string,"rank": number,"xp": number
            }[]
                           },
"club_role_of":
{ Args: { "p_club": string }; Returns: string
                           },
"complete_article":
{ Args: { "p_article": string }; Returns: undefined
                           },
"create_challenge":
{ Args: { "p_club": string,"p_ends_on": string,"p_kind": string,"p_starts_on": string,"p_target": number,"p_title": string }; Returns: string
                           },
"create_club":
{ Args: { "p_description"?: string,"p_name": string }; Returns: string
                           },
"delete_challenge":
{ Args: { "p_challenge": string }; Returns: undefined
                           },
"delete_club":
{ Args: { "p_club": string }; Returns: undefined
                           },
"generate_invite_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_club_member":
{ Args: { "p_club": string }; Returns: boolean
                           },
"join_challenge":
{ Args: { "p_challenge": string }; Returns: undefined
                           },
"join_club":
{ Args: { "p_code": string }; Returns: string
                           },
"leave_challenge":
{ Args: { "p_challenge": string }; Returns: undefined
                           },
"leave_club":
{ Args: { "p_club": string }; Returns: undefined
                           },
"list_challenges":
{ Args: { "p_club": string }; Returns: {
              "completed_count": number,"created_by": string,"ends_on": string,"id": string,"joined": boolean,"kind": string,"my_completed_at": string,"my_count": number,"participant_count": number,"starts_on": string,"status": string,"target": number,"title": string
            }[]
                           },
"list_club_members":
{ Args: { "p_club": string }; Returns: {
              "avatar_url": string,"current_streak": number,"display_name": string,"joined_at": string,"level": number,"profile_id": string,"role": string,"total_xp": number
            }[]
                           },
"list_my_clubs":
{ Args: Record<PropertyKey, never>; Returns: {
              "club_id": string,"created_at": string,"description": string,"invite_code": string,"invites_enabled": boolean,"max_members": number,"member_count": number,"name": string,"role": string
            }[]
                           },
"local_today":
{ Args: { "p_profile": string }; Returns: string
                           },
"mark_active_day":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"normalize_invite_code":
{ Args: { "p_code": string }; Returns: string
                           },
"preview_club":
{ Args: { "p_code": string }; Returns: {
              "club_id": string,"invites_enabled": boolean,"is_full": boolean,"max_members": number,"member_count": number,"name": string
            }[]
                           },
"recommended_articles":
{ Args: Record<PropertyKey, never>; Returns: {
              "article_slug": string,"reason": string
            }[]
                           },
"refresh_challenges":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"regenerate_invite_code":
{ Args: { "p_club": string }; Returns: string
                           },
"remove_member":
{ Args: { "p_club": string,"p_profile": string }; Returns: undefined
                           },
"seed_default_data":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"set_member_role":
{ Args: { "p_club": string,"p_profile": string,"p_role": string }; Returns: undefined
                           },
"submit_quiz":
{ Args: { "p_answers": (number)[],"p_article": string }; Returns: {
              "correct_index": number,"explanation": string,"is_correct": boolean,"question_position": number
            }[]
                           },
"transfer_ownership":
{ Args: { "p_club": string,"p_profile": string }; Returns: undefined
                           },
"update_club":
{ Args: { "p_club": string,"p_description": string,"p_invites_enabled": boolean,"p_name": string }; Returns: undefined
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
