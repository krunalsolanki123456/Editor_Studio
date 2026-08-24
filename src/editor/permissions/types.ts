/**
 * permissions/types.ts
 * Public TypeScript types for the block permission system.
 * These are exported via src/index.ts for NPM consumers.
 */

/** Supported subscription plan slugs. Extend as needed. */
export type PlanSlug = 'free' | 'pro' | 'enterprise';

/** Alias for PlanSlug — used in EditorStudio prop */
export type EditorPlan = PlanSlug;

/**
 * Permission configuration for a single block type.
 * enabled: global toggle (Super Admin can disable any block completely)
 * allowedPlans: which subscription plans can INSERT this block
 */
export interface BlockPermission {
  blockType: string;
  enabled: boolean;
  allowedPlans: PlanSlug[];
}

/**
 * Full permission configuration — keyed by block type for O(1) lookup.
 * e.g. { 'gallery': { blockType: 'gallery', enabled: true, allowedPlans: ['pro', 'enterprise'] } }
 */
export type BlockPermissionsConfig = Record<string, BlockPermission>;

/**
 * Payload sent to the onUpgradeRequired callback when a locked block is clicked.
 * Parent application uses this to open pricing modal / redirect to upgrade page.
 */
export interface UpgradeRequiredPayload {
  blockType: string;
  blockLabel: string;
  currentPlan: PlanSlug;
  requiredPlan: PlanSlug;
}

/**
 * Block access status as seen by a specific user plan.
 * - available: user can insert this block normally
 * - locked: block exists but user needs a higher plan
 * - disabled: Super Admin has globally disabled this block (no plan can insert it)
 */
export type BlockAccessStatus = 'available' | 'locked' | 'disabled';
