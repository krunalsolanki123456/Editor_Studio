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
    case 'media-text': {
      const url = block.attributes.mediaUrl || '';
      const alt = block.attributes.mediaAlt || '';
      const text = richTextToSimpleHtml(block.attributes.content);
      const isRight = block.attributes.mediaPosition === 'right';
      const mediaHtml = url ? `<figure><img src="${url}" alt="${alt}" /></figure>` : '';
      const textHtml = `<div><p>${text}</p></div>`;
      return isRight
        ? `<div class="wp-block-media-text has-media-on-the-right">\n  ${textHtml}\n  ${mediaHtml}\n</div>`
        : `<div class="wp-block-media-text">\n  ${mediaHtml}\n  ${textHtml}\n</div>`;
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
    case 'live-updates': {
      const feedTitle = (block.attributes.feedTitle as string) || 'Live Updates';
      const isLive = block.attributes.isLive !== false;
      const updates = (block.attributes.updates as any[]) || [];
      const badge = isLive ? `<span style="background:#dc2626;color:#fff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:900;text-transform:uppercase;">● LIVE COVERAGE</span>` : `<span style="background:#6b7280;color:#fff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:700;">CONCLUDED</span>`;
      
      const itemsHtml = updates.map((u) => {
        const pinHtml = u.isPinned ? `<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;border:1px solid #fde68a;">📌 PINNED</span>` : '';
        const timeHtml = u.timestamp ? `<span style="font-size:11px;font-weight:700;color:#ef4444;">${u.timestamp}</span>` : '';
        const alignJustify = u.mediaAlign === 'left' ? 'flex-start' : u.mediaAlign === 'right' ? 'flex-end' : 'center';
        const mediaMaxWidth = u.mediaAlign === 'left' || u.mediaAlign === 'right' ? '75%' : '100%';

        let mediaHtml = '';
        if (u.mediaUrl) {
          if (u.mediaType === 'pdf') {
            mediaHtml = `<div style="display:flex;justify-content:${alignJustify};margin-top:10px;width:100%;">
              <div style="max-width:520px;width:100%;border:1px solid #fecaca;background:linear-gradient(to right, #fef2f2, #ffffff);border-radius:14px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
                  <div style="width:38px;height:38px;border-radius:10px;background:#dc2626;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;letter-spacing:0.05em;flex-shrink:0;">PDF</div>
                  <div style="min-width:0;flex:1;">
                    <div style="font-size:13px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.mediaFileName || 'Official Document.pdf'}</div>
                    <div style="font-size:11px;color:#dc2626;margin-top:2px;font-weight:600;">PDF Document ${u.mediaFileSize ? `· <span style="color:#6b7280">${u.mediaFileSize}</span>` : ''}</div>
                  </div>
                </div>
                <a href="${u.mediaUrl}" download="${u.mediaFileName || 'document.pdf'}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#dc2626;color:#ffffff;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;flex-shrink:0;box-shadow:0 1px 2px rgba(220,38,38,0.2);">Download PDF</a>
              </div>
            </div>`;
          } else if (u.mediaType === 'video') {
            mediaHtml = `<div style="display:flex;justify-content:${alignJustify};margin-top:10px;width:100%;"><div style="max-width:${mediaMaxWidth};width:100%;border-radius:12px;overflow:hidden;background:#000;"><video src="${u.mediaUrl}" controls playsinline style="width:100%;height:auto;max-height:540px;display:block;margin:0 auto;border-radius:12px;"></video></div></div>`;
          } else {
            mediaHtml = `<div style="display:flex;justify-content:${alignJustify};margin-top:10px;width:100%;"><div style="max-width:${mediaMaxWidth};width:100%;border-radius:12px;overflow:hidden;"><img src="${u.mediaUrl}" alt="${u.title}" style="width:100%;height:auto;max-height:600px;object-fit:contain;display:block;border-radius:12px;" /></div></div>`;
          }
        }

        return `<div style="position:relative;margin-bottom:24px;">
          <span style="position:absolute;left:-28px;top:4px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:2px solid #ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.1);display:inline-block;"></span>
          <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:#111827;line-height:1.35;text-align:left;">${u.title || ''}</h3>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;text-align:left;">
            ${pinHtml}
            ${timeHtml}
          </div>
          ${u.content ? `<p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;text-align:left;">${u.content}</p>` : ''}
          ${mediaHtml}
        </div>`;
      }).join('\n');

      return `<div class="be-live-updates" style="border:1px solid #e5e7eb;border-radius:16px;padding:16px 18px;margin:20px 0;background:#ffffff;box-sizing:border-box;max-width:100%;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;margin-bottom:18px;border-bottom:1px solid #f3f4f6;padding-bottom:12px;">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;flex:1;min-width:180px;">
            ${badge}
            <h2 style="margin:0;font-size:17px;font-weight:900;color:#111827;line-height:1.3;">${feedTitle}</h2>
          </div>
          <span style="font-size:11px;font-weight:700;color:#ef4444;background:#fef2f2;padding:2px 8px;border-radius:9999px;border:1px solid #fee2e2;white-space:nowrap;">${updates.length} Updates</span>
        </div>
        <div style="padding-left:22px;border-left:2px dashed #d1d5db;box-sizing:border-box;">
          ${itemsHtml}
        </div>
      </div>`;
    }
    case 'election': {
      const title = (block.attributes.title as string) || 'Live Charts & Results / લાઈવ ચાર્ટ અને પરિણામ';
      const totalSeats = Number(block.attributes.totalSeats) || 182;
      const majoritySeats = Number(block.attributes.majoritySeats) || 92;
      const isLive = block.attributes.isLive !== false;
      const parties = (block.attributes.parties as any[]) || [];

      const badge = isLive
        ? `<span style="background:#dc2626;color:#ffffff;padding:3px 9px;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;white-space:nowrap;">● LIVE TRENDS</span>`
        : `<span style="background:#059669;color:#ffffff;padding:3px 9px;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;white-space:nowrap;">✓ FINAL RESULTS</span>`;

      const segments = parties.map((p) => {
        const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
        const pct = totalSeats > 0 ? (total / totalSeats) * 100 : 0;
        return `<div style="width:${pct}%;background:${p.color};height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:11px;overflow:hidden;box-sizing:border-box;">${pct >= 14 ? `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 3px;">${p.shortName} ${total}</span>` : ''}</div>`;
      }).join('');

      return `<div class="be-election-widget" style="border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin:20px 0;background:#ffffff;box-sizing:border-box;max-width:100%;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;flex:1;min-width:180px;">${badge}<h2 style="margin:0;font-size:17px;font-weight:900;line-height:1.3;">${title}</h2></div>
        </div>
        <div style="height:32px;border-radius:8px;overflow:hidden;display:flex;background:#f1f5f9;border:1px solid #cbd5e1;box-sizing:border-box;margin-bottom:14px;">${segments}</div>
      </div>`;
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
