import {
  Code2, Columns3, GripVertical, Heading1, Image as ImageIcon, LayoutGrid,
  Link, ListOrdered, Minus, Music, Quote, Rows3, Square, Table as TableIcon,
  Type, Video, Youtube, MonitorPlay, PanelTop, Download, FileCode,
  Image as CoverIcon, CircleEllipsis, GalleryHorizontalEnd, SlidersHorizontal,
} from 'lucide-react';
import type { ComponentType } from 'react';

import type { BlockDefinition, BlockInstance } from '../types';
import { createId } from '../utils';
import { PARAGRAPH_DEFAULTS } from '../typography';

export const BLOCK_CATEGORIES = [
  { id: 'text', label: 'Text' },
  { id: 'media', label: 'Media' },
  { id: 'layout', label: 'Layout' },
  { id: 'embed', label: 'Embeds' },
  { id: 'content', label: 'Content' },
] as const;

type IconType = ComponentType<{ size?: number | string; className?: string }>;

const PreformattedIcon: IconType = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <line x1="7" y1="10" x2="14" y2="10" />
    <line x1="7" y1="14" x2="11" y2="14" />
  </svg>
);

const PullquoteIcon: IconType = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="5" x2="20" y2="5" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="4" y1="19" x2="20" y2="19" />
  </svg>
);

const VerseIcon: IconType = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M6 6h10" />
    <path d="M6 10h7" />
  </svg>
);

const ICONS: Record<string, IconType> = {
  paragraph: Type, heading: Heading1, list: ListOrdered, quote: Quote,
  code: Code2, preformatted: PreformattedIcon, pullquote: PullquoteIcon, verse: VerseIcon, image: ImageIcon,
  gallery: GalleryHorizontalEnd, cover: CoverIcon, video: Video, audio: Music,
  columns: Columns3, group: LayoutGrid, row: Rows3, stack: Square, slider: SlidersHorizontal,
  spacer: PanelTop, separator: Minus, youtube: Youtube, vimeo: MonitorPlay,
  embed: CircleEllipsis, table: TableIcon, button: Link, file: Download, html: FileCode,
};

export function getBlockIcon(name: string): IconType {
  return ICONS[name] ?? GripVertical;
}

function makeBlock(type: string, attributes: Record<string, unknown>): BlockInstance {
  return { id: createId(), type, attributes };
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: 'paragraph', label: 'Paragraph', category: 'text', icon: 'paragraph',
    keywords: ['paragraph', 'text', 'p'], description: 'A paragraph of text.',
    create: () => makeBlock('paragraph', {
      content: [],
      align: 'left',
      ...PARAGRAPH_DEFAULTS,
    })
  },
  {
    type: 'heading', label: 'Heading', category: 'text', icon: 'heading',
    keywords: ['heading', 'title', 'h1', 'h2', 'h3'], description: 'A heading from H1 to H6.',
    create: () => makeBlock('heading', { content: [], level: 1, align: 'left' })
  },
  {
    type: 'list', label: 'List', category: 'text', icon: 'list',
    keywords: ['list', 'bullet', 'number', 'ordered', 'roman'], description: 'Bullet, numbered, alphabetic, or roman list.',
    create: () => makeBlock('list', { items: [{ id: createId(), content: [] }], style: 'bullet', align: 'left' })
  },
  {
    type: 'quote', label: 'Quote', category: 'text', icon: 'quote',
    keywords: ['quote', 'blockquote', 'citation'], description: 'A blockquote with optional citation.',
    create: () => makeBlock('quote', { content: [], citation: [], align: 'left' })
  },
  {
    type: 'code', label: 'Code', category: 'text', icon: 'code',
    keywords: ['code', 'pre', 'snippet', 'syntax', 'vscode', 'developer', 'language'], description: 'Display formatted code with language selection, line numbers, and copy button.',
    create: () => makeBlock('code', {
      content: '// Write or paste your code snippet here\nfunction helloWorld() {\n  console.log("Hello, Editor Studio!");\n}',
      language: 'javascript',
      showLineNumbers: true,
      wrapLines: false,
      showCopyButton: true,
      showHeader: true,
      readOnly: false,
      tabSize: 2,
      fontSize: 14,
      fontFamily: 'firacode',
      lineHeight: 1.6,
      letterSpacing: 0,
      backgroundColor: '#0f172a',
      textColor: '#f8fafc',
      borderColor: '#1e293b',
      borderRadius: 12,
      shadow: 'md',
      padding: 16,
      marginTop: 12,
      marginBottom: 12,
      customCssClass: '',
      customId: '',
    })
  },
  {
    type: 'preformatted', label: 'Preformatted', category: 'text', icon: 'preformatted',
    keywords: ['preformatted', 'pre', 'monospace'], description: 'Preformatted text preserving whitespace.',
    create: () => makeBlock('preformatted', { content: '', align: 'left' })
  },
  {
    type: 'pullquote', label: 'Pull Quote', category: 'text', icon: 'pullquote',
    keywords: ['pullquote', 'quote', 'highlight'], description: 'A large stylized pull quote.',
    create: () => makeBlock('pullquote', { content: [], citation: [], align: 'center' })
  },
  {
    type: 'verse', label: 'Verse', category: 'text', icon: 'verse',
    keywords: ['verse', 'poetry', 'song', 'lyrics'], description: 'Write poetry or lyrics preserving line breaks and whitespace.',
    create: () => makeBlock('verse', { content: [], align: 'left' })
  },
  {
    type: 'image', label: 'Image', category: 'media', icon: 'image',
    keywords: ['image', 'picture', 'photo', 'img'], description: 'Upload an image or insert an image URL.',
    create: () => makeBlock('image', {
      url: '', alt: '', caption: [], showCaption: true, align: 'center',
      width: '100%', height: 'auto', aspectRatio: 'auto', objectFit: 'cover',
      borderRadius: 0, shadow: 'none', link: '', linkTarget: '_blank',
    })
  },
  {
    type: 'gallery', label: 'Gallery', category: 'media', icon: 'gallery',
    keywords: ['gallery', 'images', 'photos'], description: 'A gallery of multiple images.',
    create: () => makeBlock('gallery', { images: [], columns: 3, caption: [] })
  },
  {
    type: 'cover', label: 'Cover', category: 'media', icon: 'cover',
    keywords: ['cover', 'hero', 'background'], description: 'A cover section with a background image and overlay content.',
    create: () => ({
      id: createId(),
      type: 'cover',
      attributes: {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        overlayColor: '#000000',
        overlayOpacity: 50,
        minHeight: '450px',
        contentWidth: '800px',
        verticalAlign: 'center',
        horizontalAlign: 'center',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'scroll',
        focalPoint: { x: 50, y: 50 },
        showCaption: false,
        caption: [],
        captionStyle: { textColor: '#ffffff', align: 'center' },
      },
      innerBlocks: [
        {
          id: createId(),
          type: 'heading',
          attributes: {
            content: [{ text: 'Cover Heading' }],
            level: 2,
            align: 'center',
            textColor: '#ffffff',
          },
        },
        {
          id: createId(),
          type: 'paragraph',
          attributes: {
            content: [{ text: 'Add your description or subtitle here.' }],
            align: 'center',
            textColor: '#f8fafc',
          },
        },
      ],
    })
  },
  {
    type: 'video', label: 'Video', category: 'media', icon: 'video',
    keywords: ['video', 'mp4', 'movie'], description: 'Upload a video or insert a video URL.',
    create: () => makeBlock('video', { url: '', caption: [], align: 'center' })
  },
  {
    type: 'audio', label: 'Audio', category: 'media', icon: 'audio',
    keywords: ['audio', 'mp3', 'music', 'podcast'], description: 'Upload audio or insert an audio URL.',
    create: () => makeBlock('audio', { url: '', caption: [] })
  },
  {
    type: 'columns', label: 'Columns', category: 'layout', icon: 'columns',
    keywords: ['columns', 'multi', 'grid'], description: 'A multi-column layout.',
    create: () => ({
      id: createId(), type: 'columns', attributes: { columns: 2 },
      innerBlocks: [
        { id: createId(), type: 'column', attributes: {}, innerBlocks: [] },
        { id: createId(), type: 'column', attributes: {}, innerBlocks: [] },
      ],
    })
  },
  {
    type: 'group', label: 'Group', category: 'layout', icon: 'group',
    keywords: ['group', 'container', 'wrapper'], description: 'A group that wraps other blocks.',
    create: () => ({ id: createId(), type: 'group', attributes: {}, innerBlocks: [] })
  },
  {
    type: 'row', label: 'Row', category: 'layout', icon: 'row',
    keywords: ['row', 'columns', 'horizontal', 'flex', 'layout'], description: 'A horizontal row layout with columns.',
    create: () => ({
      id: createId(),
      type: 'row',
      attributes: { layoutRatio: '50-50', columns: 2, gap: 20, flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'flex-start', padding: 16 },
      innerBlocks: [
        { id: createId(), type: 'column', attributes: { widthRatio: '50%', flex: '1 1 0%' }, innerBlocks: [] },
        { id: createId(), type: 'column', attributes: { widthRatio: '50%', flex: '1 1 0%' }, innerBlocks: [] },
      ],
    })
  },
  {
    type: 'stack', label: 'Stack', category: 'layout', icon: 'stack',
    keywords: ['stack', 'vertical', 'flex'], description: 'A vertical stack layout.',
    create: () => ({ id: createId(), type: 'stack', attributes: {}, innerBlocks: [] })
  },
  {
    type: 'slider', label: 'Slider', category: 'media', icon: 'slider',
    keywords: ['slider', 'slideshow', 'hero', 'carousel', 'banner'], description: 'A production-ready hero slider with multiple slides.',
    create: () => makeBlock('slider', {
      slides: [
        {
          id: createId(),
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
          bgColor: '#0f172a',
          overlayColor: '#000000',
          overlayOpacity: 40,
          heading: [{ text: 'Transform Your Digital Experience' }],
          paragraph: [{ text: 'Create stunning hero sliders with full layout control, animations, and typography.' }],
          buttonText: 'Get Started',
          buttonUrl: '#',
          buttonStyle: 'fill',
          buttonColor: '#2563eb',
          buttonTextColor: '#ffffff',
          align: 'center',
        },
        {
          id: createId(),
          imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
          bgColor: '#1e1b4b',
          overlayColor: '#000000',
          overlayOpacity: 30,
          heading: [{ text: 'Modern Block Editor Architecture' }],
          paragraph: [{ text: 'Seamlessly manage slides, navigation styles, autoplay, and responsive viewports.' }],
          buttonText: 'Explore Features',
          buttonUrl: '#',
          buttonStyle: 'outline',
          buttonColor: '#ffffff',
          buttonTextColor: '#ffffff',
          align: 'center',
        },
      ],
      showArrows: true,
      arrowStyle: 'glass',
      showDots: true,
      dotsStyle: 'bullets',
      autoplay: true,
      autoplayDelay: 4000,
      loop: true,
      pauseOnHover: true,
      animation: 'slide',
      layoutWidth: 'boxed',
      height: '450px',
      borderRadius: 16,
    })
  },
  {
    type: 'spacer', label: 'Spacer', category: 'layout', icon: 'spacer',
    keywords: ['spacer', 'gap', 'space'], description: 'Adds vertical spacing between blocks.',
    create: () => makeBlock('spacer', { height: 64 })
  },
  {
    type: 'separator', label: 'Separator', category: 'layout', icon: 'separator',
    keywords: ['separator', 'divider', 'hr', 'line'], description: 'A horizontal separator line.',
    create: () => makeBlock('separator', { style: 'default' })
  },
  {
    type: 'youtube', label: 'YouTube', category: 'media', icon: 'youtube',
    keywords: ['youtube', 'video', 'embed'], description: 'Embed a YouTube video.',
    create: () => makeBlock('youtube', { url: '', caption: [] })
  },
  {
    type: 'vimeo', label: 'Vimeo', category: 'media', icon: 'vimeo',
    keywords: ['vimeo', 'video', 'embed'], description: 'Embed a Vimeo video.',
    create: () => makeBlock('vimeo', { url: '', caption: [] })
  },
  {
    type: 'embed', label: 'Embed', category: 'embed', icon: 'embed',
    keywords: ['embed', 'code', 'url', 'iframe', 'oembed'], description: 'Paste embed code or an embeddable URL.',
    create: () => makeBlock('embed', { url: '', caption: [] })
  },
  {
    type: 'table', label: 'Table', category: 'content', icon: 'table',
    keywords: ['table', 'grid', 'data'], description: 'A table with rows and columns.',
    create: () => makeBlock('table', {
      rows: [['Header 1', 'Header 2', 'Header 3'], ['Cell 1', 'Cell 2', 'Cell 3'], ['Cell 4', 'Cell 5', 'Cell 6']],
      hasHeader: true,
      hasFooter: false,
      align: 'left',
      fontSize: 14,
      textColor: '#111827',
      backgroundColor: '',
      borderColor: '#d1d5db',
      borderWidth: 1,
      rowStyles: [{}, {}, {}],
      columnStyles: [{}, {}, {}],
    })
  },
  {
    type: 'button', label: 'Button', category: 'content', icon: 'button',
    keywords: ['button', 'cta', 'link'], description: 'A call-to-action button.',
    create: () => makeBlock('button', { text: 'Click me', url: '', align: 'left', style: 'fill', color: '#2563eb', textColor: '#ffffff', radius: 6 })
  },
  {
    type: 'file', label: 'File', category: 'content', icon: 'file',
    keywords: ['file', 'download', 'document'], description: 'A file download block.',
    create: () => makeBlock('file', { url: '', fileName: 'Download file', buttonText: 'Download' })
  },
  {
    type: 'html', label: 'HTML', category: 'content', icon: 'html',
    keywords: ['html', 'custom', 'raw'], description: 'Raw HTML content.',
    create: () => makeBlock('html', { content: '' })
  },
];

export const BLOCK_MAP: Record<string, BlockDefinition> = BLOCK_DEFINITIONS.reduce(
  (acc, def) => { acc[def.type] = def; return acc; },
  {} as Record<string, BlockDefinition>,
);

export function createBlock(
  type: string,
  options?: { attributes?: Record<string, unknown>; innerBlocks?: BlockInstance[] }
): BlockInstance {
  const def = BLOCK_MAP[type];
  const base = def ? def.create() : makeBlock(type, {});
  return {
    ...base,
    attributes: { ...base.attributes, ...(options?.attributes ?? {}) },
    innerBlocks: options?.innerBlocks ?? base.innerBlocks,
  };
}

export function getBlockLabel(type: string): string {
  return BLOCK_MAP[type]?.label ?? type;
}

