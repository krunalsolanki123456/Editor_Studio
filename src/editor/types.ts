export type BlockCategory = 'text' | 'media' | 'layout' | 'embed' | 'content';

export interface BlockDefinition {
  type: string;
  label: string;
  category: BlockCategory;
  icon: string;
  keywords: string[];
  description: string;
  create: () => BlockInstance;
}

export interface BlockAttributes {
  [key: string]: unknown;
}

export interface BlockInstance {
  id: string;
  type: string;
  attributes: BlockAttributes;
  innerBlocks?: BlockInstance[];
}

export type ListStyle =
  | 'bullet' | 'number' | 'checklist' | 'alpha-upper' | 'alpha-lower' | 'roman-upper' | 'roman-lower';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface InlineFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  code?: boolean;
  textColor?: string;
  backgroundColor?: string;
  link?: { url: string; target?: string };
}

export interface RichTextSpan {
  text: string;
  formats?: InlineFormat;
}

export type RichTextValue = RichTextSpan[];
