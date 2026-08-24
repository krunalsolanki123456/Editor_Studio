/**
 * permissions/defaultPermissions.ts
 * Default block permission configuration for Free / Pro / Enterprise plans.
 *
 * Super Admin can override these at any time via the Block Access Manager UI.
 * These are ONLY the initial seed values.
 *
 * SAFE DEFAULT POLICY:
 * If a block type has no permission config entry (e.g., a newly added block),
 * it defaults to enterprise-only (enabled: true, allowedPlans: ['enterprise']).
 * This prevents accidental exposure of new blocks to lower plans.
 */

import type { BlockPermissionsConfig, PlanSlug } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Plan definitions
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_PLANS: PlanSlug[] = ['free', 'pro', 'enterprise'];
export const PRO_AND_ABOVE: PlanSlug[] = ['pro', 'enterprise'];
export const ENTERPRISE_ONLY: PlanSlug[] = ['enterprise'];

// ─────────────────────────────────────────────────────────────────────────────
// Default FREE blocks (12 blocks)
// Basic content creation — suitable for all users
// ─────────────────────────────────────────────────────────────────────────────
const FREE_BLOCK_TYPES: string[] = [
  'paragraph',
  'heading',
  'list',
  'quote',
  'image',
  'video',
  'audio',
  'button',
  'separator',
  'spacer',
  'columns',
  'embed',
];

// ─────────────────────────────────────────────────────────────────────────────
// Default PRO blocks (19 additional blocks beyond Free)
// Advanced layout, media, and interactive content
// ─────────────────────────────────────────────────────────────────────────────
const PRO_BLOCK_TYPES: string[] = [
  'gallery',
  'cover',
  'media-text',
  'group',
  'row',
  'stack',
  'table',
  'file',
  'html',
  'youtube',
  'vimeo',
  'slider',
  'poll',
  'live-updates',
  'pullquote',
  'code',
  'preformatted',
  'verse',
];

// ─────────────────────────────────────────────────────────────────────────────
// Default ENTERPRISE blocks (beyond Pro)
// Advanced analytics, election tracking, charts
// ─────────────────────────────────────────────────────────────────────────────
const ENTERPRISE_BLOCK_TYPES: string[] = [
  'election',
];

// ─────────────────────────────────────────────────────────────────────────────
// Build the normalized BlockPermissionsConfig
// ─────────────────────────────────────────────────────────────────────────────
function buildDefaultPermissions(): BlockPermissionsConfig {
  const config: BlockPermissionsConfig = {};

  for (const blockType of FREE_BLOCK_TYPES) {
    config[blockType] = {
      blockType,
      enabled: true,
      allowedPlans: ALL_PLANS,
    };
  }

  for (const blockType of PRO_BLOCK_TYPES) {
    config[blockType] = {
      blockType,
      enabled: true,
      allowedPlans: PRO_AND_ABOVE,
    };
  }

  for (const blockType of ENTERPRISE_BLOCK_TYPES) {
    config[blockType] = {
      blockType,
      enabled: true,
      allowedPlans: ENTERPRISE_ONLY,
    };
  }

  return config;
}

export const DEFAULT_BLOCK_PERMISSIONS: BlockPermissionsConfig = buildDefaultPermissions();

/**
 * Safe fallback for block types not found in the permission config.
 * Prevents new/unknown blocks from leaking to free users.
 */
export const UNKNOWN_BLOCK_FALLBACK_PERMISSION = {
  enabled: true,
  allowedPlans: ENTERPRISE_ONLY,
} as const;
