/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Supabase Database TypeScript Interface Catalog
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jn_users: {
        Row: {
          id: string
          user_number: string
          email: string
          password_hash: string
          full_name: string
          role: string
          phone: string | null
          avatar_url: string | null
          department: string | null
          designation: string | null
          is_active: boolean
          last_login_at: string | null
          version_number: number
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_number: string
          email: string
          password_hash: string
          full_name: string
          role?: string
          phone?: string | null
          avatar_url?: string | null
          department?: string | null
          designation?: string | null
          is_active?: boolean
          last_login_at?: string | null
          version_number?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_number?: string
          email?: string
          password_hash?: string
          full_name?: string
          role?: string
          phone?: string | null
          avatar_url?: string | null
          department?: string | null
          designation?: string | null
          is_active?: boolean
          last_login_at?: string | null
          version_number?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
      }
      jn_clients: {
        Row: {
          id: string
          client_number: string
          category: string
          client_name: string
          trade_name: string | null
          business_name: string | null
          client_source: string
          referred_by: string | null
          pan: string | null
          aadhaar: string | null
          gstin: string | null
          tan: string | null
          udyam_registration: string | null
          fssai_number: string | null
          iec_number: string | null
          professional_tax_number: string | null
          pf_number: string | null
          esic_number: string | null
          cin: string | null
          din: string | null
          msme: string | null
          office_address: string | null
          city: string | null
          state: string | null
          pin_code: string | null
          country: string | null
          bank_name: string | null
          account_holder: string | null
          account_number: string | null
          ifsc: string | null
          branch: string | null
          upi: string | null
          business_nature: string | null
          business_type: string | null
          constitution: string | null
          date_of_incorporation: string | null
          date_of_registration: string | null
          financial_year: string | null
          assessment_year: string | null
          email: string | null
          mobile: string | null
          alternate_mobile: string | null
          whatsapp: string | null
          website: string | null
          status: string
          tags: string[] | null
          internal_notes: string | null
          version_number: number
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_number: string
          category?: string
          client_name: string
          trade_name?: string | null
          business_name?: string | null
          client_source?: string
          referred_by?: string | null
          pan?: string | null
          aadhaar?: string | null
          gstin?: string | null
          tan?: string | null
          udyam_registration?: string | null
          fssai_number?: string | null
          iec_number?: string | null
          professional_tax_number?: string | null
          pf_number?: string | null
          esic_number?: string | null
          cin?: string | null
          din?: string | null
          msme?: string | null
          office_address?: string | null
          city?: string | null
          state?: string | null
          pin_code?: string | null
          country?: string | null
          bank_name?: string | null
          account_holder?: string | null
          account_number?: string | null
          ifsc?: string | null
          branch?: string | null
          upi?: string | null
          business_nature?: string | null
          business_type?: string | null
          constitution?: string | null
          date_of_incorporation?: string | null
          date_of_registration?: string | null
          financial_year?: string | null
          assessment_year?: string | null
          email?: string | null
          mobile?: string | null
          alternate_mobile?: string | null
          whatsapp?: string | null
          website?: string | null
          status?: string
          tags?: string[] | null
          internal_notes?: string | null
          version_number?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_number?: string
          category?: string
          client_name?: string
          trade_name?: string | null
          business_name?: string | null
          client_source?: string
          referred_by?: string | null
          pan?: string | null
          aadhaar?: string | null
          gstin?: string | null
          tan?: string | null
          udyam_registration?: string | null
          fssai_number?: string | null
          iec_number?: string | null
          professional_tax_number?: string | null
          pf_number?: string | null
          esic_number?: string | null
          cin?: string | null
          din?: string | null
          msme?: string | null
          office_address?: string | null
          city?: string | null
          state?: string | null
          pin_code?: string | null
          country?: string | null
          bank_name?: string | null
          account_holder?: string | null
          account_number?: string | null
          ifsc?: string | null
          branch?: string | null
          upi?: string | null
          business_nature?: string | null
          business_type?: string | null
          constitution?: string | null
          date_of_incorporation?: string | null
          date_of_registration?: string | null
          financial_year?: string | null
          assessment_year?: string | null
          email?: string | null
          mobile?: string | null
          alternate_mobile?: string | null
          whatsapp?: string | null
          website?: string | null
          status?: string
          tags?: string[] | null
          internal_notes?: string | null
          version_number?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
      }
      jn_client_contacts: {
        Row: {
          id: string
          client_id: string
          contact_name: string
          role: string
          email: string | null
          phone: string | null
          is_primary: boolean
          version_number: number
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          contact_name: string
          role?: string
          email?: string | null
          phone?: string | null
          is_primary?: boolean
          version_number?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          contact_name?: string
          role?: string
          email?: string | null
          phone?: string | null
          is_primary?: boolean
          version_number?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
      }
      jn_notifications: {
        Row: {
          id: string
          recipient_user_id: string | null
          title: string
          message: string
          type: string
          priority: string
          target_audience: string | null
          is_read: boolean
          action_url: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          recipient_user_id?: string | null
          title: string
          message: string
          type?: string
          priority?: string
          target_audience?: string | null
          is_read?: boolean
          action_url?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          recipient_user_id?: string | null
          title?: string
          message?: string
          type?: string
          priority?: string
          target_audience?: string | null
          is_read?: boolean
          action_url?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      jn_broadcasts: {
        Row: {
          id: string
          broadcast_type: string
          target_audience: string
          subject: string
          message: string
          sender_email: string
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          broadcast_type?: string
          target_audience?: string
          subject: string
          message: string
          sender_email: string
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          broadcast_type?: string
          target_audience?: string
          subject?: string
          message?: string
          sender_email?: string
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      jn_audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_data: Json | null
          new_data: Json | null
          user_email: string | null
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_data?: Json | null
          new_data?: Json | null
          user_email?: string | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_data?: Json | null
          new_data?: Json | null
          user_email?: string | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      v_client_summaries: {
        Row: {
          client_id: string
          client_number: string
          client_name: string
          category: string
          email: string | null
          mobile: string | null
          pan: string | null
          gstin: string | null
          city: string | null
          state: string | null
          status: string
          total_billed: number
          total_paid: number
          outstanding_balance: number
          active_cases: number
          contact_persons_count: number
        }
      }
      v_dashboard_kpis: {
        Row: {
          total_active_clients: number
          total_billed_revenue: number
          total_collected_revenue: number
          total_outstanding: number
          total_active_cases: number
          active_staff_count: number
        }
      }
    }
  }
}
