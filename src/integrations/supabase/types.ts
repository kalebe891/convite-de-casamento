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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          can_add: boolean
          can_delete: boolean
          can_edit: boolean
          can_publish: boolean
          can_view: boolean
          created_at: string | null
          id: string
          menu_key: string
          role_key: string
          updated_at: string | null
        }
        Insert: {
          can_add?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_publish?: boolean
          can_view?: boolean
          created_at?: string | null
          id?: string
          menu_key: string
          role_key: string
          updated_at?: string | null
        }
        Update: {
          can_add?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_publish?: boolean
          can_view?: boolean
          created_at?: string | null
          id?: string
          menu_key?: string
          role_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      buffet_items: {
        Row: {
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_public: boolean | null
          item_name: string
          wedding_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          item_name: string
          wedding_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          item_name?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buffet_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_details"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_logs: {
        Row: {
          checked_in_at: string
          created_at: string | null
          guest_email: string
          guest_id: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          source: string
        }
        Insert: {
          checked_in_at: string
          created_at?: string | null
          guest_email: string
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          source: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string | null
          guest_email?: string
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          source?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          event_date: string
          event_name: string
          event_type: string
          id: string
          location: string | null
          maps_url: string | null
          wedding_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          event_name: string
          event_type: string
          id?: string
          location?: string | null
          maps_url?: string | null
          wedding_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_name?: string
          event_type?: string
          id?: string
          location?: string | null
          maps_url?: string | null
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_details"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_items: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          gift_name: string
          id: string
          is_public: boolean | null
          is_purchased: boolean | null
          link: string | null
          selected_by_invitation_id: string | null
          wedding_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          gift_name: string
          id?: string
          is_public?: boolean | null
          is_purchased?: boolean | null
          link?: string | null
          selected_by_invitation_id?: string | null
          wedding_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          gift_name?: string
          id?: string
          is_public?: boolean | null
          is_purchased?: boolean | null
          link?: string | null
          selected_by_invitation_id?: string | null
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_items_selected_by_invitation_id_fkey"
            columns: ["selected_by_invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_details"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          checked_in_at: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          status: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          status?: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          status?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          attending: boolean | null
          checked_in_at: string | null
          created_at: string | null
          dietary_restrictions: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          invitation_code: string | null
          message: string | null
          plus_one: boolean | null
          responded_at: string | null
          unique_code: string
          wedding_id: string | null
        }
        Insert: {
          attending?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          dietary_restrictions?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          invitation_code?: string | null
          message?: string | null
          plus_one?: boolean | null
          responded_at?: string | null
          unique_code: string
          wedding_id?: string | null
        }
        Update: {
          attending?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          dietary_restrictions?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          invitation_code?: string | null
          message?: string | null
          plus_one?: boolean | null
          responded_at?: string | null
          unique_code?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_details"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_users: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          nome: string | null
          papel: string
          token: string
          usado: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          nome?: string | null
          papel: string
          token?: string
          usado?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          nome?: string | null
          papel?: string
          token?: string
          usado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pending_users_papel_fkey"
            columns: ["papel"]
            isOneToOne: false
            referencedRelation: "role_profiles"
            referencedColumns: ["role_key"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_main: boolean | null
          is_secondary: boolean | null
          photo_url: string
          wedding_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_main?: boolean | null
          is_secondary?: boolean | null
          photo_url: string
          wedding_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_main?: boolean | null
          is_secondary?: boolean | null
          photo_url?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_details"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_songs: {
        Row: {
          artist: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_public: boolean | null
          moment: string
          song_name: string
          wedding_id: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          moment: string
          song_name: string
          wedding_id?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          moment?: string
          song_name?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_details"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_profiles: {
        Row: {
          created_at: string | null
          id: string
          is_system: boolean
          role_key: string
          role_label: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system?: boolean
          role_key: string
          role_label: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system?: boolean
          role_key?: string
          role_label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rsvp_tokens: {
        Row: {
          created_at: string
          expires_at: string
          guest_id: string
          id: string
          token: string
          used: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          guest_id: string
          id?: string
          token: string
          used?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          guest_id?: string
          id?: string
          token?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_tokens_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          attending: boolean
          created_at: string | null
          dietary_restrictions: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          message: string | null
          plus_one: boolean | null
          wedding_id: string | null
        }
        Insert: {
          attending: boolean
          created_at?: string | null
          dietary_restrictions?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          message?: string | null
          plus_one?: boolean | null
          wedding_id?: string | null
        }
        Update: {
          attending?: boolean
          created_at?: string | null
          dietary_restrictions?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          message?: string | null
          plus_one?: boolean | null
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_details"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          activity: string
          created_at: string | null
          display_order: number | null
          id: string
          is_public: boolean | null
          observation: string | null
          time: string
          wedding_id: string | null
        }
        Insert: {
          activity: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          observation?: string | null
          time: string
          wedding_id?: string | null
        }
        Update: {
          activity?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_public?: boolean | null
          observation?: string | null
          time?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "wedding_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "role_profiles"
            referencedColumns: ["role_key"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_details: {
        Row: {
          bride_name: string
          couple_message: string | null
          created_at: string | null
          groom_name: string
          id: string
          show_buffet_section: boolean | null
          show_gifts_section: boolean | null
          show_guest_list_public: boolean | null
          show_playlist_section: boolean | null
          show_rsvp_status_public: boolean | null
          show_timeline_section: boolean | null
          story: string | null
          theme_color: string | null
          updated_at: string | null
          venue_address: string | null
          venue_map_url: string | null
          venue_name: string | null
          wedding_date: string
        }
        Insert: {
          bride_name: string
          couple_message?: string | null
          created_at?: string | null
          groom_name: string
          id?: string
          show_buffet_section?: boolean | null
          show_gifts_section?: boolean | null
          show_guest_list_public?: boolean | null
          show_playlist_section?: boolean | null
          show_rsvp_status_public?: boolean | null
          show_timeline_section?: boolean | null
          story?: string | null
          theme_color?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
          wedding_date: string
        }
        Update: {
          bride_name?: string
          couple_message?: string | null
          created_at?: string | null
          groom_name?: string
          id?: string
          show_buffet_section?: boolean | null
          show_gifts_section?: boolean | null
          show_guest_list_public?: boolean | null
          show_playlist_section?: boolean | null
          show_rsvp_status_public?: boolean | null
          show_timeline_section?: boolean | null
          story?: string | null
          theme_color?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
          wedding_date?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "couple" | "planner" | "cerimonial"
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
      app_role: ["admin", "couple", "planner", "cerimonial"],
    },
  },
} as const
