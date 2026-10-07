// Generated from the Supabase schema. Regenerate after every migration
// (Supabase MCP `generate_typescript_types`, or
// `npx supabase gen types typescript --project-id lzeonpbmwxuguuaexnjq`).
//
// Hand edits after generating (re-apply when regenerating):
// - Row types are shared aliases (EventRow, TicketRow, ...) to keep this short.
// - check_in_ticket: every column except `result` and `code` can be null
//   (not_found / wrong_event return nulls).
// - list_my_notifications: `body` and `link` can be null.
// - list_event_attendees: holder_name, holder_email, checked_in_at can be null.
// - get_public_organizers: every column except user_id/organization_name/status can be null.
// - Internal functions the app can't call are omitted (write_audit,
//   notify_user, notify_admins, refresh_event_ticket_summary, complete_past_events).
// - Helper types at the bottom (UserRole, EventStatus, ...).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type EventRow = {
  cancellation_reason: string | null
  cancellation_requested: boolean
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
  organizer_id: string | null
  price: number
  region: string
  review_note: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  slug: string
  starts_at: string
  status: string
  submitted_at: string | null
  title: string
  updated_at: string
}

type TicketRow = {
  cancelled_at: string | null
  checked_in_at: string | null
  checked_in_by: string | null
  code: string
  created_at: string
  event_id: string
  id: string
  status: string
  ticket_type_id: string
  updated_at: string
  user_id: string
}

type OrganizerProfileRow = {
  city: string | null
  created_at: string
  description: string | null
  event_types: string[]
  logo_path: string | null
  organization_name: string
  phone: string | null
  review_note: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  status: string
  updated_at: string
  user_id: string
  website: string | null
}

type ReturnsOne<Row, Table extends string> = {
  Returns: Row
  SetofOptions: { from: "*"; to: Table; isOneToOne: true; isSetofReturn: false }
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
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
      event_staff: {
        Row: {
          created_at: string
          event_id: string
          invited_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          invited_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          invited_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: EventRow
        Insert: {
          cancellation_reason?: string | null
          cancellation_requested?: boolean
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
          organizer_id?: string | null
          price?: number
          region?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          starts_at: string
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancellation_requested?: boolean
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
          organizer_id?: string | null
          price?: number
          region?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          starts_at?: string
          status?: string
          submitted_at?: string | null
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
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      organizer_profiles: {
        Row: OrganizerProfileRow
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          event_types?: string[]
          logo_path?: string | null
          organization_name: string
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          event_types?: string[]
          logo_path?: string | null
          organization_name?: string
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          price: number
          quantity: number | null
          sales_end: string | null
          sales_start: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          price?: number
          quantity?: number | null
          sales_end?: string | null
          sales_start?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          price?: number
          quantity?: number | null
          sales_end?: string | null
          sales_start?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
          ticket_type_id: string
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
          ticket_type_id?: string
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
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
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
      add_event_staff: {
        Args: { p_email: string; p_event_id: string }
        Returns: string
      }
      admin_cancel_ticket: { Args: { p_ticket_id: string } } & ReturnsOne<TicketRow, "tickets">
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
      admin_notify_event_holders: {
        Args: { p_body?: string; p_event_id: string; p_link?: string; p_title: string }
        Returns: number
      }
      admin_set_featured_events: {
        Args: { p_event_ids: string[] }
        Returns: undefined
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
      apply_as_organizer: {
        Args: {
          p_city?: string
          p_description?: string
          p_event_types?: string[]
          p_logo_path?: string
          p_organization_name: string
          p_phone?: string
          p_website?: string
        }
      } & ReturnsOne<OrganizerProfileRow, "organizer_profiles">
      book_ticket: {
        Args: { p_quantity?: number; p_ticket_type_id: string }
        Returns: TicketRow[]
        SetofOptions: { from: "*"; to: "tickets"; isOneToOne: false; isSetofReturn: true }
      }
      can_check_in: { Args: { p_event_id: string }; Returns: boolean }
      cancel_event: {
        Args: { p_event_id: string; p_note?: string }
        Returns: number
      }
      cancel_my_ticket: { Args: { p_ticket_id: string } } & ReturnsOne<TicketRow, "tickets">
      check_in_ticket: {
        Args: { p_code: string; p_event_id?: string }
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
          ticket_type_name: string | null
        }[]
      }
      get_event_booked_counts: {
        Args: { event_ids: string[] }
        Returns: {
          booked: number
          event_id: string
        }[]
      }
      get_public_organizers: {
        Args: { p_user_ids: string[] }
        Returns: {
          city: string | null
          description: string | null
          logo_path: string | null
          organization_name: string
          status: string
          user_id: string
          website: string | null
        }[]
      }
      get_ticket_type_counts: {
        Args: { p_event_ids: string[] }
        Returns: {
          sold: number
          ticket_type_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved_organizer: { Args: never; Returns: boolean }
      is_event_owner: { Args: { p_event_id: string }; Returns: boolean }
      is_event_staff: { Args: { p_event_id: string }; Returns: boolean }
      list_event_attendees: {
        Args: { p_event_id: string }
        Returns: {
          booked_at: string
          checked_in_at: string | null
          code: string
          holder_email: string | null
          holder_name: string | null
          status: string
          ticket_id: string
          ticket_type_id: string
          ticket_type_name: string
        }[]
      }
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
      owner_can_edit_event: { Args: { p_event_id: string }; Returns: boolean }
      request_event_cancellation: {
        Args: { p_event_id: string; p_reason?: string }
      } & ReturnsOne<EventRow, "events">
      review_event: {
        Args: { p_decision: string; p_event_id: string; p_note?: string }
      } & ReturnsOne<EventRow, "events">
      review_organizer: {
        Args: { p_decision: string; p_note?: string; p_user_id: string }
      } & ReturnsOne<OrganizerProfileRow, "organizer_profiles">
      slugify: { Args: { value: string }; Returns: string }
      submit_event_for_review: { Args: { p_event_id: string } } & ReturnsOne<EventRow, "events">
      unread_notification_count: { Args: never; Returns: number }
      update_published_event: {
        Args: { p_changes: Json; p_event_id: string }
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
export type UserRole = "attendee" | "organizer" | "admin"
export type OrganizerStatus = "pending" | "approved" | "rejected" | "suspended"
export type EventStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "published"
  | "rejected"
  | "cancelled"
  | "completed"
export type EventRegion = "solomon_islands" | "pacific" | "international"
export type TicketDbStatus = "active" | "used" | "cancelled"
export type CheckInResult =
  | "valid"
  | "already_used"
  | "cancelled"
  | "wrong_event"
  | "wrong_date"
  | "not_found"
