// Main Component
export { EditorStudio, default } from './EditorStudio';
export type { EditorStudioProps } from './EditorStudio';

// Core Canvas & Subcomponents
export { default as EditorCanvas } from './editor/EditorCanvas';
export { default as TopToolbar } from './editor/TopToolbar';
export { default as BlockInserter } from './editor/BlockInserter';
export { default as SettingsSidebar } from './editor/SettingsSidebar';
export { default as InlineToolbar } from './editor/InlineToolbar';
export { default as BlockWrapper } from './editor/BlockWrapper';
export { default as RichText } from './editor/RichText';

// Super Admin Block Access Management UI
export { BlockAccessManager } from './admin/BlockAccessManager';
export type { BlockAccessManagerProps } from './admin/BlockAccessManager';

// Pricing & Comparison Modal
export { PricingComparisonModal } from './editor/permissions/PricingComparisonModal';
export type { PricingComparisonModalProps } from './editor/permissions/PricingComparisonModal';

// Store & State Management
export { useEditorStore } from './editor/store';

// Subscription Permissions & Engine
export type {
  PlanSlug,
  EditorPlan,
  BlockPermission,
  BlockPermissionsConfig,
  UpgradeRequiredPayload,
  BlockAccessStatus,
} from './editor/permissions/types';

export {
  DEFAULT_BLOCK_PERMISSIONS,
  ALL_PLANS,
  PRO_AND_ABOVE,
  ENTERPRISE_ONLY,
  UNKNOWN_BLOCK_FALLBACK_PERMISSION,
} from './editor/permissions/defaultPermissions';

export {
  canUseBlock,
  getRequiredPlan,
  isBlockEnabled,
  getBlockAccessStatus,
  getAccessibleBlocks,
  filterBlocksByPermission,
  buildPermissionLookup,
  getUpgradePlan,
} from './editor/permissions/permissionEngine';

// Supabase Permission Services
export {
  loadPermissionsFromSupabase,
  savePermissionsToSupabase,
  seedBlockPermissionsToSupabase,
} from './admin/supabase/permissionsService';
export type {
  DbSubscriptionPlan,
  DbBlockPermission,
  DbPlanBlockPermission,
  SupabaseConfigOptions,
} from './admin/supabase/types';

// Block Registry & Definitions
export {
  BLOCK_DEFINITIONS,
  BLOCK_MAP,
  getBlockDefinition,
  getBlockLabel,
  getBlockIcon,
  createBlock,
  isBlockAllowed,
  getFilteredBlockDefinitions,
} from './editor/blocks/registry';
export type { BlockFilterOptions } from './editor/blocks/registry';

// Exporters & Parsers
export {
  blocksToHtml,
  exportHtml,
  blocksToHtml as exportToHtml,
} from './editor/exporter';

export {
  parseRichPasteToBlocks,
} from './editor/richPasteEngine';

// TypeScript Types
export type {
  BlockInstance,
  BlockDefinition,
  BlockCategory,
  RichTextValue,
  RichTextSpan,
  BlockAttributes,
} from './editor/types';
