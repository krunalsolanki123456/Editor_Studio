import type { CSSProperties } from 'react';
import type { BlockAttributes } from './types';

export type TextBlockType = 'paragraph' | 'heading' | 'list' | 'quote' | 'pullquote' | 'verse' | 'code' | 'preformatted' | 'table';

export const TEXT_FONT_FAMILIES = [
  { value: 'system', label: 'System Default', stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { value: 'calibri', label: 'Calibri', stack: 'Calibri, Carlito, "Segoe UI", sans-serif' },
  { value: 'arial', label: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { value: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, Georgia, serif' },
  { value: 'georgia', label: 'Georgia', stack: 'Georgia, serif' },
  { value: 'cambria', label: 'Cambria', stack: 'Cambria, Georgia, serif' },
  { value: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { value: 'tahoma', label: 'Tahoma', stack: 'Tahoma, Geneva, sans-serif' },
  { value: 'trebuchet', label: 'Trebuchet MS', stack: '"Trebuchet MS", "Lucida Grande", sans-serif' },
  { value: 'garamond', label: 'Garamond', stack: 'Garamond, Baskerville, "Baskerville Old Face", serif' },
  { value: 'courier', label: 'Courier New', stack: '"Courier New", Courier, monospace' },
  { value: 'comicsans', label: 'Comic Sans MS', stack: '"Comic Sans MS", "Comic Sans", cursive' },
  { value: 'impact', label: 'Impact', stack: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
  { value: 'helvetica', label: 'Helvetica', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { value: 'segoe', label: 'Segoe UI', stack: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  { value: 'roboto', label: 'Roboto', stack: 'Roboto, "Helvetica Neue", Arial, sans-serif' },
  { value: 'inter', label: 'Inter', stack: 'Inter, system-ui, sans-serif' },
  { value: 'outfit', label: 'Outfit', stack: 'Outfit, system-ui, sans-serif' },
  { value: 'firacode', label: 'Fira Code', stack: '"Fira Code", "Courier New", monospace' },
  { value: 'mono', label: 'Monospace', stack: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace' },
] as const;

export const TEXT_FONT_WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
] as const;

export const TEXT_TRANSFORMS = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
] as const;

export const PARAGRAPH_DEFAULTS = {
  textColor: '#111827',
  backgroundColor: '',
  fontSize: 16,
  fontFamily: 'system',
  fontWeight: 400,
  lineHeight: 1.7,
  letterSpacing: 0,
  textTransform: 'none',
} as const;

export const TEXT_BLOCK_DEFAULT_INPUTS: Record<TextBlockType, {
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: CSSProperties['textTransform'];
}> = {
  paragraph: {
    textColor: '#111827',
    backgroundColor: '',
    fontFamily: 'system',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.7,
    letterSpacing: 0,
    textTransform: 'none',
  },
  heading: {
    textColor: '#111827',
    backgroundColor: '',
    fontFamily: 'system',
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
    textTransform: 'none',
  },
  list: {
    textColor: '#111827',
    backgroundColor: '',
    fontFamily: 'system',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: 0,
    textTransform: 'none',
  },
  quote: {
    textColor: '#111827',
    backgroundColor: '',
    fontFamily: 'system',
    fontSize: 18,
    fontWeight: 400,
    lineHeight: 1.7,
    letterSpacing: 0,
    textTransform: 'none',
  },
  pullquote: {
    textColor: '#111827',
    backgroundColor: '',
    fontFamily: 'system',
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: 0,
    textTransform: 'none',
  },
  verse: {
    textColor: '#111827',
    backgroundColor: '',
    fontFamily: 'georgia',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.7,
    letterSpacing: 0,
    textTransform: 'none',
  },
  code: {
    textColor: '#e5e7eb',
    backgroundColor: '',
    fontFamily: 'mono',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0,
    textTransform: 'none',
  },
  preformatted: {
    textColor: '#111827',
    backgroundColor: '',
    fontFamily: 'mono',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0,
    textTransform: 'none',
  },
  table: {
    textColor: '#111827',
    backgroundColor: '',
    fontFamily: 'system',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0,
    textTransform: 'none',
  },
};

export const PARAGRAPH_FONT_FAMILIES = TEXT_FONT_FAMILIES;
export const PARAGRAPH_FONT_WEIGHTS = TEXT_FONT_WEIGHTS;
export const PARAGRAPH_TEXT_TRANSFORMS = TEXT_TRANSFORMS;

export function fontFamilyStack(value: string): string {
  return TEXT_FONT_FAMILIES.find((opt) => opt.value === value)?.stack ?? TEXT_FONT_FAMILIES[0].stack;
}

export function toResponsiveFontSize(fontSize: number | string | undefined): string | undefined {
  if (fontSize === undefined || fontSize === null || fontSize === '') return undefined;

  let num: number;
  if (typeof fontSize === 'number') {
    num = fontSize;
  } else if (typeof fontSize === 'string') {
    const trimmed = fontSize.trim();
    if (trimmed.includes('clamp(')) return trimmed;
    if (trimmed.endsWith('px')) {
      num = parseFloat(trimmed);
    } else if (trimmed.endsWith('rem') || trimmed.endsWith('em')) {
      num = parseFloat(trimmed) * 16;
    } else {
      num = parseFloat(trimmed);
    }
  } else {
    return undefined;
  }

  if (isNaN(num) || num <= 0) return undefined;
  if (num <= 12) return `${num}px`;

  const minPx = Math.max(13, Math.round(num * 0.70));
  const remPart = ((num * 0.5) / 16).toFixed(2);
  const vwPart = (num * 0.055).toFixed(2);

  return `clamp(${minPx}px, calc(${remPart}rem + ${vwPart}vw), ${num}px)`;
}

export function getTypographyStyle(blockType: TextBlockType, attributes: BlockAttributes): CSSProperties {
  const style: CSSProperties = {};
  const defaults = TEXT_BLOCK_DEFAULT_INPUTS[blockType];

  const level = typeof attributes.level === 'number' ? attributes.level : 2;
  const headingSize = { 1: 36, 2: 30, 3: 24, 4: 20, 5: 18, 6: 16 }[level as 1 | 2 | 3 | 4 | 5 | 6] ?? defaults.fontSize;

  const textColor = typeof attributes.textColor === 'string' ? attributes.textColor : (blockType === 'paragraph' ? defaults.textColor : undefined);
  const backgroundColor = typeof attributes.backgroundColor === 'string' && attributes.backgroundColor
    ? attributes.backgroundColor
    : undefined;
  const rawFontSize = typeof attributes.fontSize === 'number'
    ? attributes.fontSize
    : (blockType === 'heading' ? headingSize : undefined);

  const fontFamily = typeof attributes.fontFamily === 'string' ? attributes.fontFamily : undefined;
  const fontWeight = typeof attributes.fontWeight === 'number' ? attributes.fontWeight : undefined;
  const fontStyle = typeof attributes.fontStyle === 'string' ? attributes.fontStyle : undefined;
  const textDecoration = typeof attributes.textDecoration === 'string' ? attributes.textDecoration : undefined;
  const lineHeight = typeof attributes.lineHeight === 'number' ? attributes.lineHeight : undefined;
  const letterSpacing = typeof attributes.letterSpacing === 'number' ? attributes.letterSpacing : undefined;
  const textTransform = typeof attributes.textTransform === 'string' ? attributes.textTransform : undefined;

  if (textColor) style.color = textColor;
  if (backgroundColor) style.backgroundColor = backgroundColor;

  const responsiveSize = toResponsiveFontSize(rawFontSize);
  if (responsiveSize) style.fontSize = responsiveSize;

  if (fontFamily) style.fontFamily = fontFamilyStack(fontFamily);
  if (typeof fontWeight === 'number') style.fontWeight = fontWeight;
  if (fontStyle) style.fontStyle = fontStyle as CSSProperties['fontStyle'];
  if (textDecoration) style.textDecoration = textDecoration as CSSProperties['textDecoration'];
  if (typeof lineHeight === 'number') style.lineHeight = lineHeight;
  if (typeof letterSpacing === 'number') style.letterSpacing = `${letterSpacing}px`;
  if (textTransform) style.textTransform = textTransform as CSSProperties['textTransform'];
  return style;
}

export function getTypographyControls(blockType: TextBlockType, attributes: BlockAttributes) {
  const defaults = TEXT_BLOCK_DEFAULT_INPUTS[blockType];
  const level = typeof attributes.level === 'number' ? attributes.level : 2;
  const headingSize = { 1: 36, 2: 30, 3: 24, 4: 20, 5: 18, 6: 16 }[level as 1 | 2 | 3 | 4 | 5 | 6] ?? defaults.fontSize;
  const headingWeight = { 1: 700, 2: 700, 3: 600, 4: 600, 5: 500, 6: 500 }[level as 1 | 2 | 3 | 4 | 5 | 6] ?? defaults.fontWeight;

  return {
    ...defaults,
    textColor: typeof attributes.textColor === 'string' ? attributes.textColor : defaults.textColor,
    backgroundColor: typeof attributes.backgroundColor === 'string' ? attributes.backgroundColor : defaults.backgroundColor,
    fontFamily: typeof attributes.fontFamily === 'string' ? attributes.fontFamily : defaults.fontFamily,
    fontSize: typeof attributes.fontSize === 'number' ? attributes.fontSize : (blockType === 'heading' ? headingSize : defaults.fontSize),
    fontWeight: typeof attributes.fontWeight === 'number' ? attributes.fontWeight : (blockType === 'heading' ? headingWeight : defaults.fontWeight),
    fontStyle: typeof attributes.fontStyle === 'string' ? attributes.fontStyle : 'normal',
    textDecoration: typeof attributes.textDecoration === 'string' ? attributes.textDecoration : 'none',
    lineHeight: typeof attributes.lineHeight === 'number' ? attributes.lineHeight : defaults.lineHeight,
    letterSpacing: typeof attributes.letterSpacing === 'number' ? attributes.letterSpacing : defaults.letterSpacing,
    textTransform: typeof attributes.textTransform === 'string' ? attributes.textTransform as CSSProperties['textTransform'] : defaults.textTransform,
  };
}

export function styleObjectToString(style: CSSProperties): string {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`)
    .join(';');
}
