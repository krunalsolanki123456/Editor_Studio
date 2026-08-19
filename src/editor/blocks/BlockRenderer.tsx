import { Suspense } from 'react';
import type { BlockInstance } from '../types';

import { ParagraphBlock, HeadingBlock, ListBlock, QuoteBlock, CodeBlock, PreformattedBlock, PullquoteBlock, VerseBlock } from './TextBlocks';
import { ImageBlock, GalleryBlock, CoverBlock, VideoBlock, AudioBlock, MediaTextBlock } from './MediaBlocks';
import { ColumnsBlock, GroupBlock, RowBlock, StackBlock, SpacerBlock, SeparatorBlock } from './LayoutBlocks';
import { SliderBlock } from './SliderBlocks';
import { TableBlock, ButtonBlock, FileBlock, HtmlBlock } from './ContentBlocks';
import { YouTubeBlock, VimeoBlock, EmbedBlock } from './EmbedBlocks';
import { LiveUpdatesBlock } from './LiveUpdatesBlock';
import { ElectionBlock } from './ElectionBlock';
import { PollBlock } from './PollBlock';

interface BlockComponentProps {
  block: BlockInstance;
  selected: boolean;
}

const BLOCK_COMPONENTS: Record<string, React.ComponentType<BlockComponentProps>> = {
  paragraph: ParagraphBlock, heading: HeadingBlock, list: ListBlock, quote: QuoteBlock,
  code: CodeBlock, preformatted: PreformattedBlock, pullquote: PullquoteBlock, verse: VerseBlock,
  image: ImageBlock, gallery: GalleryBlock, cover: CoverBlock, 'media-text': MediaTextBlock, video: VideoBlock, audio: AudioBlock,
  columns: ColumnsBlock, group: GroupBlock, row: RowBlock, stack: StackBlock, slider: SliderBlock, spacer: SpacerBlock, separator: SeparatorBlock,
  youtube: YouTubeBlock, vimeo: VimeoBlock, embed: EmbedBlock,
  table: TableBlock, button: ButtonBlock, file: FileBlock, html: HtmlBlock,
  'live-updates': LiveUpdatesBlock,
  election: ElectionBlock,
  poll: PollBlock,
};

export default function BlockRenderer({ block, selected = false }: BlockComponentProps) {
  if (!block || !block.type) return null;
  const Component = BLOCK_COMPONENTS[block.type];
  if (!Component) {
    return <div className="p-3 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">Unknown block type: {block.type}</div>;
  }
  return (
    <Suspense fallback={<div className="p-3 text-xs text-gray-400">Loading…</div>}>
      <Component block={block} selected={selected} />
    </Suspense>
  );
}
