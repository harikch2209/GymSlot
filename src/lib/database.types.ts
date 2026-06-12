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
      app_admins: {
        Row: { created_at: string; user_id: string }
        Insert: { created_at?: string; user_id: string }
        Update: { created_at?: string; user_id?: string }
        Relationships: []
      }
      bookings: {
        Row: {
          amount_paid: number
          booking_date: string
          checked_in: boolean
          checked_out: boolean
          checkin_code: string | null
          created_at: string
          credits_used: number
          duration_mins: number
          ends_at: string | null
          event_id: string | null
          gym_id: string | null
          gym_name: string
          id: string
          kind: string
          member_name: string | null
          qr_payload: string
          reminded_at: string | null
          slot_id: string | null
          starts_at: string | null
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
          checked_out?: boolean
          checkin_code?: string | null
          created_at?: string
          credits_used?: number
          duration_mins: number
          ends_at?: string | null
          event_id?: string | null
          gym_id?: string | null
          gym_name: string
          id?: string
          kind: string
          member_name?: string | null
          qr_payload: string
          reminded_at?: string | null
          slot_id?: string | null
          starts_at?: string | null
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
          checked_out?: boolean
          checkin_code?: string | null
          created_at?: string
          credits_used?: number
          duration_mins?: number
          ends_at?: string | null
          event_id?: string | null
          gym_id?: string | null
          gym_name?: string
          id?: string
          kind?: string
          member_name?: string | null
          qr_payload?: string
          reminded_at?: string | null
          slot_id?: string | null
          starts_at?: string | null
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
        Row: { amount: number; created_at: string; expires_at: string | null; expiry_reminded_at: string | null; id: string; label: string; reason: string; reference: string | null; user_id: string }
        Insert: { amount: number; created_at?: string; expires_at?: string | null; expiry_reminded_at?: string | null; id?: string; label: string; reason: string; reference?: string | null; user_id: string }
        Update: { amount?: number; created_at?: string; expires_at?: string | null; expiry_reminded_at?: string | null; id?: string; label?: string; reason?: string; reference?: string | null; user_id?: string }
        Relationships: []
      }
      events: {
        Row: {
          cancelled_at: string | null
          capacity: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_mins: number
          event_date: string
          status: string
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
          cancelled_at?: string | null
          capacity: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_mins: number
          event_date: string
          status?: string
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
          cancelled_at?: string | null
          capacity?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_mins?: number
          event_date?: string
          status?: string
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
      gym_blackouts: {
        Row: { blackout_date: string; created_at: string; gym_id: string; id: string; reason: string | null; slot_id: string | null }
        Insert: { blackout_date: string; created_at?: string; gym_id: string; id?: string; reason?: string | null; slot_id?: string | null }
        Update: { blackout_date?: string; created_at?: string; gym_id?: string; id?: string; reason?: string | null; slot_id?: string | null }
        Relationships: [
          { foreignKeyName: "gym_blackouts_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "gym_blackouts_slot_id_fkey"; columns: ["slot_id"]; isOneToOne: false; referencedRelation: "slots"; referencedColumns: ["id"] },
        ]
      }
      gym_kyc: {
        Row: { bank_account_name: string | null; bank_account_number: string | null; bank_ifsc: string | null; created_at: string; gstin: string | null; gym_id: string; legal_name: string | null; pan: string | null; updated_at: string }
        Insert: { bank_account_name?: string | null; bank_account_number?: string | null; bank_ifsc?: string | null; created_at?: string; gstin?: string | null; gym_id: string; legal_name?: string | null; pan?: string | null; updated_at?: string }
        Update: { bank_account_name?: string | null; bank_account_number?: string | null; bank_ifsc?: string | null; created_at?: string; gstin?: string | null; gym_id?: string; legal_name?: string | null; pan?: string | null; updated_at?: string }
        Relationships: [
          { foreignKeyName: "gym_kyc_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: true; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ]
      }
      gym_owners: {
        Row: { created_at: string; gym_id: string; user_id: string }
        Insert: { created_at?: string; gym_id: string; user_id: string }
        Update: { created_at?: string; gym_id?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "gym_owners_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
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
          effective_capacity: number
          id: string
          image_url: string | null
          images: string[]
          lat: number | null
          lng: number | null
          name: string
          price_from: number
          rating: number
          rejection_reason: string | null
          reviews: number
          status: string
          submitted_at: string | null
          timings: string | null
          verified_at: string | null
          walkins: number
        }
        Insert: {
          about?: string | null
          amenities?: string[]
          area: string
          city?: string
          created_at?: string
          crowd?: string
          crowd_updated_at?: string | null
          effective_capacity?: number
          id: string
          image_url?: string | null
          images?: string[]
          lat?: number | null
          lng?: number | null
          name: string
          price_from: number
          rating?: number
          rejection_reason?: string | null
          reviews?: number
          status?: string
          submitted_at?: string | null
          timings?: string | null
          verified_at?: string | null
          walkins?: number
        }
        Update: {
          about?: string | null
          amenities?: string[]
          area?: string
          city?: string
          created_at?: string
          crowd?: string
          crowd_updated_at?: string | null
          effective_capacity?: number
          id?: string
          image_url?: string | null
          images?: string[]
          lat?: number | null
          lng?: number | null
          name?: string
          price_from?: number
          rating?: number
          rejection_reason?: string | null
          reviews?: number
          status?: string
          submitted_at?: string | null
          timings?: string | null
          verified_at?: string | null
          walkins?: number
        }
        Relationships: []
      }
      notification_prefs: {
        Row: { booking: boolean; events: boolean; partner: boolean; push_enabled: boolean; refunds: boolean; reminders: boolean; sms_enabled: boolean; trainer: boolean; updated_at: string; user_id: string }
        Insert: { booking?: boolean; events?: boolean; partner?: boolean; push_enabled?: boolean; refunds?: boolean; reminders?: boolean; sms_enabled?: boolean; trainer?: boolean; updated_at?: string; user_id: string }
        Update: { booking?: boolean; events?: boolean; partner?: boolean; push_enabled?: boolean; refunds?: boolean; reminders?: boolean; sms_enabled?: boolean; trainer?: boolean; updated_at?: string; user_id?: string }
        Relationships: []
      }
      notifications: {
        Row: { body: string; channels: string[]; created_at: string; data: Json; dispatched_at: string | null; id: string; read_at: string | null; reference: string | null; status: string; title: string; type: string; user_id: string }
        Insert: { body?: string; channels?: string[]; created_at?: string; data?: Json; dispatched_at?: string | null; id?: string; read_at?: string | null; reference?: string | null; status?: string; title: string; type: string; user_id: string }
        Update: { body?: string; channels?: string[]; created_at?: string; data?: Json; dispatched_at?: string | null; id?: string; read_at?: string | null; reference?: string | null; status?: string; title?: string; type?: string; user_id?: string }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_date: string
          booking_id: string | null
          commission: number
          created_at: string
          credits_used: number
          duration_mins: number
          event_id: string | null
          gym_id: string | null
          gym_name: string | null
          gym_payout: number
          id: string
          kind: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          slot_id: string | null
          starts_at: string | null
          status: string
          time: string
          title: string
          trainer_id: string | null
          trainer_name: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_date: string
          booking_id?: string | null
          commission: number
          created_at?: string
          credits_used?: number
          duration_mins: number
          event_id?: string | null
          gym_id?: string | null
          gym_name?: string | null
          gym_payout: number
          id?: string
          kind: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          slot_id?: string | null
          starts_at?: string | null
          status?: string
          time: string
          title: string
          trainer_id?: string | null
          trainer_name?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_date?: string
          booking_id?: string | null
          commission?: number
          created_at?: string
          credits_used?: number
          duration_mins?: number
          event_id?: string | null
          gym_id?: string | null
          gym_name?: string | null
          gym_payout?: number
          id?: string
          kind?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          slot_id?: string | null
          starts_at?: string | null
          status?: string
          time?: string
          title?: string
          trainer_id?: string | null
          trainer_name?: string | null
          user_id?: string
        }
        Relationships: [
          { foreignKeyName: "payments_booking_id_fkey"; columns: ["booking_id"]; isOneToOne: false; referencedRelation: "bookings"; referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: { avatar_url: string | null; city: string | null; created_at: string; full_name: string | null; id: string; phone: string | null }
        Insert: { avatar_url?: string | null; city?: string | null; created_at?: string; full_name?: string | null; id: string; phone?: string | null }
        Update: { avatar_url?: string | null; city?: string | null; created_at?: string; full_name?: string | null; id?: string; phone?: string | null }
        Relationships: []
      }
      push_tokens: {
        Row: { platform: string; token: string; updated_at: string; user_id: string }
        Insert: { platform?: string; token: string; updated_at?: string; user_id: string }
        Update: { platform?: string; token?: string; updated_at?: string; user_id?: string }
        Relationships: []
      }
      reports: {
        Row: { created_at: string; details: string | null; id: string; reason: string; reporter_id: string; resolution: string | null; resolved_at: string | null; status: string; subject_id: string | null; subject_label: string | null; subject_type: string }
        Insert: { created_at?: string; details?: string | null; id?: string; reason: string; reporter_id: string; resolution?: string | null; resolved_at?: string | null; status?: string; subject_id?: string | null; subject_label?: string | null; subject_type: string }
        Update: { created_at?: string; details?: string | null; id?: string; reason?: string; reporter_id?: string; resolution?: string | null; resolved_at?: string | null; status?: string; subject_id?: string | null; subject_label?: string | null; subject_type?: string }
        Relationships: []
      }
      reviews: {
        Row: { comment: string | null; created_at: string; gym_id: string; id: string; rating: number; reviewer_name: string; tags: string[]; user_id: string | null }
        Insert: { comment?: string | null; created_at?: string; gym_id: string; id?: string; rating: number; reviewer_name: string; tags?: string[]; user_id?: string | null }
        Update: { comment?: string | null; created_at?: string; gym_id?: string; id?: string; rating?: number; reviewer_name?: string; tags?: string[]; user_id?: string | null }
        Relationships: [
          { foreignKeyName: "reviews_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ]
      }
      slots: {
        Row: { capacity: number; duration: number; gym_id: string; id: string; peak: boolean; price: number; sort_order: number; time: string }
        Insert: { capacity?: number; duration: number; gym_id: string; id: string; peak?: boolean; price: number; sort_order?: number; time: string }
        Update: { capacity?: number; duration?: number; gym_id?: string; id?: string; peak?: boolean; price?: number; sort_order?: number; time?: string }
        Relationships: [
          { foreignKeyName: "slots_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ]
      }
      trainer_reviews: {
        Row: { comment: string | null; created_at: string; id: string; rating: number; reviewer_name: string; tags: string[]; trainer_id: string; user_id: string }
        Insert: { comment?: string | null; created_at?: string; id?: string; rating: number; reviewer_name: string; tags?: string[]; trainer_id: string; user_id: string }
        Update: { comment?: string | null; created_at?: string; id?: string; rating?: number; reviewer_name?: string; tags?: string[]; trainer_id?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "trainer_reviews_trainer_id_fkey"; columns: ["trainer_id"]; isOneToOne: false; referencedRelation: "trainers"; referencedColumns: ["id"] },
        ]
      }
      trainers: {
        Row: { avatar_url: string | null; bio: string | null; experience_years: number; fee_30: number; fee_60: number; id: string; languages: string[]; name: string; rating: number; specializations: string[] }
        Insert: { avatar_url?: string | null; bio?: string | null; experience_years?: number; fee_30: number; fee_60: number; id: string; languages?: string[]; name: string; rating?: number; specializations?: string[] }
        Update: { avatar_url?: string | null; bio?: string | null; experience_years?: number; fee_30?: number; fee_60?: number; id?: string; languages?: string[]; name?: string; rating?: number; specializations?: string[] }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      add_blackout: {
        Args: { p_date: string; p_gym_id: string; p_reason?: string; p_slot_id?: string }
        Returns: { blackout_date: string; created_at: string; gym_id: string; id: string; reason: string | null; slot_id: string | null }
        SetofOptions: { from: "*"; to: "gym_blackouts"; isOneToOne: true; isSetofReturn: false }
      }
      cancel_booking: {
        Args: { p_as_credits: boolean; p_booking_id: string }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
        SetofOptions: { from: "*"; to: "bookings"; isOneToOne: true; isSetofReturn: false }
      }
      checkin: {
        Args: { p_booking_id: string }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
        SetofOptions: { from: "*"; to: "bookings"; isOneToOne: true; isSetofReturn: false }
      }
      checkout: {
        Args: { p_booking_id: string }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
        SetofOptions: { from: "*"; to: "bookings"; isOneToOne: true; isSetofReturn: false }
      }
      claim_gym: {
        Args: { p_gym_id: string }
        Returns: { created_at: string; gym_id: string; user_id: string }
        SetofOptions: { from: "*"; to: "gym_owners"; isOneToOne: true; isSetofReturn: false }
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
          p_starts_at?: string
          p_time: string
          p_title: string
          p_trainer_id?: string
          p_trainer_name?: string
        }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
        SetofOptions: { from: "*"; to: "bookings"; isOneToOne: true; isSetofReturn: false }
      }
      create_gym: {
        Args: {
          p_about?: string
          p_amenities?: string[]
          p_area?: string
          p_city?: string
          p_effective_capacity?: number
          p_image_url?: string
          p_images?: string[]
          p_lat?: number
          p_lng?: number
          p_name: string
          p_price_from?: number
          p_slots?: Json
          p_timings?: string
        }
        Returns: Database["public"]["Tables"]["gyms"]["Row"]
        SetofOptions: { from: "*"; to: "gyms"; isOneToOne: true; isSetofReturn: false }
      }
      create_slot: {
        Args: { p_capacity: number; p_duration: number; p_gym_id: string; p_peak?: boolean; p_price: number; p_time: string }
        Returns: Database["public"]["Tables"]["slots"]["Row"]
        SetofOptions: { from: "*"; to: "slots"; isOneToOne: true; isSetofReturn: false }
      }
      cancel_event: {
        Args: { p_event_id: string }
        Returns: Database["public"]["Tables"]["events"]["Row"]
        SetofOptions: { from: "*"; to: "events"; isOneToOne: true; isSetofReturn: false }
      }
      create_event: {
        Args: { p_capacity: number; p_category: string; p_description: string; p_duration_mins: number; p_event_date: string; p_event_time: string; p_gym_id: string; p_image_url?: string; p_price?: number; p_title: string; p_what_to_bring?: string }
        Returns: Database["public"]["Tables"]["events"]["Row"]
        SetofOptions: { from: "*"; to: "events"; isOneToOne: true; isSetofReturn: false }
      }
      event_analytics: {
        Args: { p_event_id: string }
        Returns: { attended: number; new_to_gym: number; reservations: number; revenue: number }[]
      }
      update_event: {
        Args: { p_capacity: number; p_category: string; p_description: string; p_duration_mins: number; p_event_date: string; p_event_time: string; p_event_id: string; p_image_url: string; p_price: number; p_title: string; p_what_to_bring: string }
        Returns: Database["public"]["Tables"]["events"]["Row"]
        SetofOptions: { from: "*"; to: "events"; isOneToOne: true; isSetofReturn: false }
      }
      credit_balance: { Args: never; Returns: number }
      delete_slot: { Args: { p_slot_id: string }; Returns: undefined }
      dispatch_due_reminders: { Args: never; Returns: number }
      dispatch_expiring_credits: { Args: never; Returns: number }
      issue_goodwill: {
        Args: { p_amount: number; p_label?: string; p_user_id: string }
        Returns: Database["public"]["Tables"]["credit_ledger"]["Row"]
        SetofOptions: { from: "*"; to: "credit_ledger"; isOneToOne: true; isSetofReturn: false }
      }
      enqueue_notification: {
        Args: { p_body: string; p_data?: Json; p_reference?: string; p_title: string; p_type: string; p_user_id: string }
        Returns: string
      }
      ensure_profile: {
        Args: { p_full_name?: string }
        Returns: Database["public"]["Tables"]["profiles"]["Row"]
        SetofOptions: { from: "*"; to: "profiles"; isOneToOne: true; isSetofReturn: false }
      }
      flush_outbound_notifications: { Args: never; Returns: number }
      get_notification_prefs: {
        Args: never
        Returns: Database["public"]["Tables"]["notification_prefs"]["Row"]
        SetofOptions: { from: "*"; to: "notification_prefs"; isOneToOne: true; isSetofReturn: false }
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: { Args: { p_id: string }; Returns: boolean }
      notif_category: { Args: { p_type: string }; Returns: string }
      owns_gym: { Args: { p_gym_id: string; p_uid: string }; Returns: boolean }
      partner_checkin: {
        Args: { p_booking_id: string; p_override?: boolean }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
        SetofOptions: { from: "*"; to: "bookings"; isOneToOne: true; isSetofReturn: false }
      }
      partner_checkin_by_code: {
        Args: { p_code: string; p_gym_id?: string; p_override?: boolean }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
        SetofOptions: { from: "*"; to: "bookings"; isOneToOne: true; isSetofReturn: false }
      }
      partner_set_crowd: {
        Args: { p_gym_id: string; p_level: string }
        Returns: Database["public"]["Tables"]["gyms"]["Row"]
        SetofOptions: { from: "*"; to: "gyms"; isOneToOne: true; isSetofReturn: false }
      }
      partner_set_walkins: {
        Args: { p_count: number; p_gym_id: string }
        Returns: Database["public"]["Tables"]["gyms"]["Row"]
        SetofOptions: { from: "*"; to: "gyms"; isOneToOne: true; isSetofReturn: false }
      }
      partner_settlement: {
        Args: never
        Returns: { commission: number; gross: number; payout: number; sessions: number }[]
      }
      recompute_crowd: { Args: { p_gym_id: string }; Returns: undefined }
      register_push_token: { Args: { p_platform?: string; p_token: string }; Returns: undefined }
      remove_blackout: { Args: { p_blackout_id: string }; Returns: undefined }
      resolve_report: {
        Args: { p_report_id: string; p_resolution?: string; p_status: string }
        Returns: Database["public"]["Tables"]["reports"]["Row"]
        SetofOptions: { from: "*"; to: "reports"; isOneToOne: true; isSetofReturn: false }
      }
      set_notification_pref: {
        Args: { p_key: string; p_value: boolean }
        Returns: Database["public"]["Tables"]["notification_prefs"]["Row"]
        SetofOptions: { from: "*"; to: "notification_prefs"; isOneToOne: true; isSetofReturn: false }
      }
      slot_availability: {
        Args: { p_date: string; p_gym_id: string }
        Returns: { booked: number; capacity: number; remaining: number; slot_id: string }[]
      }
      submit_gym_for_review: {
        Args: { p_gym_id: string }
        Returns: Database["public"]["Tables"]["gyms"]["Row"]
        SetofOptions: { from: "*"; to: "gyms"; isOneToOne: true; isSetofReturn: false }
      }
      submit_report: {
        Args: { p_details?: string; p_reason: string; p_subject_id: string; p_subject_label: string; p_subject_type: string }
        Returns: Database["public"]["Tables"]["reports"]["Row"]
        SetofOptions: { from: "*"; to: "reports"; isOneToOne: true; isSetofReturn: false }
      }
      submit_review: {
        Args: { p_comment?: string; p_gym_id: string; p_rating: number; p_tags?: string[] }
        Returns: Database["public"]["Tables"]["reviews"]["Row"]
        SetofOptions: { from: "*"; to: "reviews"; isOneToOne: true; isSetofReturn: false }
      }
      submit_trainer_review: {
        Args: { p_comment?: string; p_rating: number; p_tags?: string[]; p_trainer_id: string }
        Returns: Database["public"]["Tables"]["trainer_reviews"]["Row"]
        SetofOptions: { from: "*"; to: "trainer_reviews"; isOneToOne: true; isSetofReturn: false }
      }
      unread_notification_count: { Args: never; Returns: number }
      unregister_push_token: { Args: { p_token: string }; Returns: undefined }
      update_gym: {
        Args: {
          p_about: string
          p_amenities: string[]
          p_area: string
          p_city: string
          p_effective_capacity: number
          p_gym_id: string
          p_image_url: string
          p_images: string[]
          p_lat: number
          p_lng: number
          p_name: string
          p_price_from: number
          p_timings: string
        }
        Returns: Database["public"]["Tables"]["gyms"]["Row"]
        SetofOptions: { from: "*"; to: "gyms"; isOneToOne: true; isSetofReturn: false }
      }
      update_slot: {
        Args: { p_capacity: number; p_duration: number; p_peak: boolean; p_price: number; p_slot_id: string; p_time: string }
        Returns: Database["public"]["Tables"]["slots"]["Row"]
        SetofOptions: { from: "*"; to: "slots"; isOneToOne: true; isSetofReturn: false }
      }
      upsert_gym_kyc: {
        Args: { p_bank_account_name: string; p_bank_account_number: string; p_bank_ifsc: string; p_gstin: string; p_gym_id: string; p_legal_name: string; p_pan: string }
        Returns: Database["public"]["Tables"]["gym_kyc"]["Row"]
        SetofOptions: { from: "*"; to: "gym_kyc"; isOneToOne: true; isSetofReturn: false }
      }
      verify_gym: {
        Args: { p_approve: boolean; p_gym_id: string; p_reason?: string }
        Returns: Database["public"]["Tables"]["gyms"]["Row"]
        SetofOptions: { from: "*"; to: "gyms"; isOneToOne: true; isSetofReturn: false }
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
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
