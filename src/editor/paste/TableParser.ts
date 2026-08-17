/**
 * TableParser.ts
 * Converts HTML <table>, <thead>, <tbody>, <tr>, <th>, and <td> elements into
 * native TableBlock data structures with formatting, header detection, alignment, and cell items.
 */

import { createId } from '../utils';
import type { BlockInstance, RichTextValue } from '../types';
import { parse as parseRichText } from '../RichText';

export function parseTableElement(tableEl: HTMLElement): BlockInstance | null {
  const rows: { id: string; cells: { id: string; content: RichTextValue; isHeader?: boolean; align?: string }[] }[] = [];
  const trElements = Array.from(tableEl.querySelectorAll('tr'));

  if (trElements.length === 0) return null;

  trElements.forEach((tr) => {
    const cells: { id: string; content: RichTextValue; isHeader?: boolean; align?: string }[] = [];
    const cellElements = Array.from(tr.querySelectorAll('th, td'));

    cellElements.forEach((cell) => {
      const isHeader = cell.tagName.toLowerCase() === 'th';
      const cellHtml = (cell as HTMLElement).innerHTML;
      const parsedContent = parseRichText(cellHtml);
      const align = (cell as HTMLElement).style.textAlign || cell.getAttribute('align') || undefined;

      cells.push({
        id: createId(),
        content: parsedContent.length > 0 ? parsedContent : [{ text: cell.textContent?.trim() || '' }],
        isHeader,
        align,
      });
    });

    if (cells.length > 0) {
      rows.push({
        id: createId(),
        cells,
      });
    }
  });

  if (rows.length === 0) return null;

  const hasHeaderRow = rows[0]?.cells.some((c) => c.isHeader);

  return {
    id: createId(),
    type: 'table',
    attributes: {
      hasHeaderRow,
      rows,
      striped: true,
      bordered: true,
    },
    innerBlocks: [],
  };
}
