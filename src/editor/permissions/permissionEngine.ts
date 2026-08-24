/**
 * permissions/permissionEngine.ts
 * Centralized permission helpers.
 * All permission logic lives here — never scattered across components.
 *
 * Performance: buildPermissionLookup() creates a normalized Record for O(1) access.
 * Components should call buildPermissionLookup() once and memoize the result.
 */

import type { PlanSlug, BlockPermissionsConfig, BlockPermission, BlockAccessStatus } from './types';
import type { BlockInstance } from '../types';
import { DEFAULT_BLOCK_PERMISSIONS, UNKNOWN_BLOCK_FALLBACK_PERMISSION } from './defaultPermissions';

// ─────────────────────────────────────────────────────────────────────────────
// Plan ordering — for "requires at least X plan" messaging
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_ORDER: Record<PlanSlug, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

/**
 * Returns the effective permission for a block type.
 * Falls back to UNKNOWN_BLOCK_FALLBACK_PERMISSION if not in config.
 */
function getPermission(
  blockType: string,
  permissions: BlockPermissionsConfig | null | undefined,
): BlockPermission {
  const config = permissions ?? DEFAULT_BLOCK_PERMISSIONS;
  const perm = config[blockType];
  if (!perm) {
    return {
      blockType,
      ...UNKNOWN_BLOCK_FALLBACK_PERMISSION,
    };
  }
  return perm;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Is this block globally enabled by Super Admin?
 * Disabled blocks cannot be inserted on ANY plan.
 */
export function isBlockEnabled(
  blockType: string,
  permissions: BlockPermissionsConfig | null | undefined,
): boolean {
  return getPermission(blockType, permissions).enabled;
}

/**
 * Can a user on the given plan insert this block?
 * Returns false if block is globally disabled, or plan not in allowedPlans.
 *
 * If plan is null/undefined → permission system not active → returns true (backward compat).
 */
export function canUseBlock(
  blockType: string,
  plan: PlanSlug | null | undefined,
  permissions: BlockPermissionsConfig | null | undefined,
): boolean {
  // Permission system inactive → unrestricted access (backward compat)
  if (plan == null && permissions == null) return true;

  const perm = getPermission(blockType, permissions);

  // Globally disabled blocks cannot be inserted
  if (!perm.enabled) return false;

  // No plan specified but permissions exist → use enterprise as guard
  if (plan == null) return perm.allowedPlans.includes('enterprise');

  return perm.allowedPlans.includes(plan);
}

/**
 * Returns the minimum plan required to use a block.
 * Returns null if block is accessible on Free or system is inactive.
 */
export function getRequiredPlan(
  blockType: string,
  permissions: BlockPermissionsConfig | null | undefined,
): PlanSlug | null {
  const perm = getPermission(blockType, permissions);
  if (!perm.enabled) return null; // disabled — no plan unlocks it

  if (perm.allowedPlans.length === 0) return null;

  // Find the lowest-tier plan that allows this block
  const lowestAllowed = perm.allowedPlans.reduce<PlanSlug | null>((min, p) => {
    if (min === null) return p;
    return PLAN_ORDER[p] < PLAN_ORDER[min] ? p : min;
  }, null);

  return lowestAllowed;
}

/**
 * Determines the access status for a block given the current plan.
 * - 'available': can insert normally
 * - 'locked': visible but requires upgrade
 * - 'disabled': globally disabled by Super Admin
 */
export function getBlockAccessStatus(
  blockType: string,
  plan: PlanSlug | null | undefined,
  permissions: BlockPermissionsConfig | null | undefined,
): BlockAccessStatus {
  // Permission system inactive
  if (plan == null && permissions == null) return 'available';

  const perm = getPermission(blockType, permissions);

  if (!perm.enabled) return 'disabled';

  if (canUseBlock(blockType, plan, permissions)) return 'available';

  return 'locked';
}

/**
 * Returns the list of block types accessible to a given plan.
 * Useful for filtering Block Inserter and Slash Menu.
 */
export function getAccessibleBlocks(
  plan: PlanSlug | null | undefined,
  permissions: BlockPermissionsConfig | null | undefined,
): string[] {
  if (plan == null && permissions == null) return Object.keys(DEFAULT_BLOCK_PERMISSIONS);
  const config = permissions ?? DEFAULT_BLOCK_PERMISSIONS;
  return Object.keys(config).filter((type) => canUseBlock(type, plan, config));
}

/**
 * Filters an array of BlockInstances to only include those accessible
 * to the current plan. Used for paste / addBlocks permission enforcement.
 *
 * IMPORTANT: This is for NEW block creation only.
 * Existing document blocks are NOT filtered here — they are preserved.
 */
export function filterBlocksByPermission(
  blocks: BlockInstance[],
  plan: PlanSlug | null | undefined,
  permissions: BlockPermissionsConfig | null | undefined,
): BlockInstance[] {
  // Permission system inactive → pass all
  if (plan == null && permissions == null) return blocks;

  return blocks
    .filter((block) => canUseBlock(block.type, plan, permissions))
    .map((block) => {
      // Recursively filter inner blocks (e.g., columns containing galleries)
      if (block.innerBlocks && block.innerBlocks.length > 0) {
        return {
          ...block,
          innerBlocks: filterBlocksByPermission(block.innerBlocks, plan, permissions),
        };
      }
      return block;
    });
}

/**
 * Builds a normalized lookup Record for O(1) permission checks.
 * Call this once and memoize — do not call on every render.
 */
export function buildPermissionLookup(
  permissions: BlockPermissionsConfig | null | undefined,
): BlockPermissionsConfig {
  return permissions ?? DEFAULT_BLOCK_PERMISSIONS;
}

/**
 * Returns the "next upgrade target" plan for a locked block.
 * e.g., if Free user tries Gallery (Pro+), returns 'pro'.
 */
export function getUpgradePlan(
  blockType: string,
  currentPlan: PlanSlug,
  permissions: BlockPermissionsConfig | null | undefined,
): PlanSlug | null {
  const perm = getPermission(blockType, permissions);
  if (!perm.enabled) return null;

  // Find the lowest plan ABOVE current that allows this block
  const upgradePlans = perm.allowedPlans.filter(
    (p) => PLAN_ORDER[p] > PLAN_ORDER[currentPlan],
  );

  if (upgradePlans.length === 0) return null;

  return upgradePlans.reduce<PlanSlug>(
    (min, p) => (PLAN_ORDER[p] < PLAN_ORDER[min] ? p : min),
    upgradePlans[0],
  );
}
