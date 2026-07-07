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
          auto_block_after_days: number
          created_at: string
          id: number
          pro_monthly_price: number
          pro_yearly_price: number
          sandbox_enabled: boolean
          support_email: string | null
          support_whatsapp: string | null
          updated_at: string
          webhooks_enabled: boolean
        }
        Insert: {
          auto_block_after_days?: number
          created_at?: string
          id?: number
          pro_monthly_price?: number
          pro_yearly_price?: number
          sandbox_enabled?: boolean
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
          webhooks_enabled?: boolean
        }
        Update: {
          auto_block_after_days?: number
          created_at?: string
          id?: number
          pro_monthly_price?: number
          pro_yearly_price?: number
          sandbox_enabled?: boolean
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
          webhooks_enabled?: boolean
        }
        Relationships: []
      }
      affiliate_assets: {
        Row: {
          active: boolean
          affiliate_id: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          kind: string
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          affiliate_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          affiliate_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_assets_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          city: string | null
          country: string | null
          created_at: string
          device: string | null
          fingerprint: string | null
          id: string
          ip: string | null
          link_id: string | null
          metadata: Json
          referer: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          affiliate_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          fingerprint?: string | null
          id?: string
          ip?: string | null
          link_id?: string | null
          metadata?: Json
          referer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          affiliate_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          fingerprint?: string | null
          id?: string
          ip?: string | null
          link_id?: string | null
          metadata?: Json
          referer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
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
          affiliate_type: Database["public"]["Enums"]["affiliate_type"] | null
          created_at: string
          fixed_amount: number | null
          id: string
          max_recurrence_months: number | null
          name: string
          percent: number | null
          plan: string | null
          priority: number
          recurring: boolean
          tier: Database["public"]["Enums"]["affiliate_tier"] | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliate_type?: Database["public"]["Enums"]["affiliate_type"] | null
          created_at?: string
          fixed_amount?: number | null
          id?: string
          max_recurrence_months?: number | null
          name: string
          percent?: number | null
          plan?: string | null
          priority?: number
          recurring?: boolean
          tier?: Database["public"]["Enums"]["affiliate_tier"] | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliate_type?: Database["public"]["Enums"]["affiliate_type"] | null
          created_at?: string
          fixed_amount?: number | null
          id?: string
          max_recurrence_months?: number | null
          name?: string
          percent?: number | null
          plan?: string | null
          priority?: number
          recurring?: boolean
          tier?: Database["public"]["Enums"]["affiliate_tier"] | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          available_at: string | null
          base_amount: number | null
          conversion_id: string | null
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          paid_at: string | null
          payout_id: string | null
          rule_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          available_at?: string | null
          base_amount?: number | null
          conversion_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          payout_id?: string | null
          rule_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          available_at?: string | null
          base_amount?: number | null
          conversion_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          payout_id?: string | null
          rule_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
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
            foreignKeyName: "affiliate_commissions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "affiliate_commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_commission_payout"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "affiliate_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          amount: number
          attribution_model: Database["public"]["Enums"]["attribution_model"]
          coupon_code: string | null
          created_at: string
          id: string
          invoice_id: string | null
          lead_id: string | null
          metadata: Json
          paid_at: string | null
          plan: string
          refunded_at: string | null
          status: Database["public"]["Enums"]["conversion_status"]
          subscription_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount?: number
          attribution_model?: Database["public"]["Enums"]["attribution_model"]
          coupon_code?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          metadata?: Json
          paid_at?: string | null
          plan: string
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["conversion_status"]
          subscription_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          attribution_model?: Database["public"]["Enums"]["attribution_model"]
          coupon_code?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          metadata?: Json
          paid_at?: string | null
          plan?: string
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["conversion_status"]
          subscription_id?: string | null
          updated_at?: string
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
            foreignKeyName: "affiliate_conversions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "affiliate_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
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
          applicable_plans: string[] | null
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          updated_at: string
          uses_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          affiliate_id: string
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          affiliate_id?: string
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
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
          affiliate_id: string
          attribution_model: Database["public"]["Enums"]["attribution_model"]
          auth_user_id: string | null
          click_id: string | null
          coupon_code: string | null
          created_at: string
          email: string | null
          id: string
          link_id: string | null
          metadata: Json
          name: string | null
          phone: string | null
          workspace_id: string | null
        }
        Insert: {
          affiliate_id: string
          attribution_model?: Database["public"]["Enums"]["attribution_model"]
          auth_user_id?: string | null
          click_id?: string | null
          coupon_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          link_id?: string | null
          metadata?: Json
          name?: string | null
          phone?: string | null
          workspace_id?: string | null
        }
        Update: {
          affiliate_id?: string
          attribution_model?: Database["public"]["Enums"]["attribution_model"]
          auth_user_id?: string | null
          click_id?: string | null
          coupon_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          link_id?: string | null
          metadata?: Json
          name?: string | null
          phone?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_leads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_leads_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_leads_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          active: boolean
          affiliate_id: string
          campaign: string | null
          clicks_count: number
          conversions_count: number
          created_at: string
          destination_url: string
          id: string
          leads_count: number
          slug: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          active?: boolean
          affiliate_id: string
          campaign?: string | null
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          destination_url?: string
          id?: string
          leads_count?: number
          slug: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          active?: boolean
          affiliate_id?: string
          campaign?: string | null
          clicks_count?: number
          conversions_count?: number
          created_at?: string
          destination_url?: string
          id?: string
          leads_count?: number
          slug?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
          metadata: Json
          method: Database["public"]["Enums"]["payout_method"]
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          receipt_url: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payout_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          metadata?: Json
          method?: Database["public"]["Enums"]["payout_method"]
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          receipt_url?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          method?: Database["public"]["Enums"]["payout_method"]
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          receipt_url?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          total_amount?: number
          updated_at?: string
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
          auth_user_id: string | null
          bank_info: Json | null
          cookie_days: number
          created_at: string
          custom_commission_fixed: number | null
          custom_commission_pct: number | null
          document: string | null
          email: string
          id: string
          instagram: string | null
          metadata: Json
          name: string
          notes: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          slug: string
          status: Database["public"]["Enums"]["affiliate_status"]
          suspended_at: string | null
          tier: Database["public"]["Enums"]["affiliate_tier"]
          type: Database["public"]["Enums"]["affiliate_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          bank_info?: Json | null
          cookie_days?: number
          created_at?: string
          custom_commission_fixed?: number | null
          custom_commission_pct?: number | null
          document?: string | null
          email: string
          id?: string
          instagram?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          suspended_at?: string | null
          tier?: Database["public"]["Enums"]["affiliate_tier"]
          type?: Database["public"]["Enums"]["affiliate_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          bank_info?: Json | null
          cookie_days?: number
          created_at?: string
          custom_commission_fixed?: number | null
          custom_commission_pct?: number | null
          document?: string | null
          email?: string
          id?: string
          instagram?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          suspended_at?: string | null
          tier?: Database["public"]["Enums"]["affiliate_tier"]
          type?: Database["public"]["Enums"]["affiliate_type"]
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
          workspace_id: string
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
          workspace_id: string
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
          workspace_id?: string
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
          blocked_until: string | null
          created_at: string
          created_by: string | null
          id: string
          is_permanent: boolean
          reason: string
          severity: string
          type: string
          value_hash: string
          value_masked: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_permanent?: boolean
          reason?: string
          severity?: string
          type: string
          value_hash: string
          value_masked: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_permanent?: boolean
          reason?: string
          severity?: string
          type?: string
          value_hash?: string
          value_masked?: string
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
          title?: string
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
          appointment_id: string | null
          booking_link_id: string
          created_at: string
          duration_min: number
          id: string
          lead_email: string | null
          lead_id: string | null
          lead_name: string
          lead_phone: string | null
          notes: string | null
          owner_user_id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["booking_status"]
          workspace_id: string
        }
        Insert: {
          appointment_id?: string | null
          booking_link_id: string
          created_at?: string
          duration_min: number
          id?: string
          lead_email?: string | null
          lead_id?: string | null
          lead_name: string
          lead_phone?: string | null
          notes?: string | null
          owner_user_id: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          workspace_id: string
        }
        Update: {
          appointment_id?: string | null
          booking_link_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          lead_email?: string | null
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string | null
          notes?: string | null
          owner_user_id?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
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
          broadcast_id: string
          error: string | null
          id: string
          phone: string | null
          rendered_body: string | null
          sent_at: string
          status: string
          workspace_id: string | null
        }
        Insert: {
          broadcast_id: string
          error?: string | null
          id?: string
          phone?: string | null
          rendered_body?: string | null
          sent_at?: string
          status?: string
          workspace_id?: string | null
        }
        Update: {
          broadcast_id?: string
          error?: string | null
          id?: string
          phone?: string | null
          rendered_body?: string | null
          sent_at?: string
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
          billing_automation_enabled: boolean
          billing_days_after: number
          billing_days_before: number
          connection_status: string
          created_at: string
          endpoint_disconnect: string
          endpoint_qr: string
          endpoint_send_buttons: string
          endpoint_send_template: string
          endpoint_send_text: string
          endpoint_status: string
          id: number
          instance_id: string | null
          last_check_at: string | null
          last_error: string | null
          otp_enabled: boolean
          phone_number: string | null
          profile_name: string | null
          qr_code: string | null
          token: string | null
          updated_at: string
          url_base: string | null
          webhook_secret: string | null
        }
        Insert: {
          billing_automation_enabled?: boolean
          billing_days_after?: number
          billing_days_before?: number
          connection_status?: string
          created_at?: string
          endpoint_disconnect?: string
          endpoint_qr?: string
          endpoint_send_buttons?: string
          endpoint_send_template?: string
          endpoint_send_text?: string
          endpoint_status?: string
          id?: number
          instance_id?: string | null
          last_check_at?: string | null
          last_error?: string | null
          otp_enabled?: boolean
          phone_number?: string | null
          profile_name?: string | null
          qr_code?: string | null
          token?: string | null
          updated_at?: string
          url_base?: string | null
          webhook_secret?: string | null
        }
        Update: {
          billing_automation_enabled?: boolean
          billing_days_after?: number
          billing_days_before?: number
          connection_status?: string
          created_at?: string
          endpoint_disconnect?: string
          endpoint_qr?: string
          endpoint_send_buttons?: string
          endpoint_send_template?: string
          endpoint_send_text?: string
          endpoint_status?: string
          id?: number
          instance_id?: string | null
          last_check_at?: string | null
          last_error?: string | null
          otp_enabled?: boolean
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
          amount: number
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
          created_by: string | null
          id: string
          lead_id: string
          type: Database["public"]["Enums"]["crm_activity_type"]
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          type?: Database["public"]["Enums"]["crm_activity_type"]
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          type?: Database["public"]["Enums"]["crm_activity_type"]
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
          patient_id: string | null
          phone: string | null
          source: Database["public"]["Enums"]["crm_source"]
          stage: Database["public"]["Enums"]["crm_stage"]
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
          patient_id?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["crm_source"]
          stage?: Database["public"]["Enums"]["crm_stage"]
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
          patient_id?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["crm_source"]
          stage?: Database["public"]["Enums"]["crm_stage"]
          tags?: string[]
          updated_at?: string
          value_cents?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
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
          channel: Database["public"]["Enums"]["dunning_channel"]
          created_at: string
          error: string | null
          flow_id: string | null
          id: string
          invoice_id: string | null
          message_log_id: string | null
          rendered_body: string | null
          sent_at: string
          status: Database["public"]["Enums"]["dunning_exec_status"]
          step_id: string | null
          workspace_id: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["dunning_channel"]
          created_at?: string
          error?: string | null
          flow_id?: string | null
          id?: string
          invoice_id?: string | null
          message_log_id?: string | null
          rendered_body?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["dunning_exec_status"]
          step_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["dunning_channel"]
          created_at?: string
          error?: string | null
          flow_id?: string | null
          id?: string
          invoice_id?: string | null
          message_log_id?: string | null
          rendered_body?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["dunning_exec_status"]
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
            foreignKeyName: "dunning_executions_message_log_id_fkey"
            columns: ["message_log_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_message_logs"
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
      dunning_flow_assignments: {
        Row: {
          created_at: string
          flow_id: string
          id: string
          plan: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          flow_id: string
          id?: string
          plan?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          flow_id?: string
          id?: string
          plan?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dunning_flow_assignments_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "dunning_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dunning_flow_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_flow_steps: {
        Row: {
          channel: Database["public"]["Enums"]["dunning_channel"]
          created_at: string
          flow_id: string
          id: string
          is_active: boolean
          offset_days: number
          order_index: number
          template_id: string | null
          trigger_type: Database["public"]["Enums"]["dunning_trigger"]
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["dunning_channel"]
          created_at?: string
          flow_id: string
          id?: string
          is_active?: boolean
          offset_days?: number
          order_index?: number
          template_id?: string | null
          trigger_type: Database["public"]["Enums"]["dunning_trigger"]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["dunning_channel"]
          created_at?: string
          flow_id?: string
          id?: string
          is_active?: boolean
          offset_days?: number
          order_index?: number
          template_id?: string | null
          trigger_type?: Database["public"]["Enums"]["dunning_trigger"]
          updated_at?: string
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
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          source: string
          user_agent: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          source?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          source?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
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
          exercise_id: string
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
          exercise_id: string
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
          exercise_id?: string
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
          due_date: string
          external_payment_id: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          external_payment_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          external_payment_id?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
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
          email: string
          id: string
          message: string | null
          name: string
          source: string
          usage_type: string
          user_agent: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          source?: string
          usage_type: string
          user_agent?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          source?: string
          usage_type?: string
          user_agent?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content_md: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          is_current: boolean
          kind: Database["public"]["Enums"]["legal_kind"]
          published_at: string | null
          summary: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content_md: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          is_current?: boolean
          kind: Database["public"]["Enums"]["legal_kind"]
          published_at?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          content_md?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          is_current?: boolean
          kind?: Database["public"]["Enums"]["legal_kind"]
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
          address: string | null
          city: string | null
          cnpj: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          dpo_email: string | null
          dpo_name: string | null
          id: number
          jurisdiction: string
          legal_name: string | null
          state: string | null
          updated_at: string
          website_url: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          dpo_email?: string | null
          dpo_name?: string | null
          id?: number
          jurisdiction?: string
          legal_name?: string | null
          state?: string | null
          updated_at?: string
          website_url?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          dpo_email?: string | null
          dpo_name?: string | null
          id?: number
          jurisdiction?: string
          legal_name?: string | null
          state?: string | null
          updated_at?: string
          website_url?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      lgpd_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          request_type: string
          requester_email: string | null
          requester_name: string
          requester_phone: string | null
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          request_type: string
          requester_email?: string | null
          requester_name: string
          requester_phone?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          request_type?: string
          requester_email?: string | null
          requester_name?: string
          requester_phone?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string | null
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
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
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
          action: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          pattern: string
          severity: string
          updated_at: string
        }
        Insert: {
          action?: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pattern: string
          severity: string
          updated_at?: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pattern?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_rules: {
        Row: {
          action: string
          created_at: string
          endpoint_pattern: string
          id: string
          is_active: boolean
          max_requests: number
          name: string
          target: string
          updated_at: string
          window_seconds: number
        }
        Insert: {
          action?: string
          created_at?: string
          endpoint_pattern?: string
          id?: string
          is_active?: boolean
          max_requests: number
          name: string
          target: string
          updated_at?: string
          window_seconds: number
        }
        Update: {
          action?: string
          created_at?: string
          endpoint_pattern?: string
          id?: string
          is_active?: boolean
          max_requests?: number
          name?: string
          target?: string
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          phone: string | null
          risk_score: number
          severity: string
          source: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          phone?: string | null
          risk_score?: number
          severity: string
          source: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          phone?: string | null
          risk_score?: number
          severity?: string
          source?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      security_incidents: {
        Row: {
          affected_phone: string | null
          affected_user_id: string | null
          affected_workspace_id: string | null
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          metadata: Json
          opened_at: string
          resolved_at: string | null
          severity: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_phone?: string | null
          affected_user_id?: string | null
          affected_workspace_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          opened_at?: string
          resolved_at?: string | null
          severity: string
          source: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_phone?: string | null
          affected_user_id?: string | null
          affected_workspace_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          opened_at?: string
          resolved_at?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          anti_bot_enabled: boolean
          captcha_enabled: boolean
          cors_strict: boolean
          data_retention_days: number
          dpo_email: string | null
          dpo_name: string | null
          honeypot_enabled: boolean
          id: number
          max_payload_kb: number
          min_form_seconds: number
          privacy_policy_url: string | null
          prompt_injection_enabled: boolean
          terms_url: string | null
          updated_at: string
          waf_enabled: boolean
        }
        Insert: {
          anti_bot_enabled?: boolean
          captcha_enabled?: boolean
          cors_strict?: boolean
          data_retention_days?: number
          dpo_email?: string | null
          dpo_name?: string | null
          honeypot_enabled?: boolean
          id?: number
          max_payload_kb?: number
          min_form_seconds?: number
          privacy_policy_url?: string | null
          prompt_injection_enabled?: boolean
          terms_url?: string | null
          updated_at?: string
          waf_enabled?: boolean
        }
        Update: {
          anti_bot_enabled?: boolean
          captcha_enabled?: boolean
          cors_strict?: boolean
          data_retention_days?: number
          dpo_email?: string | null
          dpo_name?: string | null
          honeypot_enabled?: boolean
          id?: number
          max_payload_kb?: number
          min_form_seconds?: number
          privacy_policy_url?: string | null
          prompt_injection_enabled?: boolean
          terms_url?: string | null
          updated_at?: string
          waf_enabled?: boolean
        }
        Relationships: []
      }
      sticky_notes: {
        Row: {
          category: string
          color: string
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          is_archived: boolean
          is_important: boolean
          is_pinned: boolean
          patient_id: string | null
          position: number
          priority: string
          reminder_at: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          view_status: string
          visibility: string
          workspace_id: string
        }
        Insert: {
          category?: string
          color?: string
          content?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          is_archived?: boolean
          is_important?: boolean
          is_pinned?: boolean
          patient_id?: string | null
          position?: number
          priority?: string
          reminder_at?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          view_status?: string
          visibility?: string
          workspace_id: string
        }
        Update: {
          category?: string
          color?: string
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          is_archived?: boolean
          is_important?: boolean
          is_pinned?: boolean
          patient_id?: string | null
          position?: number
          priority?: string
          reminder_at?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          view_status?: string
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticky_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
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
          attempts: number
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          payload: Json
          request_headers: Json
          response_body: string | null
          response_status: number | null
          status: Database["public"]["Enums"]["delivery_status"]
          url: string
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          request_headers?: Json
          response_body?: string | null
          response_status?: number | null
          status?: Database["public"]["Enums"]["delivery_status"]
          url: string
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          request_headers?: Json
          response_body?: string | null
          response_status?: number | null
          status?: Database["public"]["Enums"]["delivery_status"]
          url?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
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
          created_at: string
          created_by: string | null
          description: string | null
          events: string[]
          headers: Json
          id: string
          name: string
          secret: string
          status: Database["public"]["Enums"]["webhook_status"]
          updated_at: string
          url: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          events?: string[]
          headers?: Json
          id?: string
          name: string
          secret?: string
          status?: Database["public"]["Enums"]["webhook_status"]
          updated_at?: string
          url: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          events?: string[]
          headers?: Json
          id?: string
          name?: string
          secret?: string
          status?: Database["public"]["Enums"]["webhook_status"]
          updated_at?: string
          url?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_logs: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          error: string | null
          external_id: string | null
          failed_at: string | null
          id: string
          metadata: Json
          read_at: string | null
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          status: string
          template: string | null
          to_number: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string
          template?: string | null
          to_number: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string
          template?: string | null
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
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          max_attempts: number
          phone: string
          purpose: string
          used_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          max_attempts?: number
          phone: string
          purpose: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          max_attempts?: number
          phone?: string
          purpose?: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          active: boolean
          body: string
          buttons: Json
          category: Database["public"]["Enums"]["template_category"]
          created_at: string
          description: string | null
          footer_text: string | null
          format: Database["public"]["Enums"]["template_format"]
          id: string
          key: string
          list_button_text: string | null
          list_sections: Json
          message_type: Database["public"]["Enums"]["whatsapp_message_type"]
          name: string
          purpose: string
          updated_at: string
          variables: Json
        }
        Insert: {
          active?: boolean
          body: string
          buttons?: Json
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          description?: string | null
          footer_text?: string | null
          format?: Database["public"]["Enums"]["template_format"]
          id?: string
          key: string
          list_button_text?: string | null
          list_sections?: Json
          message_type?: Database["public"]["Enums"]["whatsapp_message_type"]
          name: string
          purpose: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          active?: boolean
          body?: string
          buttons?: Json
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          description?: string | null
          footer_text?: string | null
          format?: Database["public"]["Enums"]["template_format"]
          id?: string
          key?: string
          list_button_text?: string | null
          list_sections?: Json
          message_type?: Database["public"]["Enums"]["whatsapp_message_type"]
          name?: string
          purpose?: string
          updated_at?: string
          variables?: Json
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
      generate_monthly_invoices: { Args: never; Returns: undefined }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_overdue_invoices: { Args: never; Returns: undefined }
      record_event: {
        Args: {
          _event_type: string
          _metadata?: Json
          _source?: string
          _workspace_id?: string
        }
        Returns: string
      }
      resolve_attribution: {
        Args: { _coupon_code?: string; _visitor_id: string }
        Returns: {
          affiliate_id: string
          click_id: string
          link_id: string
          model: Database["public"]["Enums"]["attribution_model"]
        }[]
      }
    }
    Enums: {
      affiliate_status: "pending" | "active" | "suspended" | "banned"
      affiliate_tier: "bronze" | "silver" | "gold" | "platinum"
      affiliate_type:
        | "influencer"
        | "professional"
        | "clinic"
        | "partner"
        | "student"
        | "other"
      app_role: "super_admin" | "admin" | "physiotherapist" | "assistant"
      appointment_status: "scheduled" | "completed" | "cancelled" | "missed"
      appointment_type: "avaliacao" | "sessao" | "retorno" | "outro"
      attribution_model: "first_click" | "last_click" | "coupon"
      booking_status: "pending" | "confirmed" | "cancelled"
      charge_status: "pending" | "paid" | "overdue" | "cancelled"
      commission_status: "pending" | "available" | "paid" | "canceled"
      conversion_status: "pending" | "paid" | "refunded" | "canceled"
      crm_activity_type:
        | "nota"
        | "ligacao"
        | "email"
        | "whatsapp"
        | "reuniao"
        | "outro"
      crm_source: "booking_link" | "manual" | "import" | "referral"
      crm_stage:
        | "novo"
        | "contato"
        | "qualificado"
        | "agendado"
        | "convertido"
        | "perdido"
      delivery_status: "pending" | "success" | "failed" | "retrying"
      dunning_channel: "whatsapp" | "email" | "both"
      dunning_exec_status:
        | "sent"
        | "failed"
        | "skipped"
        | "stopped"
        | "pending_provider"
      dunning_trigger: "before_due" | "on_due" | "after_due"
      invoice_status:
        | "pending"
        | "paid"
        | "overdue"
        | "cancelled"
        | "refunded"
        | "manual_release"
      legal_kind: "privacy" | "terms" | "cookies"
      member_status: "active" | "invited" | "disabled"
      note_category:
        | "avaliacao"
        | "evolucao"
        | "observacao"
        | "retorno"
        | "outro"
      note_visibility: "private" | "workspace"
      patient_status: "active" | "inactive"
      payout_method: "pix" | "ted" | "manual" | "other"
      payout_status: "draft" | "processing" | "paid" | "failed"
      plan_kind: "free" | "pro_monthly" | "pro_yearly"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "completed" | "cancelled"
      template_category:
        | "reminder"
        | "due_today"
        | "overdue"
        | "negotiation"
        | "payment_confirmed"
        | "custom"
      template_format: "text" | "html"
      theme_pref: "automatic" | "light" | "dark"
      use_mode: "professional" | "clinic"
      webhook_status: "active" | "inactive"
      whatsapp_message_type: "text" | "button" | "list"
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
      affiliate_status: ["pending", "active", "suspended", "banned"],
      affiliate_tier: ["bronze", "silver", "gold", "platinum"],
      affiliate_type: [
        "influencer",
        "professional",
        "clinic",
        "partner",
        "student",
        "other",
      ],
      app_role: ["super_admin", "admin", "physiotherapist", "assistant"],
      appointment_status: ["scheduled", "completed", "cancelled", "missed"],
      appointment_type: ["avaliacao", "sessao", "retorno", "outro"],
      attribution_model: ["first_click", "last_click", "coupon"],
      booking_status: ["pending", "confirmed", "cancelled"],
      charge_status: ["pending", "paid", "overdue", "cancelled"],
      commission_status: ["pending", "available", "paid", "canceled"],
      conversion_status: ["pending", "paid", "refunded", "canceled"],
      crm_activity_type: [
        "nota",
        "ligacao",
        "email",
        "whatsapp",
        "reuniao",
        "outro",
      ],
      crm_source: ["booking_link", "manual", "import", "referral"],
      crm_stage: [
        "novo",
        "contato",
        "qualificado",
        "agendado",
        "convertido",
        "perdido",
      ],
      delivery_status: ["pending", "success", "failed", "retrying"],
      dunning_channel: ["whatsapp", "email", "both"],
      dunning_exec_status: [
        "sent",
        "failed",
        "skipped",
        "stopped",
        "pending_provider",
      ],
      dunning_trigger: ["before_due", "on_due", "after_due"],
      invoice_status: [
        "pending",
        "paid",
        "overdue",
        "cancelled",
        "refunded",
        "manual_release",
      ],
      legal_kind: ["privacy", "terms", "cookies"],
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
      payout_method: ["pix", "ted", "manual", "other"],
      payout_status: ["draft", "processing", "paid", "failed"],
      plan_kind: ["free", "pro_monthly", "pro_yearly"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "completed", "cancelled"],
      template_category: [
        "reminder",
        "due_today",
        "overdue",
        "negotiation",
        "payment_confirmed",
        "custom",
      ],
      template_format: ["text", "html"],
      theme_pref: ["automatic", "light", "dark"],
      use_mode: ["professional", "clinic"],
      webhook_status: ["active", "inactive"],
      whatsapp_message_type: ["text", "button", "list"],
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
