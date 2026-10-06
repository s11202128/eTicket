// Generated from the Supabase schema. Regenerate after every migration
// (Supabase MCP `generate_typescript_types`, or
// `npx supabase gen types typescript --project-id lzeonpbmwxuguuaexnjq`).
//
// Hand edits after generating (re-apply when regenerating):
// - check_in_ticket: every column except `result` and `code` can be null
//   (a "not_found" result returns nulls).
// - list_my_notifications: `body` and `link` can be null.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TicketRow = {
  cancelled_at: string | null
  checked_in_at: string | null
  checked_in_by: string | null
  code: string
  created_at: string
  event_id: string
  id: string
  status: string
  updated_at: string
  user_id: string
}

type ReturnsTicket = {
  Returns: TicketRow
  SetofOptions: {
    from: "*"
    to: "tickets"
    isOneToOne: true
    isSetofReturn: false
  }
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          capacity: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          featured_order: number | null
          id: string
          image_path: string | null
          image_url: string | null
          is_featured: boolean
          location: string
          max_tickets_per_user: number
          price: number
          slug: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          featured_order?: number | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_featured?: boolean
          location: string
          max_tickets_per_user?: number
          price?: number
          slug: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          featured_order?: number | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_featured?: boolean
          location?: string
          max_tickets_per_user?: number
          price?: number
          slug?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tickets: {
        Row: TicketRow
        Insert: {
          cancelled_at?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          code?: string
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          cancelled_at?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      admin_cancel_event: {
        Args: { p_event_id: string; p_reason?: string }
        Returns: number
      }
      admin_cancel_ticket: { Args: { p_ticket_id: string } } & ReturnsTicket
      admin_notify_event_holders: {
        Args: { p_body?: string; p_event_id: string; p_link?: string; p_title: string }
        Returns: number
      }
      admin_set_featured_events: {
        Args: { p_event_ids: string[] }
        Returns: undefined
      }
      admin_events_near_capacity: {
        Args: { p_threshold?: number }
        Returns: {
          capacity: number
          event_id: string
          slug: string
          sold: number
          starts_at: string
          title: string
        }[]
      }
      admin_stats: {
        Args: { p_time_zone?: string }
        Returns: {
          events_near_capacity: number
          tickets_this_week: number
          tickets_today: number
          total_users: number
          upcoming_events: number
        }[]
      }
      book_ticket: { Args: { p_event_id: string } } & ReturnsTicket
      cancel_my_ticket: { Args: { p_ticket_id: string } } & ReturnsTicket
      check_in_ticket: {
        Args: { p_code: string }
        Returns: {
          checked_in_at: string | null
          code: string
          event_id: string | null
          event_title: string | null
          holder_name: string | null
          result: string
          starts_at: string | null
          status: string | null
          ticket_id: string | null
        }[]
      }
      get_event_booked_counts: {
        Args: { event_ids: string[] }
        Returns: {
          booked: number
          event_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff_or_admin: { Args: never; Returns: boolean }
      list_my_notifications: {
        Args: { max_rows?: number }
        Returns: {
          body: string | null
          created_at: string
          id: string
          is_broadcast: boolean
          is_read: boolean
          link: string | null
          title: string
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      slugify: { Args: { value: string }; Returns: string }
      unread_notification_count: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]

export type DbFunctions = PublicSchema["Functions"]

// Allowed values for text columns guarded by check constraints.
export type UserRole = "user" | "staff" | "admin"
export type EventStatus = "draft" | "published" | "cancelled"
export type TicketDbStatus = "active" | "used" | "cancelled"
export type CheckInResult = "valid" | "already_used" | "cancelled" | "wrong_date" | "not_found"
