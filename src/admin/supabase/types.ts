/**
 * admin/supabase/types.ts
 * Database row types corresponding to Supabase schema.
 */

export interface DbSubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbBlockPermission {
  id: string;
  block_type: string;
  block_label: string;
  category: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPlanBlockPermission {
  id: string;
  plan_id: string;
  block_permission_id: string;
  is_allowed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseConfigOptions {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}
