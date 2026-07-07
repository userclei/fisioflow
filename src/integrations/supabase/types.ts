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
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string | null
          created_at: string
          id: string
          ip_hash: string | null
          link_id: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          link_id?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          link_id?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commission_rules: {
        Row: {
          active: boolean
          affiliate_type: string | null
          commission_fixed: number | null
          commission_pct: number | null
          cookie_days: number | null
          created_at: string
          id: string
          name: string
          priority: number
          tier: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliate_type?: string | null
          commission_fixed?: number | null
          commission_pct?: number | null
          cookie_days?: number | null
          created_at?: string
          id?: string
          name: string
          priority?: number
          tier?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliate_type?: string | null
          commission_fixed?: number | null
          commission_pct?: number | null
          cookie_days?: number | null
          created_at?: string
          id?: string
          name?: string
          priority?: number
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          available_at: string | null
          conversion_id: string | null
          created_at: string
          id: string
          paid_at: string | null
          payout_id: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          available_at?: string | null
          conversion_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          available_at?: string | null
          conversion_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "affiliate_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_payout_fk"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "affiliate_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string | null
          amount: number
          created_at: string
          id: string
          metadata: Json
          status: string
          workspace_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          status?: string
          workspace_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_coupons: {
        Row: {
          active: boolean
          affiliate_id: string
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
        }
        Insert: {
          active?: boolean
          affiliate_id: string
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
        }
        Update: {
          active?: boolean
          affiliate_id?: string
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_leads: {
        Row: {
          affiliate_id: string | null
          created_at: string
          email: string | null
          id: string
          metadata: Json
          name: string | null
          phone: string | null
          status: string
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_leads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_id: string
          campaign: string | null
          clicks: number
          created_at: string
          destination_url: string
          id: string
          slug: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          affiliate_id: string
          campaign?: string | null
          clicks?: number
          created_at?: string
          destination_url?: string
          id?: string
          slug: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          affiliate_id?: string
          campaign?: string | null
          clicks?: number
          created_at?: string
          destination_url?: string
          id?: string
          slug?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payout_items: {
        Row: {
          amount: number
          commission_id: string
          created_at: string
          id: string
          payout_id: string
        }
        Insert: {
          amount?: number
          commission_id: string
          created_at?: string
          id?: string
          payout_id: string
        }
        Update: {
          amount?: number
          commission_id?: string
          created_at?: string
          id?: string
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payout_items_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "affiliate_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "affiliate_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          method: string
          paid_at: string | null
          paid_by: string | null
          receipt_url: string | null
          reference: string | null
          status: string
          total_amount: number
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          method?: string
          paid_at?: string | null
          paid_by?: string | null
          receipt_url?: string | null
          reference?: string | null
          status?: string
          total_amount?: number
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          method?: string
          paid_at?: string | null
          paid_by?: string | null
          receipt_url?: string | null
          reference?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cookie_days: number
          created_at: string
          custom_commission_fixed: number | null
          custom_commission_pct: number | null
          document: string | null
          email: string
          id: string
          instagram: string | null
          name: string
          notes: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          slug: string | null
          status: string
          suspended_at: string | null
          tier: string
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cookie_days?: number
          created_at?: string
          custom_commission_fixed?: number | null
          custom_commission_pct?: number | null
          document?: string | null
          email: string
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug?: string | null
          status?: string
          suspended_at?: string | null
          tier?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cookie_days?: number
          created_at?: string
          custom_commission_fixed?: number | null
          custom_commission_pct?: number | null
          document?: string | null
          email?: string
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug?: string | null
          status?: string
          suspended_at?: string | null
          tier?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string
          created_by: string
          end_time: string
          event_date: string
          id: string
          location: string | null
          notes: string | null
          patient_id: string | null
          professional_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          title: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_time: string
          event_date: string
          id?: string
          location?: string | null
          notes?: string | null
          patient_id?: string | null
          professional_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_time?: string
          event_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          patient_id?: string | null
          professional_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_identifiers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          identifier_type: string
          identifier_value: string
          reason: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          identifier_type: string
          identifier_value: string
          reason?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          identifier_type?: string
          identifier_value?: string
          reason?: string | null
        }
        Relationships: []
      }
      booking_links: {
        Row: {
          active: boolean
          advance_days: number
          buffer_min: number
          created_at: string
          description: string | null
          duration_min: number
          end_time: string
          id: string
          owner_user_id: string
          slug: string
          start_time: string
          timezone: string
          title: string
          updated_at: string
          working_days: number[]
          workspace_id: string
        }
        Insert: {
          active?: boolean
          advance_days?: number
          buffer_min?: number
          created_at?: string
          description?: string | null
          duration_min?: number
          end_time?: string
          id?: string
          owner_user_id: string
          slug: string
          start_time?: string
          timezone?: string
          title: string
          updated_at?: string
          working_days?: number[]
          workspace_id: string
        }
        Update: {
          active?: boolean
          advance_days?: number
          buffer_min?: number
          created_at?: string
          description?: string | null
          duration_min?: number
          end_time?: string
          id?: string
          owner_user_id?: string
          slug?: string
          start_time?: string
          timezone?: string
          title?: string
          updated_at?: string
          working_days?: number[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          booking_link_id: string
          created_at: string
          duration_min: number
          id: string
          lead_email: string | null
          lead_name: string
          lead_phone: string | null
          notes: string | null
          owner_user_id: string
          scheduled_at: string
          status: string
          workspace_id: string
        }
        Insert: {
          booking_link_id: string
          created_at?: string
          duration_min?: number
          id?: string
          lead_email?: string | null
          lead_name: string
          lead_phone?: string | null
          notes?: string | null
          owner_user_id: string
          scheduled_at: string
          status?: string
          workspace_id: string
        }
        Update: {
          booking_link_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string | null
          notes?: string | null
          owner_user_id?: string
          scheduled_at?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_deliveries: {
        Row: {
          broadcast_id: string | null
          created_at: string
          error: string | null
          id: string
          phone: string | null
          rendered_body: string | null
          status: string
          workspace_id: string | null
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          phone?: string | null
          rendered_body?: string | null
          status?: string
          workspace_id?: string | null
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          phone?: string | null
          rendered_body?: string | null
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_deliveries_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          audience_total: number
          created_at: string
          created_by: string | null
          custom_body: string | null
          failed: number
          finished_at: string | null
          id: string
          plan: string | null
          rendered_sample: string | null
          scope: string
          sent: number
          status: string
          template_id: string | null
          title: string
        }
        Insert: {
          audience_total?: number
          created_at?: string
          created_by?: string | null
          custom_body?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          plan?: string | null
          rendered_sample?: string | null
          scope?: string
          sent?: number
          status?: string
          template_id?: string | null
          title: string
        }
        Update: {
          audience_total?: number
          created_at?: string
          created_by?: string | null
          custom_body?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          plan?: string | null
          rendered_sample?: string | null
          scope?: string
          sent?: number
          status?: string
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      btzap_config: {
        Row: {
          connection_status: string
          endpoint_disconnect: string
          endpoint_qr: string
          endpoint_send_text: string
          endpoint_status: string
          id: number
          instance_id: string | null
          last_check_at: string | null
          last_error: string | null
          phone_number: string | null
          profile_name: string | null
          qr_code: string | null
          token: string | null
          updated_at: string
          url_base: string | null
          webhook_secret: string | null
        }
        Insert: {
          connection_status?: string
          endpoint_disconnect?: string
          endpoint_qr?: string
          endpoint_send_text?: string
          endpoint_status?: string
          id?: number
          instance_id?: string | null
          last_check_at?: string | null
          last_error?: string | null
          phone_number?: string | null
          profile_name?: string | null
          qr_code?: string | null
          token?: string | null
          updated_at?: string
          url_base?: string | null
          webhook_secret?: string | null
        }
        Update: {
          connection_status?: string
          endpoint_disconnect?: string
          endpoint_qr?: string
          endpoint_send_text?: string
          endpoint_status?: string
          id?: number
          instance_id?: string | null
          last_check_at?: string | null
          last_error?: string | null
          phone_number?: string | null
          profile_name?: string | null
          qr_code?: string | null
          token?: string | null
          updated_at?: string
          url_base?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      charges: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          patient_id: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["charge_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_id?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_id?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          category: Database["public"]["Enums"]["note_category"]
          content: string
          created_at: string
          created_by: string
          id: string
          patient_id: string
          professional_id: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["note_visibility"]
          workspace_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["note_category"]
          content: string
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
          professional_id: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
          workspace_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["note_category"]
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          professional_id?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          lead_id: string
          type: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          type: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          next_action_at: string | null
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          source: string | null
          stage: string
          tags: string[]
          updated_at: string
          value_cents: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          next_action_at?: string | null
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          tags?: string[]
          updated_at?: string
          value_cents?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          next_action_at?: string | null
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          tags?: string[]
          updated_at?: string
          value_cents?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quotes: {
        Row: {
          active: boolean
          author: string
          created_at: string
          id: string
          text: string
        }
        Insert: {
          active?: boolean
          author: string
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          active?: boolean
          author?: string
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: []
      }
      dictionary_terms: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          definition: string
          id: string
          is_global: boolean
          term: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          definition: string
          id?: string
          is_global?: boolean
          term: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          definition?: string
          id?: string
          is_global?: boolean
          term?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_terms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_executions: {
        Row: {
          channel: string | null
          created_at: string
          error: string | null
          flow_id: string | null
          id: string
          invoice_id: string | null
          rendered_body: string | null
          status: string
          step_id: string | null
          workspace_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          error?: string | null
          flow_id?: string | null
          id?: string
          invoice_id?: string | null
          rendered_body?: string | null
          status?: string
          step_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          error?: string | null
          flow_id?: string | null
          id?: string
          invoice_id?: string | null
          rendered_body?: string | null
          status?: string
          step_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dunning_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "dunning_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_executions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_executions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "dunning_flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_flow_steps: {
        Row: {
          channel: string
          created_at: string
          flow_id: string
          id: string
          is_active: boolean
          offset_days: number
          order_index: number
          template_id: string | null
          trigger_type: string
        }
        Insert: {
          channel?: string
          created_at?: string
          flow_id: string
          id?: string
          is_active?: boolean
          offset_days?: number
          order_index?: number
          template_id?: string | null
          trigger_type?: string
        }
        Update: {
          channel?: string
          created_at?: string
          flow_id?: string
          id?: string
          is_active?: boolean
          offset_days?: number
          order_index?: number
          template_id?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dunning_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "dunning_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_flow_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          stop_on_negotiation: boolean
          stop_on_paid: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          stop_on_negotiation?: boolean
          stop_on_paid?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          stop_on_negotiation?: boolean
          stop_on_paid?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          source: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          source?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          source?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_prescription_items: {
        Row: {
          created_at: string
          duration: string | null
          exercise_id: string | null
          id: string
          notes: string | null
          order_index: number
          prescription_id: string
          repetitions: string | null
          sets: string | null
        }
        Insert: {
          created_at?: string
          duration?: string | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          prescription_id: string
          repetitions?: string | null
          sets?: string | null
        }
        Update: {
          created_at?: string
          duration?: string | null
          exercise_id?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          prescription_id?: string
          repetitions?: string | null
          sets?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_prescription_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "exercise_prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_prescriptions: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          patient_id: string
          professional_id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          patient_id: string
          professional_id: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          patient_id?: string
          professional_id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          difficulty: string | null
          duration: string | null
          id: string
          instructions: string | null
          media_url: string | null
          name: string
          repetitions: string | null
          sets: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          difficulty?: string | null
          duration?: string | null
          id?: string
          instructions?: string | null
          media_url?: string | null
          name: string
          repetitions?: string | null
          sets?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string | null
          duration?: string | null
          id?: string
          instructions?: string | null
          media_url?: string | null
          name?: string
          repetitions?: string | null
          sets?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          metadata: Json
          name: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content_md: string
          created_at: string
          id: string
          is_current: boolean
          kind: string
          published_at: string | null
          summary: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content_md?: string
          created_at?: string
          id?: string
          is_current?: boolean
          kind: string
          published_at?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          is_current?: boolean
          kind?: string
          published_at?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      legal_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      lgpd_requests: {
        Row: {
          created_at: string
          id: string
          payload: Json
          request_type: string
          requester_email: string
          requester_name: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          request_type: string
          requester_email: string
          requester_name?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          request_type?: string
          requester_email?: string
          requester_name?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          documents: Json
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          health_plan: string | null
          id: string
          observations: string | null
          phone: string | null
          profession: string | null
          rg: string | null
          status: Database["public"]["Enums"]["patient_status"]
          treatment_goal: string | null
          updated_at: string
          whatsapp: string | null
          workspace_id: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          documents?: Json
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          health_plan?: string | null
          id?: string
          observations?: string | null
          phone?: string | null
          profession?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          treatment_goal?: string | null
          updated_at?: string
          whatsapp?: string | null
          workspace_id: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          documents?: Json
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          health_plan?: string | null
          id?: string
          observations?: string | null
          phone?: string | null
          profession?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          treatment_goal?: string | null
          updated_at?: string
          whatsapp?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          default_workspace_id: string | null
          email: string | null
          full_name: string
          id: string
          last_login_at: string | null
          phone: string | null
          phone_e164: string | null
          phone_verified_at: string | null
          professional_register: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          professional_register?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          default_workspace_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          professional_register?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_injection_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          pattern: string
          severity: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          pattern: string
          severity?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          pattern?: string
          severity?: string
        }
        Relationships: []
      }
      rate_limit_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          limit_count: number
          window_seconds: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          limit_count?: number
          window_seconds?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          limit_count?: number
          window_seconds?: number
        }
        Relationships: []
      }
      security_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json
          severity: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          severity?: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          severity?: string
        }
        Relationships: []
      }
      security_incidents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          id: number
          updated_at: string
          value: Json
        }
        Insert: {
          id?: number
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: number
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sticky_notes: {
        Row: {
          color: string | null
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticky_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_block_after_days: number | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          due_day: number | null
          expires_at: string | null
          id: string
          monthly_price: number | null
          next_due_date: string | null
          payment_method: string | null
          plan: Database["public"]["Enums"]["plan_kind"]
          provider: string | null
          provider_subscription_id: string | null
          started_at: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_block_after_days?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          due_day?: number | null
          expires_at?: string | null
          id?: string
          monthly_price?: number | null
          next_due_date?: string | null
          payment_method?: string | null
          plan?: Database["public"]["Enums"]["plan_kind"]
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auto_block_after_days?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          due_day?: number | null
          expires_at?: string | null
          id?: string
          monthly_price?: number | null
          next_due_date?: string | null
          payment_method?: string | null
          plan?: Database["public"]["Enums"]["plan_kind"]
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          patient_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_records: {
        Row: {
          created_at: string
          created_by: string
          id: string
          input_data: Json
          patient_id: string | null
          result_data: Json
          tool_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          input_data?: Json
          patient_id?: string | null
          result_data?: Json
          tool_type: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          input_data?: Json
          patient_id?: string | null
          result_data?: Json
          tool_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          language: string
          mode: Database["public"]["Enums"]["use_mode"]
          notifications_enabled: boolean
          theme: Database["public"]["Enums"]["theme_pref"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          mode?: Database["public"]["Enums"]["use_mode"]
          notifications_enabled?: boolean
          theme?: Database["public"]["Enums"]["theme_pref"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          mode?: Database["public"]["Enums"]["use_mode"]
          notifications_enabled?: boolean
          theme?: Database["public"]["Enums"]["theme_pref"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string
          error: string | null
          event_type: string | null
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          provider_response: Json | null
          related_id: string | null
          related_type: string | null
          status: string
          to_number: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          provider_response?: Json | null
          related_id?: string | null
          related_type?: string | null
          status?: string
          to_number: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          provider_response?: Json | null
          related_id?: string | null
          related_type?: string | null
          status?: string
          to_number?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          active: boolean
          body: string
          buttons: Json
          category: string | null
          created_at: string
          description: string | null
          footer_text: string | null
          format: string | null
          id: string
          key: string | null
          list_button_text: string | null
          list_sections: Json
          message_type: string
          name: string
          purpose: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string
          buttons?: Json
          category?: string | null
          created_at?: string
          description?: string | null
          footer_text?: string | null
          format?: string | null
          id?: string
          key?: string | null
          list_button_text?: string | null
          list_sections?: Json
          message_type?: string
          name?: string
          purpose?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          buttons?: Json
          category?: string | null
          created_at?: string
          description?: string | null
          footer_text?: string | null
          format?: string | null
          id?: string
          key?: string | null
          list_button_text?: string | null
          list_sections?: Json
          message_type?: string
          name?: string
          purpose?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          cnpj: string | null
          created_at: string
          due_date: string | null
          id: string
          internal_notes: string | null
          last_access_at: string | null
          max_users: number | null
          monthly_price: number | null
          name: string
          owner_id: string
          phone: string | null
          plan: Database["public"]["Enums"]["plan_kind"]
          responsible_email: string | null
          responsible_name: string | null
          status: Database["public"]["Enums"]["workspace_status"]
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          last_access_at?: string | null
          max_users?: number | null
          monthly_price?: number | null
          name: string
          owner_id: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_kind"]
          responsible_email?: string | null
          responsible_name?: string | null
          status?: Database["public"]["Enums"]["workspace_status"]
          type?: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          last_access_at?: string | null
          max_users?: number | null
          monthly_price?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_kind"]
          responsible_email?: string | null
          responsible_name?: string | null
          status?: Database["public"]["Enums"]["workspace_status"]
          type?: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      record_event: {
        Args: {
          _event_type: string
          _metadata?: Json
          _source?: string
          _workspace_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "physiotherapist" | "assistant"
      appointment_status: "scheduled" | "completed" | "cancelled" | "missed"
      appointment_type: "avaliacao" | "sessao" | "retorno" | "outro"
      charge_status: "pending" | "paid" | "overdue" | "cancelled"
      member_status: "active" | "invited" | "disabled"
      note_category:
        | "avaliacao"
        | "evolucao"
        | "observacao"
        | "retorno"
        | "outro"
      note_visibility: "private" | "workspace"
      patient_status: "active" | "inactive"
      plan_kind: "free" | "pro_monthly" | "pro_yearly"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "completed" | "cancelled"
      theme_pref: "automatic" | "light" | "dark"
      use_mode: "professional" | "clinic"
      workspace_status:
        | "active"
        | "trial"
        | "blocked"
        | "cancelled"
        | "overdue"
        | "pending_payment"
      workspace_type: "individual" | "clinic" | "sandbox"
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
      app_role: ["super_admin", "admin", "physiotherapist", "assistant"],
      appointment_status: ["scheduled", "completed", "cancelled", "missed"],
      appointment_type: ["avaliacao", "sessao", "retorno", "outro"],
      charge_status: ["pending", "paid", "overdue", "cancelled"],
      member_status: ["active", "invited", "disabled"],
      note_category: [
        "avaliacao",
        "evolucao",
        "observacao",
        "retorno",
        "outro",
      ],
      note_visibility: ["private", "workspace"],
      patient_status: ["active", "inactive"],
      plan_kind: ["free", "pro_monthly", "pro_yearly"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "completed", "cancelled"],
      theme_pref: ["automatic", "light", "dark"],
      use_mode: ["professional", "clinic"],
      workspace_status: [
        "active",
        "trial",
        "blocked",
        "cancelled",
        "overdue",
        "pending_payment",
      ],
      workspace_type: ["individual", "clinic", "sandbox"],
    },
  },
} as const
