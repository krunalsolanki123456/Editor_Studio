import { nanoid } from 'nanoid';
import type { BlockInstance } from './types';

export function createId(): string {
  return nanoid(10);
}

export function cloneBlock(block: BlockInstance, newIds = true): BlockInstance {
  return {
    ...block,
    id: newIds ? createId() : block.id,
    attributes: JSON.parse(JSON.stringify(block.attributes)),
    innerBlocks: block.innerBlocks?.map((b) => cloneBlock(b, newIds)),
  };
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function focusBlockId(id: string, atStart = false) {
  setTimeout(() => {
    const blockEl = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
    if (!blockEl) return;
    const editableEl = blockEl.querySelector('[contenteditable], textarea, input') as HTMLElement | null;
    if (editableEl) {
      editableEl.focus();
      if (editableEl.hasAttribute('contenteditable')) {
        const range = document.createRange();
        range.selectNodeContents(editableEl);
        range.collapse(atStart);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, 10);
}

export function richTextToSimpleHtml(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .map((span: any) => {
      if (!span) return '';
      if (typeof span === 'string') return span;
      let text = span.text || '';
      const f = span.formats;
      if (!f) return text;
      if (f.bold) text = `<strong>${text}</strong>`;
      if (f.italic) text = `<em>${text}</em>`;
      if (f.underline) text = `<u>${text}</u>`;
      if (f.strikethrough) text = `<s>${text}</s>`;
      if (f.textColor) text = `<span style="color:${f.textColor}">${text}</span>`;
      if (f.link?.url) text = `<a href="${f.link.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-800" style="color:#2563eb;text-decoration:underline;">${text}</a>`;
      return text;
    })
    .join('');
}

export function blockToHtmlCode(block: BlockInstance): string {
  if (!block) return '';

  switch (block.type) {
    case 'paragraph': {
      const text = richTextToSimpleHtml(block.attributes.content);
      return `<p>${text}</p>`;
    }
    case 'heading': {
      const lvl = block.attributes.level || 1;
      const text = richTextToSimpleHtml(block.attributes.content);
      return `<h${lvl}>${text}</h${lvl}>`;
    }
    case 'quote': {
      const text = richTextToSimpleHtml(block.attributes.content);
      const cite = richTextToSimpleHtml(block.attributes.citation);
      return cite ? `<blockquote><p>${text}</p><cite>${cite}</cite></blockquote>` : `<blockquote><p>${text}</p></blockquote>`;
    }
    case 'list': {
      const isNum = block.attributes.style === 'number';
      const tag = isNum ? 'ol' : 'ul';
      const items = (block.attributes.items as any[]) || [];
      const lis = items.map((item) => `  <li>${richTextToSimpleHtml(item.content)}</li>`).join('\n');
      return `<${tag}>\n${lis}\n</${tag}>`;
    }
    case 'separator': {
      return `<hr />`;
    }
    case 'code':
    case 'preformatted': {
      const text = typeof block.attributes.content === 'string'
        ? block.attributes.content
        : richTextToSimpleHtml(block.attributes.content);
      const lang = block.attributes.language || 'javascript';
      return `<pre><code class="language-${lang}">${text}</code></pre>`;
    }
    case 'image': {
      const url = block.attributes.url || '';
      const alt = block.attributes.alt || '';
      const captionText = richTextToSimpleHtml(block.attributes.caption);
      if (captionText) {
        return `<figure>\n  <img src="${url}" alt="${alt}" />\n  <figcaption>${captionText}</figcaption>\n</figure>`;
      }
      return `<img src="${url}" alt="${alt}" />`;
    }
    case 'button': {
      const text = block.attributes.text || 'Click here';
      const url = block.attributes.url || '#';
      return `<a href="${url}" class="btn">${text}</a>`;
    }
    case 'table': {
      const rows = (block.attributes.rows as any[]) || [];
      if (rows.length === 0) return `<table></table>`;
      const htmlRows = rows.map((row) => {
        const cells = (row.cells || []).map((cell: any) => `    <td>${richTextToSimpleHtml(cell.content)}</td>`).join('\n');
        return `  <tr>\n${cells}\n  </tr>`;
      }).join('\n');
      return `<table>\n${htmlRows}\n</table>`;
    }
    case 'group':
    case 'column':
    case 'stack': {
      const innerHtml = (block.innerBlocks || []).map((b) => blockToHtmlCode(b)).join('\n');
      return `<section>\n${innerHtml}\n</section>`;
    }
    default: {
      const text = richTextToSimpleHtml(block.attributes.content);
      return text ? `<p>${text}</p>` : `<div class="${block.type}"></div>`;
    }
  }
}

export function blocksToHtmlCode(blocks: BlockInstance[]): string {
  if (!blocks || blocks.length === 0) return '';
  return blocks.map((b) => blockToHtmlCode(b)).join('\n\n');
}
