/**
 * StyleMapper.ts
 * Maps inline CSS styles from pasted DOM elements (font-size, color, alignment,
 * margin, padding, border-radius, box-shadow, etc.) into native block attribute properties.
 */

export interface ParsedBlockStyles {
  align?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  borderRadius?: string;
  padding?: string;
  margin?: string;
}

export function parseInlineStyles(element: HTMLElement): ParsedBlockStyles {
  const result: ParsedBlockStyles = {};
  const style = element.style;
  if (!style) return result;

  // Text Alignment
  const textAlign = style.textAlign || element.getAttribute('align');
  if (textAlign && ['left', 'center', 'right', 'justify'].includes(textAlign.toLowerCase())) {
    result.align = textAlign.toLowerCase() as ParsedBlockStyles['align'];
  }

  // Text Color
  if (style.color && style.color !== 'inherit') {
    result.textColor = style.color;
  }

  // Background Color
  if (style.backgroundColor && style.backgroundColor !== 'transparent') {
    result.backgroundColor = style.backgroundColor;
  }

  // Font Size
  if (style.fontSize) {
    const px = parseFloat(style.fontSize);
    if (!isNaN(px) && px > 8 && px < 120) {
      result.fontSize = Math.round(px);
    }
  }

  // Font Family
  if (style.fontFamily) {
    result.fontFamily = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  }

  // Font Weight
  if (style.fontWeight) {
    result.fontWeight = style.fontWeight;
  }

  // Line Height
  if (style.lineHeight) {
    const lh = parseFloat(style.lineHeight);
    if (!isNaN(lh) && lh > 0.5 && lh < 4) {
      result.lineHeight = lh;
    }
  }

  // Border Radius
  if (style.borderRadius) {
    result.borderRadius = style.borderRadius;
  }

  // Padding
  if (style.padding) {
    result.padding = style.padding;
  }

  // Margin
  if (style.margin) {
    result.margin = style.margin;
  }

  return result;
}
