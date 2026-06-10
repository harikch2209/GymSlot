export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          amount_paid: number
          booking_date: string
          checked_in: boolean
          created_at: string
          credits_used: number
          duration_mins: number
          event_id: string | null
          gym_id: string | null
          gym_name: string
          id: string
          kind: string
          qr_payload: string
          slot_id: string | null
          status: string
          time: string
          title: string
          trainer_id: string | null
          trainer_name: string | null
          trainer_status: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number
          booking_date: string
          checked_in?: boolean
          created_at?: string
          credits_used?: number
          duration_mins: number
          event_id?: string | null
          gym_id?: string | null
          gym_name: string
          id?: string
          kind: string
          qr_payload: string
          slot_id?: string | null
          status?: string
          time: string
          title: string
          trainer_id?: string | null
          trainer_name?: string | null
          trainer_status?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          booking_date?: string
          checked_in?: boolean
          created_at?: string
          credits_used?: number
          duration_mins?: number
          event_id?: string | null
          gym_id?: string | null
          gym_name?: string
          id?: string
          kind?: string
          qr_payload?: string
          slot_id?: string | null
          status?: string
          time?: string
          title?: string
          trainer_id?: string | null
          trainer_name?: string | null
          trainer_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          label: string
          reason: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          label: string
          reason: string
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          label?: string
          reason?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          capacity: number
          category: string
          created_at: string
          description: string | null
          duration_mins: number
          event_date: string
          event_time: string
          gym_id: string | null
          gym_name: string
          id: string
          image_url: string | null
          price: number
          reserved_seed: number
          title: string
          what_to_bring: string | null
        }
        Insert: {
          capacity: number
          category: string
          created_at?: string
          description?: string | null
          duration_mins: number
          event_date: string
          event_time: string
          gym_id?: string | null
          gym_name: string
          id: string
          image_url?: string | null
          price?: number
          reserved_seed?: number
          title: string
          what_to_bring?: string | null
        }
        Update: {
          capacity?: number
          category?: string
          created_at?: string
          description?: string | null
          duration_mins?: number
          event_date?: string
          event_time?: string
          gym_id?: string | null
          gym_name?: string
          id?: string
          image_url?: string | null
          price?: number
          reserved_seed?: number
          title?: string
          what_to_bring?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          about: string | null
          amenities: string[]
          area: string
          city: string
          created_at: string
          crowd: string
          crowd_updated_at: string | null
          id: string
          image_url: string | null
          images: string[]
          lat: number | null
          lng: number | null
          name: string
          price_from: number
          rating: number
          reviews: number
          timings: string | null
        }
        Insert: {
          about?: string | null
          amenities?: string[]
          area: string
          city?: string
          created_at?: string
          crowd?: string
          crowd_updated_at?: string | null
          id: string
          image_url?: string | null
          images?: string[]
          lat?: number | null
          lng?: number | null
          name: string
          price_from: number
          rating?: number
          reviews?: number
          timings?: string | null
        }
        Update: {
          about?: string | null
          amenities?: string[]
          area?: string
          city?: string
          created_at?: string
          crowd?: string
          crowd_updated_at?: string | null
          id?: string
          image_url?: string | null
          images?: string[]
          lat?: number | null
          lng?: number | null
          name?: string
          price_from?: number
          rating?: number
          reviews?: number
          timings?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      slots: {
        Row: {
          capacity: number
          duration: number
          gym_id: string
          id: string
          peak: boolean
          price: number
          sort_order: number
          time: string
        }
        Insert: {
          capacity?: number
          duration: number
          gym_id: string
          id: string
          peak?: boolean
          price: number
          sort_order?: number
          time: string
        }
        Update: {
          capacity?: number
          duration?: number
          gym_id?: string
          id?: string
          peak?: boolean
          price?: number
          sort_order?: number
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          experience_years: number
          fee_30: number
          fee_60: number
          id: string
          languages: string[]
          name: string
          rating: number
          specializations: string[]
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          experience_years?: number
          fee_30: number
          fee_60: number
          id: string
          languages?: string[]
          name: string
          rating?: number
          specializations?: string[]
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          experience_years?: number
          fee_30?: number
          fee_60?: number
          id?: string
          languages?: string[]
          name?: string
          rating?: number
          specializations?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_booking: {
        Args: { p_as_credits: boolean; p_booking_id: string }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
      }
      checkin: {
        Args: { p_booking_id: string }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
      }
      create_booking: {
        Args: {
          p_amount_paid: number
          p_booking_date: string
          p_credits_used?: number
          p_duration_mins: number
          p_event_id?: string
          p_gym_id: string
          p_gym_name: string
          p_kind: string
          p_slot_id?: string
          p_time: string
          p_title: string
          p_trainer_id?: string
          p_trainer_name?: string
        }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
      }
      credit_balance: { Args: Record<string, never>; Returns: number }
      ensure_profile: {
        Args: { p_full_name?: string }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
      }
      slot_availability: {
        Args: { p_date: string; p_gym_id: string }
        Returns: {
          booked: number
          capacity: number
          remaining: number
          slot_id: string
        }[]
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
