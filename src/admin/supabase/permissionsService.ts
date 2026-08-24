/**
 * admin/supabase/permissionsService.ts
 * Supabase service layer for reading and persisting block permissions.
 *
 * Keeps the core editor library completely backend-agnostic while providing
 * first-class Supabase database synchronization for Super Admin applications.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlockPermissionsConfig, PlanSlug } from '../../editor/permissions/types';
import { DEFAULT_BLOCK_PERMISSIONS } from '../../editor/permissions/defaultPermissions';
import { BLOCK_DEFINITIONS } from '../../editor/blocks/registry';
import type { DbSubscriptionPlan, DbBlockPermission } from './types';

/**
 * Loads block permissions from Supabase and converts them into the normalized BlockPermissionsConfig.
 */
export async function loadPermissionsFromSupabase(
  supabase: SupabaseClient,
): Promise<BlockPermissionsConfig> {
  try {
    // 1. Fetch active plans
    const { data: plansData, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (plansError) throw plansError;
    const plans: DbSubscriptionPlan[] = plansData || [];

    // 2. Fetch block permissions
    const { data: blocksData, error: blocksError } = await supabase
      .from('block_permissions')
      .select('*');

    if (blocksError) throw blocksError;
    const blocks: DbBlockPermission[] = blocksData || [];

    // If database is empty, seed defaults and return them
    if (blocks.length === 0) {
      await seedBlockPermissionsToSupabase(supabase);
      return DEFAULT_BLOCK_PERMISSIONS;
    }

    // 3. Fetch plan-block permissions
    const { data: planBlocksData, error: pbError } = await supabase
      .from('plan_block_permissions')
      .select('*')
      .eq('is_allowed', true);

    if (pbError) throw pbError;
    const planBlocks = planBlocksData || [];

    // Build plan map (id -> slug)
    const planMap = new Map<string, string>();
    plans.forEach((p) => planMap.set(p.id, p.slug));

    // Build block map (id -> type)
    const blockMap = new Map<string, DbBlockPermission>();
    blocks.forEach((b) => blockMap.set(b.id, b));

    // Build permissions config
    const config: BlockPermissionsConfig = {};

    // Initialize all blocks
    for (const b of blocks) {
      config[b.block_type] = {
        blockType: b.block_type,
        enabled: b.is_enabled,
        allowedPlans: [],
      };
    }

    // Assign allowed plans
    for (const pb of planBlocks) {
      const block = blockMap.get(pb.block_permission_id);
      const planSlug = planMap.get(pb.plan_id) as PlanSlug | undefined;

      if (block && planSlug && config[block.block_type]) {
        if (!config[block.block_type].allowedPlans.includes(planSlug)) {
          config[block.block_type].allowedPlans.push(planSlug);
        }
      }
    }

    return config;
  } catch (error) {
    console.error('[EditorStudio] Failed to load permissions from Supabase:', error);
    // Return default permissions on error so editor stays functional
    return DEFAULT_BLOCK_PERMISSIONS;
  }
}

/**
 * Saves the entire BlockPermissionsConfig to Supabase.
 */
export async function savePermissionsToSupabase(
  supabase: SupabaseClient,
  config: BlockPermissionsConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch active plans
    const { data: plansData, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*');

    if (plansError) throw plansError;
    const plans: DbSubscriptionPlan[] = plansData || [];

    // Map slug -> plan_id
    const slugToPlanId = new Map<string, string>();
    plans.forEach((p) => slugToPlanId.set(p.slug, p.id));

    // 2. Upsert block_permissions
    for (const [blockType, perm] of Object.entries(config)) {
      const def = BLOCK_DEFINITIONS.find((b) => b.type === blockType);
      const label = def?.label || blockType;
      const category = def?.category || 'content';

      // Upsert block permission master record
      const { data: blockRecord, error: blockErr } = await supabase
        .from('block_permissions')
        .upsert(
          {
            block_type: blockType,
            block_label: label,
            category,
            is_enabled: perm.enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'block_type' },
        )
        .select()
        .single();

      if (blockErr) throw blockErr;
      if (!blockRecord) continue;

      // Update plan_block_permissions for each active plan
      for (const plan of plans) {
        const isAllowed = perm.allowedPlans.includes(plan.slug as PlanSlug);
        await supabase.from('plan_block_permissions').upsert(
          {
            plan_id: plan.id,
            block_permission_id: blockRecord.id,
            is_allowed: isAllowed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'plan_id,block_permission_id' },
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[EditorStudio] Failed to save permissions to Supabase:', error);
    return { success: false, error: error.message || 'Failed to save permissions' };
  }
}

/**
 * Seeds initial block definitions and default permissions into Supabase.
 */
export async function seedBlockPermissionsToSupabase(
  supabase: SupabaseClient,
): Promise<void> {
  try {
    // Seed default plans if missing
    const defaultPlans = [
      { name: 'Free Plan', slug: 'free', display_name: 'Free', sort_order: 1 },
      { name: 'Pro Plan', slug: 'pro', display_name: 'Pro', sort_order: 2 },
      { name: 'Enterprise Plan', slug: 'enterprise', display_name: 'Enterprise', sort_order: 3 },
    ];

    for (const p of defaultPlans) {
      await supabase
        .from('subscription_plans')
        .upsert(p, { onConflict: 'slug' });
    }

    // Save default block permissions
    await savePermissionsToSupabase(supabase, DEFAULT_BLOCK_PERMISSIONS);
  } catch (err) {
    console.error('[EditorStudio] Failed to seed default block permissions:', err);
  }
}
