/**
 * LayoutDetector.ts
 * Detects structural layout containers (<section>, <article>, <div class="container|row|grid|col...">)
 * and maps them into nested Group / Container / Row / Column block structures.
 */

import { createId } from '../utils';
import type { BlockInstance } from '../types';

export function isLayoutContainer(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  if (['section', 'article', 'main', 'aside', 'nav'].includes(tagName)) return true;

  if (tagName === 'div') {
    const className = element.className || '';
    if (typeof className === 'string') {
      const lower = className.toLowerCase();
      return (
        lower.includes('container') ||
        lower.includes('wrapper') ||
        lower.includes('row') ||
        lower.includes('col') ||
        lower.includes('grid') ||
        lower.includes('flex')
      );
    }
  }

  return false;
}

export function wrapInGroupBlock(children: BlockInstance[]): BlockInstance {
  return {
    id: createId(),
    type: 'group',
    attributes: {
      padding: '16px',
    },
    innerBlocks: children,
  };
}
