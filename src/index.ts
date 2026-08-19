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

// Store & State Management
export { useEditorStore } from './editor/store';

// Block Registry & Definitions
export {
  BLOCK_DEFINITIONS,
  BLOCK_MAP,
  getBlockDefinition,
  getBlockLabel,
  getBlockIcon,
  createBlock,
} from './editor/blocks/registry';

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
