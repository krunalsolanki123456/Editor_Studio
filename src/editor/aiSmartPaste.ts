import { createId } from './utils';
import type { BlockInstance } from './types';

export type ContentPatternType =
  | 'News Article'
  | 'Blog Post'
  | 'Landing Page'
  | 'Documentation'
  | 'FAQ'
  | 'Pricing Table'
  | 'Recipe'
  | 'Resume'
  | 'General Content';

export interface AISmartPasteResult {
  patternType: ContentPatternType;
  blocks: BlockInstance[];
  summary: string;
}

export function detectContentPattern(blocks: BlockInstance[], rawText: string): ContentPatternType {
  const textLower = rawText.toLowerCase();

  // Pricing Table Pattern
  if (
    (textLower.includes('$') || textLower.includes('₹') || textLower.includes('/mo') || textLower.includes('/year')) &&
    (textLower.includes('starter') || textLower.includes('pro') || textLower.includes('enterprise') || textLower.includes('plan') || textLower.includes('pricing'))
  ) {
    return 'Pricing Table';
  }

  // FAQ Pattern
  if (
    textLower.includes('frequently asked') ||
    textLower.includes('faq') ||
    (rawText.match(/\?/g) || []).length >= 3
  ) {
    return 'FAQ';
  }

  // Recipe Pattern
  if (
    (textLower.includes('ingredients') || textLower.includes('instructions') || textLower.includes('prep time') || textLower.includes('cook time')) &&
    (textLower.includes('servings') || textLower.includes('cup') || textLower.includes('tbsp') || textLower.includes('recipe'))
  ) {
    return 'Recipe';
  }

  // Resume Pattern
  if (
    (textLower.includes('experience') || textLower.includes('work history')) &&
    (textLower.includes('education') || textLower.includes('skills')) &&
    (textLower.includes('contact') || textLower.includes('email') || textLower.includes('phone'))
  ) {
    return 'Resume';
  }

  // Documentation Pattern
  if (
    blocks.some((b) => b.type === 'code' || b.type === 'preformatted') ||
    textLower.includes('installation') ||
    textLower.includes('api reference') ||
    textLower.includes('getting started') ||
    textLower.includes('usage')
  ) {
    return 'Documentation';
  }

  // Landing Page Pattern
  if (
    blocks.some((b) => b.type === 'button') &&
    blocks.some((b) => b.type === 'heading' && ((b.attributes.level as number) === 1 || (b.attributes.level as number) === 2)) &&
    (textLower.includes('get started') || textLower.includes('try now') || textLower.includes('sign up') || textLower.includes('features'))
  ) {
    return 'Landing Page';
  }

  // News Article Pattern
  if (
    blocks.some((b) => b.type === 'image') &&
    blocks.some((b) => b.type === 'heading' && (b.attributes.level as number) === 1) &&
    blocks.filter((b) => b.type === 'paragraph').length >= 2
  ) {
    return 'News Article';
  }

  // Blog Post Pattern
  if (
    blocks.some((b) => b.type === 'heading') &&
    blocks.filter((b) => b.type === 'paragraph').length >= 2
  ) {
    return 'Blog Post';
  }

  return 'General Content';
}

export function applyAISmartStructure(blocks: BlockInstance[], pattern: ContentPatternType): AISmartPasteResult {
  if (!blocks || blocks.length === 0) {
    return { patternType: pattern, blocks: [], summary: '0 blocks' };
  }

  const resultBlocks: BlockInstance[] = [];

  switch (pattern) {
    case 'News Article': {
      let heroImage: BlockInstance | null = null;
      let headingBlock: BlockInstance | null = null;
      const bodyBlocks: BlockInstance[] = [];

      blocks.forEach((b) => {
        if (!headingBlock && b.type === 'heading' && (b.attributes.level as number) === 1) {
          headingBlock = b;
        } else if (!heroImage && b.type === 'image') {
          heroImage = b;
        } else {
          bodyBlocks.push(b);
        }
      });

      if (headingBlock && heroImage) {
        const coverBlock: BlockInstance = {
          id: createId(),
          type: 'cover',
          attributes: {
            url: (heroImage as BlockInstance).attributes.url || '',
            overlayColor: '#000000',
            overlayOpacity: 65,
            minHeight: '380px',
            horizontalAlign: 'left',
            verticalAlign: 'center',
          },
          innerBlocks: [
            headingBlock,
            {
              id: createId(),
              type: 'paragraph',
              attributes: {
                content: [{ text: '🔴 LIVE UPDATES · NEWS COVERAGE', bold: true, color: '#ef4444' }],
              },
              innerBlocks: [],
            },
          ],
        };
        resultBlocks.push(coverBlock);
      } else {
        if (headingBlock) resultBlocks.push(headingBlock);
        if (heroImage) resultBlocks.push(heroImage);
      }

      resultBlocks.push(...bodyBlocks);
      return {
        patternType: pattern,
        blocks: resultBlocks,
        summary: `Auto-structured News Article with Hero Banner (${resultBlocks.length} blocks)`,
      };
    }

    case 'Landing Page': {
      const buttons: BlockInstance[] = [];
      const nonButtons: BlockInstance[] = [];

      blocks.forEach((b) => {
        if (b.type === 'button') buttons.push(b);
        else nonButtons.push(b);
      });

      resultBlocks.push(...nonButtons);

      if (buttons.length > 0) {
        const ctaRow: BlockInstance = {
          id: createId(),
          type: 'row',
          attributes: { columns: Math.min(buttons.length, 3), gap: 16, layoutRatio: 'equal' },
          innerBlocks: buttons.map((btn) => ({
            id: createId(),
            type: 'column',
            attributes: { flex: '1 1 0%' },
            innerBlocks: [btn],
          })),
        };
        resultBlocks.push(ctaRow);
      }

      return {
        patternType: pattern,
        blocks: resultBlocks,
        summary: `Auto-structured Landing Page Layout (${resultBlocks.length} blocks)`,
      };
    }

    case 'Pricing Table': {
      resultBlocks.push(...blocks);
      return {
        patternType: pattern,
        blocks: resultBlocks,
        summary: `Formatted Pricing Table Cards (${resultBlocks.length} blocks)`,
      };
    }

    case 'FAQ': {
      blocks.forEach((b, idx) => {
        resultBlocks.push(b);
        if (b.type === 'paragraph' && idx < blocks.length - 1 && blocks[idx + 1].type === 'heading') {
          resultBlocks.push({
            id: createId(),
            type: 'separator',
            attributes: { style: 'dots' },
            innerBlocks: [],
          });
        }
      });

      return {
        patternType: pattern,
        blocks: resultBlocks,
        summary: `Organized FAQ Q&A Section (${resultBlocks.length} blocks)`,
      };
    }

    case 'Documentation': {
      resultBlocks.push(...blocks);
      return {
        patternType: pattern,
        blocks: resultBlocks,
        summary: `Formatted Documentation Article (${resultBlocks.length} blocks)`,
      };
    }

    default: {
      resultBlocks.push(...blocks);
      return {
        patternType: pattern,
        blocks: resultBlocks,
        summary: `Converted ${resultBlocks.length} native blocks`,
      };
    }
  }
}
