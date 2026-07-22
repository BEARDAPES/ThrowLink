export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      b2b_reviews: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          pro_id: string
          rating: number
          store_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          pro_id: string
          rating: number
          store_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          pro_id?: string
          rating?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_reviews_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_offers: {
        Row: {
          created_at: string
          event_id: string
          message: string | null
          offer_status: string
          participation_end_at: string | null
          participation_start_at: string | null
          pro_id: string
          proposed_price: number | null
        }
        Insert: {
          created_at?: string
          event_id: string
          message?: string | null
          offer_status?: string
          participation_end_at?: string | null
          participation_start_at?: string | null
          pro_id: string
          proposed_price?: number | null
        }
        Update: {
          created_at?: string
          event_id?: string
          message?: string | null
          offer_status?: string
          participation_end_at?: string | null
          participation_start_at?: string | null
          pro_id?: string
          proposed_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_offers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_offers_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          event_end_at: string | null
          event_start_at: string | null
          event_title: string
          id: string
          pop_image_url: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          description?: string | null
          event_end_at?: string | null
          event_start_at?: string | null
          event_title: string
          id?: string
          pop_image_url?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          event_end_at?: string | null
          event_start_at?: string | null
          event_title?: string
          id?: string
          pop_image_url?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_thread_items: {
        Row: {
          body: string | null
          created_at: string
          event_id: string
          id: string
          kind: string
          metadata: Json | null
          pro_id: string
          sender_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_id: string
          id?: string
          kind: string
          metadata?: Json | null
          pro_id: string
          sender_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          event_id?: string
          id?: string
          kind?: string
          metadata?: Json | null
          pro_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_thread_items_event_id_pro_id_fkey"
            columns: ["event_id", "pro_id"]
            isOneToOne: false
            referencedRelation: "event_offers"
            referencedColumns: ["event_id", "pro_id"]
          },
          {
            foreignKeyName: "offer_thread_items_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          achievements: Json
          dart_setup: string | null
          darts_live_rating: number | null
          home_shop_id: string | null
          home_shop_text: string | null
          id: string
          is_pro: boolean
          location: string | null
          phoenix_rating: number | null
          player_directory_url: string | null
          sake_rating: number | null
          status_tags: Json
          years_playing: number | null
        }
        Insert: {
          achievements?: Json
          dart_setup?: string | null
          darts_live_rating?: number | null
          home_shop_id?: string | null
          home_shop_text?: string | null
          id: string
          is_pro?: boolean
          location?: string | null
          phoenix_rating?: number | null
          player_directory_url?: string | null
          sake_rating?: number | null
          status_tags?: Json
          years_playing?: number | null
        }
        Update: {
          achievements?: Json
          dart_setup?: string | null
          darts_live_rating?: number | null
          home_shop_id?: string | null
          home_shop_text?: string | null
          id?: string
          is_pro?: boolean
          location?: string | null
          phoenix_rating?: number | null
          player_directory_url?: string | null
          sake_rating?: number | null
          status_tags?: Json
          years_playing?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_home_shop_id_fkey"
            columns: ["home_shop_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_offer_conditions: {
        Row: {
          notes: string | null
          pricing_type: string | null
          pro_id: string
          unit_price_amount: number | null
          updated_at: string
        }
        Insert: {
          notes?: string | null
          pricing_type?: string | null
          pro_id: string
          unit_price_amount?: number | null
          updated_at?: string
        }
        Update: {
          notes?: string | null
          pricing_type?: string | null
          pro_id?: string
          unit_price_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_offer_conditions_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_follows: {
        Row: {
          created_at: string
          follower_id: string
          kind: string
          target_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          kind: string
          target_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          kind?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follows_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio_text: string | null
          created_at: string
          display_name: string
          has_password_login: boolean
          id: string
          onboarded: boolean
          role: string
          slug: string | null
          sns_links: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio_text?: string | null
          created_at?: string
          display_name?: string
          has_password_login?: boolean
          id: string
          onboarded?: boolean
          role?: string
          slug?: string | null
          sns_links?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio_text?: string | null
          created_at?: string
          display_name?: string
          has_password_login?: boolean
          id?: string
          onboarded?: boolean
          role?: string
          slug?: string | null
          sns_links?: Json
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          atmosphere_tags: Json
          business_close_time: string | null
          business_open_time: string | null
          dartslive_shop_url: string | null
          id: string
          parking_available: boolean | null
          phoenix_shop_url: string | null
          phone_number: string | null
          smoking_allowed: boolean | null
        }
        Insert: {
          address?: string | null
          atmosphere_tags?: Json
          business_close_time?: string | null
          business_open_time?: string | null
          dartslive_shop_url?: string | null
          id: string
          parking_available?: boolean | null
          phoenix_shop_url?: string | null
          phone_number?: string | null
          smoking_allowed?: boolean | null
        }
        Update: {
          address?: string | null
          atmosphere_tags?: Json
          business_close_time?: string | null
          business_open_time?: string | null
          dartslive_shop_url?: string | null
          id?: string
          parking_available?: boolean | null
          phoenix_shop_url?: string | null
          phone_number?: string | null
          smoking_allowed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_stale_events: { Args: never; Returns: undefined }
      fan_stats: {
        Args: { target_user_id?: string }
        Returns: {
          participation_count: number
          user_id: string
        }[]
      }
      pro_has_active_offer: {
        Args: { p_event_id: string; p_pro_id: string }
        Returns: boolean
      }
      pro_stats: {
        Args: { target_pro_id?: string }
        Returns: {
          pro_id: string
          request_count: number
          total_mobilized: number
        }[]
      }
      respond_to_offer: {
        Args: {
          accept: boolean
          target_event_id: string
          target_pro_id: string
        }
        Returns: undefined
      }
      revert_offer_acceptance: {
        Args: { target_event_id: string; target_pro_id: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

