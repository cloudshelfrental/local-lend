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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_areas: {
        Row: {
          admin_id: string
          area_id: string
          id: string
        }
        Insert: {
          admin_id: string
          area_id: string
          id?: string
        }
        Update: {
          admin_id?: string
          area_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      area_panchayaths: {
        Row: {
          area_id: string
          id: string
          panchayath_id: string
        }
        Insert: {
          area_id: string
          id?: string
          panchayath_id: string
        }
        Update: {
          area_id?: string
          id?: string
          panchayath_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_panchayaths_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_panchayaths_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      delivery_config: {
        Row: {
          fixed_charge: number
          id: string
          updated_at: string
        }
        Insert: {
          fixed_charge?: number
          id?: string
          updated_at?: string
        }
        Update: {
          fixed_charge?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_staff_areas: {
        Row: {
          area_id: string
          id: string
          staff_id: string
        }
        Insert: {
          area_id: string
          id?: string
          staff_id: string
        }
        Update: {
          area_id?: string
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_staff_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_staff_wards: {
        Row: {
          created_at: string
          id: string
          panchayath_id: string
          staff_id: string
          ward_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          panchayath_id: string
          staff_id: string
          ward_id: string
        }
        Update: {
          created_at?: string
          id?: string
          panchayath_id?: string
          staff_id?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_staff_wards_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_staff_wards_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string
          id: string
          name: string
          state_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          state_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          area_id: string | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          name: string
          owner_id: string
          owner_price: number
          payment_type: string
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          area_id?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          name: string
          owner_id: string
          owner_price: number
          payment_type?: string
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          area_id?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          name?: string
          owner_id?: string
          owner_price?: number
          payment_type?: string
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          booked_at: string | null
          commission_amount: number
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_charge: number
          delivery_staff_id: string | null
          end_date: string | null
          id: string
          item_id: string
          order_number: string
          owner_id: string
          owner_price: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          picked_up_at: string | null
          rental_days: number
          start_date: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          booked_at?: string | null
          commission_amount: number
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_charge: number
          delivery_staff_id?: string | null
          end_date?: string | null
          id?: string
          item_id: string
          order_number: string
          owner_id: string
          owner_price: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          picked_up_at?: string | null
          rental_days?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          booked_at?: string | null
          commission_amount?: number
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_charge?: number
          delivery_staff_id?: string | null
          end_date?: string | null
          id?: string
          item_id?: string
          order_number?: string
          owner_id?: string
          owner_price?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          picked_up_at?: string | null
          rental_days?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_areas: {
        Row: {
          area_id: string
          id: string
          owner_id: string
        }
        Insert: {
          area_id: string
          id?: string
          owner_id: string
        }
        Update: {
          area_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      panchayaths: {
        Row: {
          created_at: string
          district_id: string
          id: string
          name: string
          ward_count: number
        }
        Insert: {
          created_at?: string
          district_id: string
          id?: string
          name: string
          ward_count?: number
        }
        Update: {
          created_at?: string
          district_id?: string
          id?: string
          name?: string
          ward_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "panchayaths_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          collected_at: string | null
          collected_by: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          status: Database["public"]["Enums"]["payment_status"]
          submitted_at: string | null
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          amount: number
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string | null
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          amount?: number
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string | null
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          delivery_address: string | null
          full_name: string
          id: string
          mobile: string
          panchayath_id: string | null
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          delivery_address?: string | null
          full_name: string
          id: string
          mobile: string
          panchayath_id?: string | null
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          delivery_address?: string | null
          full_name?: string
          id?: string
          mobile?: string
          panchayath_id?: string | null
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          created_at: string
          id: string
          settled_at: string | null
          settled_by: string | null
          status: Database["public"]["Enums"]["settlement_status"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          settled_at?: string | null
          settled_by?: string | null
          status?: Database["public"]["Enums"]["settlement_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          settled_at?: string | null
          settled_by?: string | null
          status?: Database["public"]["Enums"]["settlement_status"]
          user_id?: string
        }
        Relationships: []
      }
      states: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_applications: {
        Row: {
          created_at: string
          full_name: string
          id: string
          mobile: string
          panchayath_id: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
          ward_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          mobile: string
          panchayath_id?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
          ward_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          mobile?: string
          panchayath_id?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_applications_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_applications_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          id: string
          pending_settlement: number
          total_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          pending_settlement?: number
          total_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          pending_settlement?: number
          total_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wards: {
        Row: {
          created_at: string
          id: string
          panchayath_id: string
          ward_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          panchayath_id: string
          ward_number: number
        }
        Update: {
          created_at?: string
          id?: string
          panchayath_id?: string
          ward_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "wards_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "super_admin" | "admin" | "owner" | "customer" | "delivery"
      item_status: "pending_approval" | "active" | "inactive" | "rejected"
      order_status:
        | "pending"
        | "confirmed"
        | "delivery_booked"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "return_pending"
        | "returned"
        | "cancelled"
      payment_method: "prepaid" | "cash_on_delivery"
      payment_status:
        | "pending"
        | "verified"
        | "collected"
        | "refunded"
        | "submitted"
      settlement_status: "pending" | "settled"
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
      app_role: ["super_admin", "admin", "owner", "customer", "delivery"],
      item_status: ["pending_approval", "active", "inactive", "rejected"],
      order_status: [
        "pending",
        "confirmed",
        "delivery_booked",
        "picked_up",
        "in_transit",
        "delivered",
        "return_pending",
        "returned",
        "cancelled",
      ],
      payment_method: ["prepaid", "cash_on_delivery"],
      payment_status: [
        "pending",
        "verified",
        "collected",
        "refunded",
        "submitted",
      ],
      settlement_status: ["pending", "settled"],
    },
  },
} as const
