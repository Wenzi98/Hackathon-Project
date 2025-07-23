import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: 'salon_owner' | 'barber' | 'customer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role: 'salon_owner' | 'barber' | 'customer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'salon_owner' | 'barber' | 'customer'
          created_at?: string
          updated_at?: string
        }
      }
      salons: {
        Row: {
          id: string
          name: string
          address: string
          phone: string
          owner_id: string
          qr_code: string
          loyalty_threshold: number
          reward_description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          phone: string
          owner_id: string
          qr_code?: string
          loyalty_threshold?: number
          reward_description?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          phone?: string
          owner_id?: string
          qr_code?: string
          loyalty_threshold?: number
          reward_description?: string
          created_at?: string
          updated_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          customer_id: string
          salon_id: string
          barber_id: string | null
          service_type: string
          amount: number
          points_earned: number
          visit_date: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          salon_id: string
          barber_id?: string | null
          service_type: string
          amount: number
          points_earned: number
          visit_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          salon_id?: string
          barber_id?: string | null
          service_type?: string
          amount?: number
          points_earned?: number
          visit_date?: string
          created_at?: string
        }
      }
      loyalty_cards: {
        Row: {
          id: string
          customer_id: string
          salon_id: string
          total_visits: number
          total_points: number
          rewards_redeemed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          salon_id: string
          total_visits?: number
          total_points?: number
          rewards_redeemed?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          salon_id?: string
          total_visits?: number
          total_points?: number
          rewards_redeemed?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}