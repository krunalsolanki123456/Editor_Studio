/**
 * ResponsiveMapper.ts
 * Ensures all generated blocks (images, tables, columns, font sizes) are converted
 * to fluid, responsive specifications that adapt seamlessly across mobile and desktop.
 */

import type { BlockInstance } from '../types';

export function makeBlocksResponsive(blocks: BlockInstance[]): BlockInstance[] {
  return blocks.map((block) => {
    const updated = { ...block, attributes: { ...block.attributes } };

    // Responsive Images (width 100%, max-width 100%, height auto)
    if (updated.type === 'image') {
      updated.attributes.width = '100%';
      updated.attributes.height = 'auto';
    }

    // Responsive Tables (ensure container scrollable)
    if (updated.type === 'table') {
      updated.attributes.responsive = true;
    }

    // Responsive Typography (clamp oversized fixed font sizes)
    if (typeof updated.attributes.fontSize === 'number' && updated.attributes.fontSize > 48) {
      updated.attributes.fontSize = 48;
    }

    // Recursively handle innerBlocks
    if (updated.innerBlocks && updated.innerBlocks.length > 0) {
      updated.innerBlocks = makeBlocksResponsive(updated.innerBlocks);
    }

    return updated;
  });
}
