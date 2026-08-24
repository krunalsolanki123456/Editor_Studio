import type { BlockInstance, RichTextValue } from './types';
import { getTypographyStyle, styleObjectToString, fontFamilyStack } from './typography';
import { ensureTableColumnStyles, ensureTableRowStyles, ensureTableCellStyles, getTableSections, hexToRgba } from './table';
import { detectLanguage } from './blocks/CodeBlock';

function escapeHtml(s: any): string {
  const str = typeof s === 'string' ? s : String(s ?? '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function richTextToHtml(value: RichTextValue, preserveLineBreaks = false): string {
  return value.map((span) => {
    let html = escapeHtml(span.text);
    if (preserveLineBreaks) html = html.replace(/\r?\n/g, '<br>');
    const f = span.formats;
    if (!f) return html;
    if (f.bold) html = `<strong>${html}</strong>`;
    if (f.italic) html = `<em>${html}</em>`;
    if (f.underline) html = `<u>${html}</u>`;
    if (f.strikethrough) html = `<s>${html}</s>`;
    if (f.superscript) html = `<sup>${html}</sup>`;
    if (f.subscript) html = `<sub>${html}</sub>`;
    if (f.textColor) html = `<span style="color:${f.textColor}">${html}</span>`;
    if (f.backgroundColor) html = `<span style="background-color:${f.backgroundColor}">${html}</span>`;
    if (f.link) {
      const target = f.link.target ? ` target="${f.link.target}"` : '';
      html = `<a href="${escapeHtml(f.link.url)}"${target}>${html}</a>`;
    }
    return html;
  }).join('');
}

function listStyleCss(style: string): string {
  switch (style) {
    case 'bullet': return 'disc';
    case 'number': return 'decimal';
    case 'alpha-upper': return 'upper-alpha';
    case 'alpha-lower': return 'lower-alpha';
    case 'roman-upper': return 'upper-roman';
    case 'roman-lower': return 'lower-roman';
    default: return 'disc';
  }
}

function hasCaptionText(val: any): boolean {
  if (!val) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (!Array.isArray(val) || val.length === 0) return false;
  return val.some((span) => {
    if (!span) return false;
    if (typeof span === 'string') return (span as string).trim().length > 0;
    return typeof span.text === 'string' && span.text.trim().length > 0;
  });
}




export function extractYouTubeId(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : '';
}

export function extractVimeoId(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : '';
}

export function isTwitterUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    return host === 'twitter.com' || host === 'x.com';
  } catch {
    return /(?:^|\/\/)(?:www\.)?(?:twitter|x)\.com\//i.test(url);
  }
}

export function normalizeTwitterUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'x.com') parsed.hostname = 'twitter.com';
    return parsed.toString();
  } catch {
    return trimmed.replace(/^https?:\/\/(?:www\.)?x\.com/i, 'https://twitter.com');
  }
}

export function isInstagramUrl(url: string): boolean {
  if (!url) return false;
  return /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|tv)\/[\w-]+/i.test(url) || /instagram\.com/i.test(url);
}

export function normalizeInstagramUrl(url: string): string {
  const trimmed = url.trim();
  const iframeSrc = extractEmbedSrc(trimmed);
  const match = iframeSrc.match(/https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(p|reel|tv)\/([\w-]+)/i);
  if (match) {
    const type = match[3];
    const code = match[4];
    return `https://www.instagram.com/${type}/${code}/embed/captioned/`;
  }
  if (iframeSrc.includes('/embed')) return iframeSrc;
  return iframeSrc.endsWith('/') ? `${iframeSrc}embed/` : `${iframeSrc}/embed/`;
}

export function isSpotifyUrl(url: string): boolean {
  if (!url) return false;
  return /https?:\/\/open\.spotify\.com\/(track|album|playlist|episode)\/[\w-]+/i.test(url);
}

export function normalizeSpotifyUrl(url: string): string {
  return url.trim().replace(/open\.spotify\.com\/(track|album|playlist|episode)\//i, 'open.spotify.com/embed/$1/');
}

export function extractEmbedSrc(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const srcMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  if (srcMatch?.[1]) return srcMatch[1];
  const dataSrcMatch = trimmed.match(/<iframe[^>]*\sdata-src=["']([^"']+)["'][^>]*>/i);
  if (dataSrcMatch?.[1]) return dataSrcMatch[1];
  return trimmed;
}

export function extractEmbedList(input: string | string[] | undefined): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.flatMap((item) => extractEmbedList(item)).filter(Boolean);
  }
  const text = input.trim();
  if (!text) return [];

  // Check if multiple iframes exist
  const iframeMatches = text.match(/<iframe[\s\S]*?<\/iframe>|<iframe[\s\S]*?\/>/gi);
  if (iframeMatches && iframeMatches.length > 1) {
    return iframeMatches.map((m) => m.trim()).filter(Boolean);
  }

  // Check if multiple URLs separated by newlines or commas
  const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines;
  }

  return [text];
}

function renderBlock(block: BlockInstance): string {
  const a = block.attributes;
  switch (block.type) {
    case 'paragraph':
      return `<p style="text-align:${a.align};${styleObjectToString(getTypographyStyle('paragraph', a))}">${richTextToHtml(a.content as RichTextValue, true)}</p>`;
    case 'heading':
      return `<h${a.level} style="text-align:${a.align};${styleObjectToString(getTypographyStyle('heading', a))}">${richTextToHtml(a.content as RichTextValue)}</h${a.level}>`;
    case 'list': {
      const isBullet = a.style === 'bullet' || !a.style;
      const isChecklist = a.style === 'checklist';
      const tag = isBullet || isChecklist ? 'ul' : 'ol';
      const listStyleBase = listStyleCss(a.style as string);
      const rawItems = (a.items as { id?: string; content: RichTextValue; level?: number; checked?: boolean }[]) || [];

      if (isBullet) {
        const items = rawItems.map((item, index) => {
          const itemLevel = item.level || 0;
          const marginLeft = itemLevel > 0 ? `margin-left:${itemLevel * 20}px;` : '';
          const isLast = index === rawItems.length - 1;
          const borderBottom = isLast ? '' : 'border-bottom:1px dotted #d1d5db;';

          return `<li style="list-style:none;position:relative;display:flex;align-items:flex-start;gap:12px;padding:12px 4px;box-sizing:border-box;${borderBottom}${marginLeft}">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.55);flex-shrink:0;margin-top:8px;" aria-hidden="true"></span>
            <div style="flex:1;min-width:0;font-size:16px;font-weight:600;line-height:1.75;color:#111827;">${richTextToHtml(item.content)}</div>
          </li>`;
        }).join('');

        return `<div class="be-list-wrapper" style="margin:16px 0;width:100%;">
          <ul style="background-color:#f8f9fa;border:1px solid #e5e7eb;border-radius:12px;padding:10px 20px;margin:0;list-style:none;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);text-align:${a.align || 'left'};${styleObjectToString(getTypographyStyle('list', a))}">
            ${items}
          </ul>
        </div>`;
      }

      if (isChecklist) {
        const items = rawItems.map((item) => {
          const itemLevel = item.level || 0;
          const marginLeft = itemLevel > 0 ? `margin-left:${itemLevel * 20}px;` : '';
          const checkedAttr = item.checked ? 'checked' : '';
          const lineThrough = item.checked ? 'text-decoration:line-through;opacity:0.6;' : '';
          return `<li style="list-style:none;${marginLeft}margin-bottom:8px;display:flex;align-items:flex-start;gap:10px;">
            <input type="checkbox" ${checkedAttr} disabled style="margin-top:4px;width:16px;height:16px;accent-color:#2563eb;" />
            <span style="${lineThrough}flex:1;line-height:1.6;">${richTextToHtml(item.content)}</span>
          </li>`;
        }).join('');

        return `<ul style="padding-left:0;list-style:none;text-align:${a.align || 'left'};${styleObjectToString(getTypographyStyle('list', a))}">${items}</ul>`;
      }

      const items = rawItems.map((item) => {
        const itemLevel = item.level || 0;
        const marginLeft = itemLevel > 0 ? `margin-left:${itemLevel * 20}px;` : '';
        const currentListStyle = itemLevel > 0
          ? (itemLevel % 2 === 1 ? 'lower-alpha' : 'lower-roman')
          : listStyleBase;

        return `<li style="list-style-type:${currentListStyle};${marginLeft}margin-bottom:8px;line-height:1.6;">${richTextToHtml(item.content)}</li>`;
      }).join('');

      return `<${tag} style="padding-left:24px;text-align:${a.align || 'left'};${styleObjectToString(getTypographyStyle('list', a))}">${items}</${tag}>`;
    }
    case 'quote': {
      const cite = (a.citation as RichTextValue)?.length ? `<figcaption style="margin-top:8px;font-size:14px;font-weight:600;color:#4b5563">— ${richTextToHtml(a.citation as RichTextValue)}</figcaption>` : '';
      return `<figure class="be-quote-wrapper" style="margin:20px 0;text-align:${a.align || 'left'};${styleObjectToString(getTypographyStyle('quote', a))}"><blockquote style="border-left:4px solid #2563eb;padding-left:16px;margin:0;font-style:italic;color:#1e293b"><p style="margin:0">${richTextToHtml(a.content as RichTextValue)}</p></blockquote>${cite}</figure>`;
    }
    case 'verse': {
      const typoStyle = styleObjectToString(getTypographyStyle('verse', a));
      return `<div class="be-verse-container" style="margin:16px 0"><pre class="be-verse" style="font-family:${fontFamilyStack((a.fontFamily as string) || 'serif')};font-size:${a.fontSize || 18}px;line-height:${a.lineHeight || 1.6};white-space:pre-wrap;padding:16px;background-color:${a.backgroundColor || '#f3f4f6'};color:${a.textColor || '#111827'};border-radius:12px;border:1px solid #e5e7eb;text-align:${a.align || 'left'};${typoStyle}">${richTextToHtml(a.content as RichTextValue)}</pre></div>`;
    }
    case 'code': {
      const codeStr = (a.content as string) || '';
      const detected = detectLanguage(codeStr);
      const languageLabel = detected.label;
      const showLineNumbers = a.showLineNumbers !== false;
      const wrapLines = Boolean(a.wrapLines);
      const showHeader = a.showHeader !== false;
      const showCopyButton = a.showCopyButton !== false;

      const fontFamily = (a.fontFamily as string) || 'firacode';
      const fontSize = (a.fontSize as number) || 14;
      const lineHeight = (a.lineHeight as number) || 1.6;
      const letterSpacing = (a.letterSpacing as number) || 0;

      const bgColor = (a.backgroundColor as string) || '#0f172a';
      const textColor = (a.textColor as string) || '#f8fafc';
      const borderColor = (a.borderColor as string) || '#1e293b';
      const radiusNum = typeof a.borderRadius === 'number' ? a.borderRadius : parseInt(String(a.borderRadius || 12), 10);
      const borderRadius = isNaN(radiusNum) ? '12px' : `${radiusNum}px`;
      const padding = typeof a.padding === 'number' ? `${a.padding}px` : (a.padding as string) || '16px';
      const marginTop = typeof a.marginTop === 'number' ? `${a.marginTop}px` : (a.marginTop as string) || '12px';
      const marginBottom = typeof a.marginBottom === 'number' ? `${a.marginBottom}px` : (a.marginBottom as string) || '12px';

      const lines = codeStr.split('\n');
      const lineCount = Math.max(1, lines.length);

      const headerHtml = showHeader ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:rgba(0,0,0,0.25);border-bottom:1px solid ${borderColor};font-family:system-ui,sans-serif;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em"><div>${escapeHtml(languageLabel)}</div>${showCopyButton ? `<button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText)" style="padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.1);color:#fff;border:none;cursor:pointer;font-size:11px">Copy</button>` : ''}</div>` : '';

      const lineNumsHtml = showLineNumbers ? `<div style="user-select:none;text-align:right;padding-right:14px;margin-right:14px;border-right:1px solid rgba(255,255,255,0.1);color:#64748b;font-family:${fontFamilyStack(fontFamily)};font-size:${fontSize}px;line-height:${lineHeight}">${Array.from({ length: lineCount }, (_, i) => `<div>${i + 1}</div>`).join('')}</div>` : '';

      const preStyles = [
        `background-color:${bgColor}`,
        `color:${textColor}`,
        `border:1px solid ${borderColor}`,
        `border-radius:${borderRadius}`,
        `margin:${marginTop} 0 ${marginBottom} 0`,
        `overflow:hidden`,
        `font-family:${fontFamilyStack(fontFamily)}`,
        `font-size:${fontSize}px`,
        `line-height:${lineHeight}`,
        `letter-spacing:${letterSpacing}px`,
      ].join(';');

      const codeStyles = [
        `white-space:${wrapLines ? 'pre-wrap' : 'pre'}`,
        `word-break:${wrapLines ? 'break-word' : 'normal'}`,
        `font-family:inherit`,
        `font-size:inherit`,
        `color:inherit`,
      ].join(';');

      return `<div class="be-code-export" style="${preStyles}">${headerHtml}<div style="display:flex;padding:${padding};overflow-x:auto">${lineNumsHtml}<pre style="margin:0;padding:0;background:transparent;border:0;flex:1"><code style="${codeStyles}">${escapeHtml(codeStr)}</code></pre></div></div>`;
    }
    case 'preformatted':
      return `<pre style="text-align:${a.align};${styleObjectToString(getTypographyStyle('preformatted', a))}">${escapeHtml(a.content as string)}</pre>`;
    case 'pullquote': {
      const cite = (a.citation as RichTextValue)?.length ? `<figcaption style="margin-top:8px;font-size:14px;font-weight:600;color:#2563eb">— ${richTextToHtml(a.citation as RichTextValue)}</figcaption>` : '';
      return `<figure class="be-pullquote-wrapper" style="margin:24px 0;padding:20px;border-top:2px solid #2563eb;border-bottom:2px solid #2563eb;text-align:${a.align || 'center'};${styleObjectToString(getTypographyStyle('pullquote', a))}"><blockquote style="margin:0;font-size:20px;font-style:italic;font-weight:600;color:#0f172a"><p style="margin:0">${richTextToHtml(a.content as RichTextValue)}</p></blockquote>${cite}</figure>`;
    }
    case 'image': {
      const showCaption = a.showCaption !== false;
      const captionStyle = (a.captionStyle as Record<string, any>) || {};
      const capContent = (showCaption && hasCaptionText(a.caption as RichTextValue)) ? richTextToHtml(a.caption as RichTextValue) : '';
      const capAlign = captionStyle.align || a.align || 'center';
      const capStylesStr = [
        `margin-top:${captionStyle.marginTop ?? 8}px`,
        captionStyle.marginBottom !== undefined ? `margin-bottom:${captionStyle.marginBottom}px` : '',
        captionStyle.padding !== undefined ? `padding:${captionStyle.padding}px` : '',
        `text-align:${capAlign}`,
        `width:100%`,
        captionStyle.fontFamily ? `font-family:${fontFamilyStack(captionStyle.fontFamily)}` : '',
        captionStyle.fontSize ? `font-size:${captionStyle.fontSize}px` : 'font-size:14px',
        captionStyle.fontWeight ? `font-weight:${captionStyle.fontWeight}` : '',
        captionStyle.textTransform ? `text-transform:${captionStyle.textTransform}` : '',
        captionStyle.textDecoration ? `text-decoration:${captionStyle.textDecoration}` : '',
        captionStyle.textColor ? `color:${captionStyle.textColor}` : 'color:#6b7280',
        captionStyle.backgroundColor ? `background-color:${captionStyle.backgroundColor}` : '',
      ].filter(Boolean).join(';');

      const capHtml = showCaption && capContent ? `<figcaption style="${capStylesStr}">${capContent}</figcaption>` : '';

      const widthCss = (a.width as string) || '100%';
      const heightCss = (a.height as string) || 'auto';
      const objectFitCss = (a.objectFit as string) || 'cover';
      const radiusNum = typeof a.borderRadius === 'number' ? a.borderRadius : parseInt(String(a.borderRadius || 0), 10);
      const borderRadiusCss = isNaN(radiusNum) ? (a.borderRadius as string) || '0px' : `${radiusNum}px`;
      const opacityVal = typeof a.opacity === 'number' ? a.opacity / 100 : 1;
      const lazyLoadAttr = a.lazyLoad ? ' loading="lazy"' : '';

      const aspectRatioRaw = (a.aspectRatio as string) || 'auto';
      const aspectRatioCss = (aspectRatioRaw !== 'auto' && aspectRatioRaw !== 'original') ? `aspect-ratio:${aspectRatioRaw.replace(':', '/')};` : '';

      const align = (a.align as string) || 'center';
      const flexJustify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

      const imgStylesStr = [
        `width:${widthCss === 'auto' ? 'auto' : '100%'}`,
        `height:${heightCss === 'auto' ? '100%' : heightCss}`,
        `object-fit:${objectFitCss}`,
        `border-radius:${borderRadiusCss}`,
        `opacity:${opacityVal}`,
        `max-width:100%`,
        `display:block`,
      ].join(';');

      const wrapperStylesStr = [
        `width:${widthCss}`,
        `max-width:100%`,
        `overflow:hidden`,
        `border-radius:${borderRadiusCss}`,
        aspectRatioCss,
      ].filter(Boolean).join(';');

      let imgHtml = `<img src="${a.url || ''}" alt="${escapeHtml((a.alt as string) || '')}"${lazyLoadAttr} style="${imgStylesStr}"/>`;

      if (a.link) {
        const targetAttr = (a.linkTarget as string) === '_self' ? '' : ' target="_blank" rel="noopener noreferrer"';
        imgHtml = `<a href="${escapeHtml(a.link as string)}"${targetAttr} style="display:block;width:100%;height:100%">${imgHtml}</a>`;
      }

      return `<figure style="display:flex;flex-direction:column;align-items:${flexJustify};margin:12px 0;width:100%"><div style="${wrapperStylesStr}">${imgHtml}</div>${capHtml}</figure>`;
    }
    case 'gallery': {
      const images = (a.images as any[]) ?? [];
      const columns = (a.columns as number) || 3;
      const gap = (a.gap as number) ?? 12;
      const layoutType = (a.layoutType as string) || 'grid';
      const showCaptions = a.showCaptions !== false;
      const borderRadius = (a.borderRadius as number) ?? 12;
      const borderWidth = (a.borderWidth as number) ?? 0;
      const borderColor = (a.borderColor as string) || '#e2e8f0';

      const imgsHtml = images.map((img) => {
        const imgRadius = img.borderRadius !== undefined ? `${img.borderRadius}px` : `${borderRadius}px`;
        const imgBorderWidth = img.borderWidth !== undefined ? `${img.borderWidth}px` : `${borderWidth}px`;
        const imgBorderColor = img.borderColor || borderColor;
        const imgOpacity = typeof img.opacity === 'number' ? img.opacity / 100 : 1;
        const imgAspect = img.aspectRatio || (a.imageRatio && a.imageRatio !== 'original' ? String(a.imageRatio).replace(':', '/') : undefined);

        const aspectStyle = imgAspect ? `aspect-ratio:${imgAspect};` : '';
        const objFit = (img.objectFit as string) || 'cover';

        const capHtml = showCaptions && img.caption ? `<figcaption style="position:absolute;bottom:0;inset-x:0;padding:8px;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);color:#fff;font-size:12px;text-align:center">${escapeHtml(img.caption)}</figcaption>` : '';

        let itemHtml = `<div class="be-gallery-item" style="position:relative;width:100%;box-sizing:border-box;overflow:hidden;border-radius:${imgRadius};border:${imgBorderWidth} solid ${imgBorderColor};opacity:${imgOpacity};${aspectStyle}"><img src="${img.url}" alt="${escapeHtml(img.alt || '')}" style="width:100%;height:100%;object-fit:${objFit};display:block"/>${capHtml}</div>`;

        if (img.link) {
          const target = img.linkTarget === '_self' ? '' : ' target="_blank" rel="noopener noreferrer"';
          itemHtml = `<a href="${escapeHtml(img.link)}"${target} style="display:block;width:100%;text-decoration:none">${itemHtml}</a>`;
        }
        return itemHtml;
      }).join('');

      if (layoutType === 'masonry') {
        return `<div class="be-gallery-masonry" style="column-count:${columns};column-gap:${gap}px;margin:20px 0">${imgsHtml.replace(/<div style="/g, `<div style="margin-bottom:${gap}px;break-inside:avoid;`)}</div>`;
      }

      return `<div class="be-gallery-grid" style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap}px;margin:20px 0">${imgsHtml}</div>`;
    }
    case 'cover': {
      const url = (a.url as string) || '';
      const overlayOpacity = typeof a.overlayOpacity === 'number' ? a.overlayOpacity / 100 : (typeof a.overlay === 'number' ? a.overlay / 100 : 0.5);
      const overlayColor = (a.overlayColor as string) || '#000000';
      const minHeight = (a.minHeight as string) || '450px';
      const contentWidth = (a.contentWidth as string) || '800px';

      const verticalAlign = (a.verticalAlign as string) || 'center';
      const horizontalAlign = (a.horizontalAlign as string) || 'center';

      const bgSize = (a.backgroundSize as string) || 'cover';
      const bgRepeat = (a.backgroundRepeat as string) || 'no-repeat';
      const bgAttachment = (a.backgroundAttachment as string) || 'scroll';
      const focal = (a.focalPoint as { x: number; y: number }) || { x: 50, y: 50 };

      const vAlignStyle = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';
      const hAlignStyle = horizontalAlign === 'left' ? 'flex-start' : horizontalAlign === 'right' ? 'flex-end' : 'center';
      const textAlignStyle = horizontalAlign === 'left' ? 'left' : horizontalAlign === 'right' ? 'right' : 'center';

      const innerHtml = (block.innerBlocks ?? []).map(renderBlock).join('\n');

      const showCaption = a.showCaption !== false;
      const capStyle = (a.captionStyle as Record<string, any>) || {};
      const capContent = (showCaption && hasCaptionText(a.caption as RichTextValue)) ? richTextToHtml(a.caption as RichTextValue) : '';
      const capStylesStr = [
        `margin-top:${capStyle.marginTop ?? 12}px`,
        `text-align:${capStyle.align || 'center'}`,
        capStyle.fontFamily ? `font-family:${fontFamilyStack(capStyle.fontFamily)}` : '',
        capStyle.fontSize ? `font-size:${capStyle.fontSize}px` : 'font-size:14px',
        capStyle.fontWeight ? `font-weight:${capStyle.fontWeight}` : '',
        capStyle.textColor ? `color:${capStyle.textColor}` : 'color:#ffffff',
        capStyle.backgroundColor ? `background-color:${capStyle.backgroundColor}` : '',
      ].filter(Boolean).join(';');
      const capHtml = capContent ? `<figcaption style="${capStylesStr}">${capContent}</figcaption>` : '';

      const bgImgStyle = url
        ? `background-image:url('${url}');background-size:${bgSize};background-position:${focal.x}% ${focal.y}%;background-repeat:${bgRepeat};background-attachment:${bgAttachment};`
        : `background-color:${(a.backgroundColor as string) || '#1e293b'};`;

      return `<div id="${(a.customId as string) || ''}" class="be-cover ${(a.customCssClass as string) || ''}" style="position:relative;overflow:hidden;border-radius:16px;min-height:${minHeight};display:flex;flex-direction:column;align-items:${vAlignStyle};justify-content:${hAlignStyle};padding:32px;${bgImgStyle}margin:20px 0;box-sizing:border-box"><div style="position:absolute;inset:0;background-color:${overlayColor};opacity:${overlayOpacity};pointer-events:none;z-index:0"></div><div style="position:relative;z-index:1;width:100%;max-width:${contentWidth};display:flex;flex-direction:column;gap:16px;align-items:${hAlignStyle};text-align:${textAlignStyle}">${innerHtml}${capHtml}</div></div>`;
    }
    case 'video': {
      const cap = (a.caption as RichTextValue)?.length ? `<figcaption style="margin-top:6px;text-align:center;font-size:12px;color:#6b7280">${richTextToHtml(a.caption as RichTextValue)}</figcaption>` : '';
      const youtubeId = extractYouTubeId(a.url as string);
      const vimeoId = extractVimeoId(a.url as string);
      if (youtubeId) {
        return `<figure style="text-align:${a.align};width:100%;max-width:100%;margin:16px 0"><div style="position:relative;width:100%;aspect-ratio:16/9;min-height:240px;overflow:hidden;border-radius:12px;background:#000"><iframe src="https://www.youtube.com/embed/${youtubeId}" allowfullscreen loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>${cap}</figure>`;
      }
      if (vimeoId) {
        return `<figure style="text-align:${a.align};width:100%;max-width:100%;margin:16px 0"><div style="position:relative;width:100%;aspect-ratio:16/9;min-height:240px;overflow:hidden;border-radius:12px;background:#000"><iframe src="https://player.vimeo.com/video/${vimeoId}" allowfullscreen loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>${cap}</figure>`;
      }
      return `<figure style="text-align:${a.align};width:100%;max-width:100%;margin:16px 0"><div style="position:relative;width:100%;aspect-ratio:16/9;min-height:240px;overflow:hidden;border-radius:12px;background:#000"><video controls preload="metadata" playsinline src="${a.url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain"></video></div>${cap}</figure>`;
    }
    case 'audio': {
      return `<figure style="width:100%;margin:16px 0"><audio controls src="${a.url}" style="width:100%;display:block"></audio></figure>`;
    }
    case 'column': {
      const innerHtml = (block.innerBlocks ?? []).map(renderBlock).join('');
      const bg = a.backgroundColor ? `background:${a.backgroundColor};` : '';
      const padding = typeof a.padding === 'number' ? `${a.padding}px` : (a.padding as string) || '0px';
      const gapPx = typeof a.gap === 'number' ? `${a.gap}px` : (a.gap as string) || '12px';
      const widthRatio = (a.widthRatio as string) || '100%';
      const flex = (a.flex as string) || '1 1 0%';
      const vAlign = (a.verticalAlign as string) || 'flex-start';

      const styleStr = `display:flex;flex-direction:column;justify-content:${vAlign};gap:${gapPx};padding:${padding};${bg}flex:${flex};width:${widthRatio};box-sizing:border-box`;
      return `<div class="be-column" style="${styleStr}">${innerHtml}</div>`;
    }
    case 'columns': {
      const cols = (block.innerBlocks ?? []).map((col) => {
        const innerHtml = (col.innerBlocks ?? []).map(renderBlock).join('');
        return `<div class="be-column" style="display:flex;flex-direction:column;gap:12px;min-width:0;width:100%">${innerHtml}</div>`;
      }).join('');

      const layoutMode = (a.layoutMode as string) || 'grid';
      const flexDirection = (a.flexDirection as string) || 'row';
      const alignItems = (a.alignItems as string) || 'stretch';
      const justifyContent = (a.justifyContent as string) || 'flex-start';
      const flexWrap = (a.flexWrap as string) || 'wrap';
      const gapPx = typeof a.gap === 'number' ? a.gap : (a.gap ? parseInt(String(a.gap), 10) : 24);

      const styleStr = layoutMode === 'flex'
        ? `display:flex;flex-direction:${flexDirection};align-items:${alignItems};justify-content:${justifyContent};flex-wrap:${flexWrap};gap:${gapPx}px;margin:20px 0;width:100%`
        : `display:grid;grid-template-columns:repeat(${a.columns || 2},minmax(0,1fr));gap:${gapPx}px;margin:20px 0;width:100%`;

      return `<div class="be-columns be-columns-grid" style="${styleStr}">${cols}</div>`;
    }
    case 'group': {
      const innerHtml = (block.innerBlocks ?? []).map(renderBlock).join('');
      const bg = a.gradient || (a.backgroundColor as string) || (a.bgImage ? `url('${a.bgImage}') center/cover no-repeat` : undefined);
      const padding = typeof a.padding === 'number' ? `${a.padding}px` : (a.padding as string) || '16px';
      const gapPx = typeof a.gap === 'number' ? `${a.gap}px` : (a.gap as string) || '12px';
      const radius = typeof a.borderRadius === 'number' ? `${a.borderRadius}px` : (a.borderRadius as string) || '16px';
      const borderW = typeof a.borderWidth === 'number' ? `${a.borderWidth}px` : (a.borderWidth as string) || '0px';
      const borderC = (a.borderColor as string) || 'transparent';
      const shadow = (a.shadow as string) || 'none';
      const display = (a.display as string) || 'flex';
      const flexDir = (a.flexDirection as string) || 'column';
      const align = (a.alignItems as string) || 'stretch';
      const justify = (a.justifyContent as string) || 'flex-start';
      const minH = (a.minHeight as string) || 'auto';
      const maxW = (a.maxWidth as string) || '100%';

      const styleStr = [
        'width:100%',
        `max-width:${maxW}`,
        `min-height:${minH}`,
        `padding:${padding}`,
        `gap:${gapPx}`,
        `border-radius:${radius}`,
        borderW !== '0px' ? `border:${borderW} solid ${borderC}` : '',
        bg ? `background:${bg}` : '',
        shadow !== 'none' ? `box-shadow:${shadow}` : '',
        display === 'flex' ? `display:flex;flex-direction:${flexDir};align-items:${align};justify-content:${justify}` : `display:${display}`,
        'box-sizing:border-box'
      ].filter(Boolean).join(';');

      return `<div class="be-group" style="${styleStr}">${innerHtml}</div>`;
    }
    case 'row': {
      const innerHtml = (block.innerBlocks ?? []).map(renderBlock).join('');
      const bg = a.backgroundColor ? `background:${a.backgroundColor};` : '';
      const padding = typeof a.padding === 'number' ? `${a.padding}px` : (a.padding as string) || '16px';
      const gapPx = typeof a.gap === 'number' ? `${a.gap}px` : (a.gap as string) || '20px';
      const radius = typeof a.borderRadius === 'number' ? `${a.borderRadius}px` : (a.borderRadius as string) || '16px';
      const flexDir = (a.flexDirection as string) || 'row';
      const flexWrap = (a.flexWrap as string) || (flexDir === 'row' ? 'nowrap' : 'wrap');
      const align = (a.alignItems as string) || 'stretch';
      const justify = (a.justifyContent as string) || 'flex-start';

      const styleStr = `display:flex;flex-direction:${flexDir};flex-wrap:${flexWrap};align-items:${align};justify-content:${justify};gap:${gapPx};padding:${padding};border-radius:${radius};${bg}width:100%;box-sizing:border-box`;
      return `<div class="be-row" style="${styleStr}">${innerHtml}</div>`;
    }
    case 'stack':
      return `<div class="be-stack" style="display:flex;flex-direction:column;gap:16px;width:100%;max-width:100%">${(block.innerBlocks ?? []).map(renderBlock).join('')}</div>`;
    case 'slider': {
      const slides = (a.slides as any[]) ?? [];
      if (slides.length === 0) return '';

      const layoutWidth = (a.layoutWidth as string) || 'boxed';
      const height = (a.height as string) || '450px';
      const borderRadius = typeof a.borderRadius === 'number' ? `${a.borderRadius}px` : (a.borderRadius as string) || '16px';
      const showArrows = a.showArrows !== false;
      const arrowStyle = (a.arrowStyle as string) || 'glass';
      const showDots = a.showDots !== false;
      const autoplay = Boolean(a.autoplay);
      const autoplayDelay = (a.autoplayDelay as number) || 4000;
      const pauseOnHover = a.pauseOnHover !== false;
      const loop = a.loop !== false;
      const animation = (a.animation as string) || 'slide';
      const layoutStyle = (a.layoutStyle as string) || 'news-caption';
      const textPosition = (a.textPosition as string) || (layoutStyle === 'news-caption' ? 'below-slide' : 'overlay-bottom');
      const navPosition = (a.navPosition as string) || (layoutStyle === 'news-caption' ? 'bottom-right' : 'sides-overlay');
      const showCounter = a.showCounter !== false;
      const containerClass = (a.customCssClass as string) || '';

      const isNewsLayout = layoutStyle === 'news-caption' || textPosition === 'below-slide';
      const sliderId = `be-slider-${Math.random().toString(36).substring(2, 9)}`;

      const slidesHtml = slides.map((slide, idx) => {
        const isVideo = slide.mediaType === 'video' || Boolean(slide.videoUrl);
        const youtubeId = extractYouTubeId(slide.videoUrl || '');
        const vimeoId = extractVimeoId(slide.videoUrl || '');
        const bgImg = slide.imageUrl ? `background-image:url('${slide.imageUrl}');background-size:cover;background-position:center;` : '';
        const bgColor = slide.bgColor || '#1e293b';
        const overlayColor = slide.overlayColor || '#000000';
        const overlayOpacity = typeof slide.overlayOpacity === 'number' ? slide.overlayOpacity / 100 : (!isNewsLayout && slide.imageUrl ? 0.4 : 0);
        const align = slide.align || 'left';

        const alignCss = align === 'left' ? 'text-align:left;align-items:flex-start;margin-right:auto;margin-left:0' : align === 'right' ? 'text-align:right;align-items:flex-end;margin-left:auto;margin-right:0' : 'text-align:center;align-items:center;margin-left:auto;margin-right:auto';

        const hHtml = !slide.hideHeading ? richTextToHtml(typeof slide.heading === 'string' ? [{ text: slide.heading }] : (slide.heading ?? [])) : '';
        const pHtml = !slide.hideParagraph ? richTextToHtml(typeof slide.paragraph === 'string' ? [{ text: slide.paragraph }] : (slide.paragraph ?? [])) : '';
        const btnHtml = !slide.hideButton && slide.buttonText ? `<div style="margin-top:12px"><a href="${escapeHtml(slide.buttonUrl || '#')}" style="display:inline-block;padding:10px 24px;border-radius:12px;background-color:${slide.buttonColor || '#2563eb'};color:${slide.buttonTextColor || '#ffffff'};text-decoration:none;font-weight:600;font-size:14px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">${escapeHtml(slide.buttonText)}</a></div>` : '';

        const overlayHtml = !isNewsLayout && overlayOpacity > 0 ? `<div style="position:absolute;inset:0;background-color:${overlayColor};opacity:${overlayOpacity};pointer-events:none;z-index:0"></div>` : '';

        const transformStyle = animation === 'fade'
          ? `opacity:${idx === 0 ? '1' : '0'};z-index:${idx === 0 ? '10' : '0'};transition:opacity 0.6s ease-in-out`
          : `transform:translateX(${idx === 0 ? '0%' : '100%'});opacity:${idx === 0 ? '1' : '0'};z-index:${idx === 0 ? '10' : '0'};transition:transform 0.6s ease-in-out, opacity 0.6s ease-in-out`;

        let mediaContent = '';
        if (isVideo) {
          if (youtubeId) {
            mediaContent = `<iframe src="https://www.youtube.com/embed/${youtubeId}" style="width:100%;height:100%;border:0" allowfullscreen title="YouTube video"></iframe>`;
          } else if (vimeoId) {
            mediaContent = `<iframe src="https://player.vimeo.com/video/${vimeoId}" style="width:100%;height:100%;border:0" allowfullscreen title="Vimeo video"></iframe>`;
          } else if (slide.videoUrl) {
            mediaContent = `<video src="${escapeHtml(slide.videoUrl)}" controls style="width:100%;height:100%;object-fit:cover"></video>`;
          } else if (slide.imageUrl) {
            mediaContent = `<img src="${escapeHtml(slide.imageUrl)}" style="width:100%;height:100%;object-fit:cover" alt="Slide"/><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3)"><div style="width:56px;height:56px;border-radius:50%;background:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.3)"><svg width="24" height="24" viewBox="0 0 24 24" fill="#111827"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div></div>`;
          }
        }

        const durationBadge = isVideo && slide.videoDuration ? `<div style="position:absolute;bottom:12px;left:12px;background:rgba(0,0,0,0.85);color:#ffffff;font-family:monospace;font-weight:700;font-size:11px;padding:4px 8px;border-radius:6px;z-index:20">${escapeHtml(slide.videoDuration)}</div>` : '';

        return `<div class="be-slide-item" data-slide-index="${idx}" style="position:absolute;inset:0;width:100%;height:100%;background-color:${bgColor};${!isVideo ? bgImg : ''}${transformStyle}">${mediaContent}${durationBadge}${overlayHtml}${!isNewsLayout ? `<div style="position:relative;z-index:1;width:100%;height:100%;max-width:896px;margin:0 auto;padding:32px;display:flex;flex-direction:column;justify-content:flex-end;gap:10px;${alignCss}">${hHtml ? `<div style="font-size:32px;font-weight:800;color:#ffffff;line-height:1.2">${hHtml}</div>` : ''}${pHtml ? `<div style="font-size:16px;color:rgba(255,255,255,0.9);line-height:1.6">${pHtml}</div>` : ''}${btnHtml}</div>` : ''}</div>`;
      }).join('');

      const arrowBtnStyle = arrowStyle === 'rounded'
        ? `width:36px;height:36px;border-radius:8px;background:#ffffff;color:#111827;border:1px solid #e5e7eb;box-shadow:0 2px 4px rgba(0,0,0,0.1);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:16px`
        : `width:36px;height:36px;border-radius:8px;background:rgba(0,0,0,0.4);color:#ffffff;border:1px solid rgba(255,255,255,0.3);backdrop-filter:blur(4px);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:16px`;

      const sidesArrowsHtml = navPosition === 'sides-overlay' && showArrows && slides.length > 1 ? `<button class="be-slider-prev" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);z-index:20;${arrowBtnStyle}" aria-label="Previous Slide">&#10094;</button><button class="be-slider-next" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);z-index:20;${arrowBtnStyle}" aria-label="Next Slide">&#10095;</button>` : '';

      const dotsHtml = showDots && slides.length > 1 && (!isNewsLayout || navPosition !== 'bottom-right') ? `<div class="be-slider-dots" style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:6px">${slides.map((_, i) => `<button class="be-dot" data-dot-index="${i}" style="border-radius:9999px;border:0;cursor:pointer;transition:all 0.3s;${i === 0 ? 'width:20px;height:8px;background:#2563eb;' : 'width:8px;height:8px;background:#cbd5e1;'}" aria-label="Go to slide ${i + 1}"></button>`).join('')}</div>` : '';

      // News & Caption Row Below Slide Frame
      const newsCaptionRowHtml = isNewsLayout ? `<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:16px"><div style="flex:1;min-width:0;font-size:14px;font-weight:500;color:#1e293b" class="be-slide-caption-box"><span class="be-slide-counter" style="font-weight:700;margin-right:6px">${showCounter ? `(1/${slides.length})` : ''}</span><span class="be-slide-title" style="font-weight:600">${slides[0]?.heading ? (typeof slides[0].heading === 'string' ? slides[0].heading : (slides[0].heading[0]?.text || '')) : ''}</span>${slides[0]?.imageCredit ? `<span class="be-slide-credit" style="color:#64748b;font-weight:400;margin-left:6px">(Image Credit: ${escapeHtml(slides[0].imageCredit)})</span>` : ''}</div>${navPosition === 'bottom-right' && showArrows && slides.length > 1 ? `<div style="display:flex;align-items:center;gap:6px;shrink:0"><button class="be-slider-prev" style="${arrowBtnStyle}" aria-label="Previous Slide">&#10094;</button><button class="be-slider-next" style="${arrowBtnStyle}" aria-label="Next Slide">&#10095;</button></div>` : ''}</div>` : '';

      const slidesDataJson = JSON.stringify(slides.map(s => ({
        heading: typeof s.heading === 'string' ? s.heading : (s.heading?.[0]?.text || ''),
        imageCredit: s.imageCredit || ''
      })));

      const script = `<script>(function(){
        var el = document.getElementById('${sliderId}');
        if (!el) return;
        var slides = el.querySelectorAll('.be-slide-item');
        var dots = el.querySelectorAll('.be-dot');
        var prevBtns = el.querySelectorAll('.be-slider-prev');
        var nextBtns = el.querySelectorAll('.be-slider-next');
        var counterEl = el.querySelector('.be-slide-counter');
        var titleEl = el.querySelector('.be-slide-title');
        var creditEl = el.querySelector('.be-slide-credit');
        var slidesData = ${slidesDataJson};
        var current = 0;
        var total = slides.length;
        var timer = null;
        var isHovered = false;
        var anim = '${animation}';
        var isLoop = ${loop};
        var isAutoplay = ${autoplay};
        var delay = ${autoplayDelay};
        var pauseOnHover = ${pauseOnHover};

        function showSlide(idx) {
          if (idx < 0) idx = isLoop ? total - 1 : 0;
          if (idx >= total) idx = isLoop ? 0 : total - 1;
          current = idx;
          slides.forEach(function(s, i) {
            if (i === current) {
              s.style.opacity = '1';
              s.style.zIndex = '10';
              if (anim === 'slide') s.style.transform = 'translateX(0%)';
            } else {
              s.style.opacity = '0';
              s.style.zIndex = '0';
              if (anim === 'slide') s.style.transform = i < current ? 'translateX(-100%)' : 'translateX(100%)';
            }
          });

          if (counterEl) counterEl.textContent = ${showCounter} ? '(' + (current + 1) + '/' + total + ')' : '';
          if (slidesData[current]) {
            if (titleEl) titleEl.textContent = slidesData[current].heading || '';
            if (creditEl) creditEl.textContent = slidesData[current].imageCredit ? '(Image Credit: ' + slidesData[current].imageCredit + ')' : '';
          }

          dots.forEach(function(d, i) {
            d.style.width = i === current ? '20px' : '8px';
            d.style.background = i === current ? '#2563eb' : '#cbd5e1';
          });
        }

        prevBtns.forEach(function(btn){ btn.addEventListener('click', function(e){ e.preventDefault(); showSlide(current - 1); resetTimer(); }); });
        nextBtns.forEach(function(btn){ btn.addEventListener('click', function(e){ e.preventDefault(); showSlide(current + 1); resetTimer(); }); });

        dots.forEach(function(d) {
          d.addEventListener('click', function(e) {
            e.preventDefault();
            var i = parseInt(d.getAttribute('data-dot-index'), 10);
            if (!isNaN(i)) { showSlide(i); resetTimer(); }
          });
        });

        function startTimer() {
          if (!isAutoplay || total <= 1) return;
          stopTimer();
          timer = setInterval(function() {
            if (pauseOnHover && isHovered) return;
            showSlide(current + 1);
          }, delay);
        }

        function stopTimer() { if (timer) clearInterval(timer); }
        function resetTimer() { stopTimer(); startTimer(); }

        if (pauseOnHover) {
          el.addEventListener('mouseenter', function() { isHovered = true; });
          el.addEventListener('mouseleave', function() { isHovered = false; });
        }

        startTimer();
      })();</script>`;

      return `<div id="${sliderId}" class="be-slider-wrapper ${escapeHtml(containerClass)}" style="position:relative;width:100%;max-width:${layoutWidth === 'full' ? '100%' : '1024px'};margin:20px auto"><div class="be-slider-frame" style="position:relative;width:100%;height:${height};border-radius:${borderRadius};overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">${slidesHtml}${sidesArrowsHtml}</div>${newsCaptionRowHtml}${dotsHtml}${script}</div>`;
    }
    case 'spacer':
      return `<div class="be-spacer" style="height:${a.height || 40}px;width:100%" aria-hidden="true"></div>`;
    case 'separator': {
      if (a.style === 'wide') return `<hr style="margin-top:16px;margin-bottom:16px;border:0;border-top:2px solid #cbd5e1"/>`;
      if (a.style === 'dots') return `<div style="margin-top:16px;margin-bottom:16px;text-align:center;color:#94a3b8;letter-spacing:0.25em">· · ·</div>`;
      return `<hr style="margin-top:16px;margin-bottom:16px;border:0;border-top:1px solid #e2e8f0"/>`;
    }
    case 'youtube': {
      const id = extractYouTubeId(a.url as string);
      return id ? `<figure><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0"></iframe></figure>` : '';
    }
    case 'vimeo': {
      const id = extractVimeoId(a.url as string);
      return id ? `<figure><iframe src="https://player.vimeo.com/video/${id}" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0"></iframe></figure>` : '';
    }
    case 'embed': {
      const url = a.url as string;
      if (isTwitterUrl(url)) {
        const tweetUrl = normalizeTwitterUrl(url);
        return `<figure><blockquote class="twitter-tweet"><a href="${escapeHtml(tweetUrl)}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></figure>`;
      }
      if (isInstagramUrl(url)) {
        const cleanUrl = url.split('?')[0].replace(/\/$/, '') + '/';
        const align = (a.align as string) || 'center';
        const flexJustify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
        const marginStyle = align === 'left' ? '1px auto 1px 0' : align === 'right' ? '1px 0 1px auto' : '1px auto';
        return `<figure style="display:flex;justify-content:${flexJustify};margin:16px 0"><blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${escapeHtml(cleanUrl)}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:16px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: ${marginStyle}; max-width:540px; min-width:326px; padding:0; width:99.375%;"><a href="${escapeHtml(cleanUrl)}">View post on Instagram</a></blockquote><script async src="https://www.instagram.com/embed.js"></script></figure>`;
      }
      if (isSpotifyUrl(url)) {
        const spotifyUrl = normalizeSpotifyUrl(url);
        return `<figure style="margin:16px 0"><iframe src="${escapeHtml(spotifyUrl)}" width="100%" height="152" style="border:0;border-radius:12px;" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></figure>`;
      }
      return `<figure><iframe src="${extractEmbedSrc(url)}" style="width:100%;aspect-ratio:16/9;border:0" allowfullscreen></iframe></figure>`;
    }
    case 'table': {
      const rows = a.rows as string[][];
      const hasHeader = Boolean(a.hasHeader);
      const hasFooter = Boolean(a.hasFooter);
      const rowStyles = ensureTableRowStyles(a, rows.length);
      const columnStyles = ensureTableColumnStyles(a, rows[0]?.length ?? 0);
      const cellSpans = (a.cellSpans as Record<string, any>) || {};
      const borderColor = typeof a.borderColor === 'string' && a.borderColor ? a.borderColor : '#d1d5db';
      const borderWidth = typeof a.borderWidth === 'number' ? a.borderWidth : 1;
      const { header, body, footer } = getTableSections(rows, hasHeader, hasFooter);
      const cellStylesMatrix = ensureTableCellStyles(a, rows.length, rows[0]?.length ?? 0);

      const borderCollapse = (a.borderCollapse as string) || 'collapse';
      const tableWidth = (a.tableWidth as string) || '100%';
      const topLeftRadius = (a.borderTopLeftRadius as number) ?? (a.tableBorderRadius as number) ?? 0;
      const topRightRadius = (a.borderTopRightRadius as number) ?? (a.tableBorderRadius as number) ?? 0;
      const bottomLeftRadius = (a.borderBottomLeftRadius as number) ?? (a.tableBorderRadius as number) ?? 0;
      const bottomRightRadius = (a.borderBottomRightRadius as number) ?? (a.tableBorderRadius as number) ?? 0;

      const renderSection = (section: string, sectionRows: string[][], offset: number) => sectionRows.length
        ? `<${section}>${sectionRows.map((row, idx) => {
          const rowIndex = offset + idx;
          const rowStyle = rowStyles[rowIndex] ?? {};
          const rowTag = section === 'thead' ? 'th' : 'td';

          const rowStylesStr = [
            rowStyle.textColor ? `color:${rowStyle.textColor}` : '',
            rowStyle.backgroundColor ? `background-color:${rowStyle.backgroundColor}` : '',
            rowStyle.height ? `height:${rowStyle.height}` : '',
            rowStyle.verticalAlign ? `vertical-align:${rowStyle.verticalAlign}` : '',
          ].filter(Boolean).join(';');
          const cells = Array.isArray(row) ? row : (row && Array.isArray((row as any).cells) ? (row as any).cells : []);

          return `<tr style="${rowStylesStr}">${cells.map((cell: any, colIndex: number) => {
            const spanKey = `${rowIndex},${colIndex}`;
            const span = cellSpans[spanKey];
            if (span?.hidden) return '';

            const columnStyle = columnStyles[colIndex] ?? {};
            const cellStyle = cellStylesMatrix[rowIndex]?.[colIndex] ?? {};

            let cellBg: string | undefined = undefined;
            let cellText: string | undefined = undefined;

            if (cellStyle.backgroundColor) {
              cellBg = cellStyle.backgroundColor;
            } else if (rowStyle.backgroundColor) {
              cellBg = rowStyle.backgroundColor;
            } else if (columnStyle.backgroundColor) {
              cellBg = (section === 'thead' || rowIndex === 0) ? columnStyle.backgroundColor : hexToRgba(columnStyle.backgroundColor, 0.14);
            }

            if (cellStyle.textColor) {
              cellText = cellStyle.textColor;
            } else if (rowStyle.textColor) {
              cellText = rowStyle.textColor;
            } else if (columnStyle.textColor) {
              cellText = columnStyle.textColor;
            }

            const cellFontFamily = cellStyle.fontFamily || rowStyle.fontFamily || columnStyle.fontFamily;
            const cellFontSize = cellStyle.fontSize || rowStyle.fontSize || columnStyle.fontSize;
            const cellFontWeight = cellStyle.fontWeight || rowStyle.fontWeight || columnStyle.fontWeight;
            const cellAlign = cellStyle.align || columnStyle.align || (section === 'thead' ? 'center' : 'left');
            const cellVerticalAlign = cellStyle.verticalAlign || rowStyle.verticalAlign || 'middle';
            const cellPadding = cellStyle.padding || (a.cellPadding ? `${a.cellPadding}px` : '8px');

            const rSpanAttr = span?.rowSpan && span.rowSpan > 1 ? ` rowspan="${span.rowSpan}"` : '';
            const cSpanAttr = span?.colSpan && span.colSpan > 1 ? ` colspan="${span.colSpan}"` : '';

            const cellStylesStr = [
              `border:${cellStyle.borderWidth ?? borderWidth}px solid ${cellStyle.borderColor || borderColor}`,
              `padding:${cellPadding}`,
              `text-align:${cellAlign}`,
              `vertical-align:${cellVerticalAlign}`,
              `word-break:break-word`,
              `overflow-wrap:break-word`,
              `white-space:normal`,
              `min-width:65px`,
              cellBg ? `background-color:${cellBg}` : '',
              cellText ? `color:${cellText}` : '',
              cellFontFamily ? `font-family:${fontFamilyStack(cellFontFamily)}` : '',
              cellFontSize ? `font-size:${cellFontSize}px` : '',
              cellFontWeight ? `font-weight:${cellFontWeight}` : '',
              columnStyle.width ? `width:${columnStyle.width}` : '',
              cellStyle.borderRadius ? `border-radius:${cellStyle.borderRadius}px` : '',
            ].filter(Boolean).join(';');

            return `<${rowTag}${rSpanAttr}${cSpanAttr} style="${cellStylesStr}">${escapeHtml(cell)}</${rowTag}>`;
          }).join('')}</tr>`;
        }).join('')}</${section}>`
        : '';

      const typoStyle = styleObjectToString(getTypographyStyle('table', a));
      const radiiStr = `border-radius:${topLeftRadius}px ${topRightRadius}px ${bottomRightRadius}px ${bottomLeftRadius}px;overflow:hidden;border:1px solid ${borderColor};`;

      return `<div style="${radiiStr}width:${tableWidth};max-width:100%;margin:16px auto;overflow-x:auto;-webkit-overflow-scrolling:touch"><table style="width:100%;text-align:${a.align};${typoStyle ? `${typoStyle};` : ''}border-collapse:${borderCollapse};border-spacing:${borderCollapse === 'separate' ? '4px' : '0'}">${renderSection('thead', header, 0)}${renderSection('tbody', body, hasHeader ? 1 : 0)}${renderSection('tfoot', footer, rows.length - 1)}</table></div>`;
    }
    case 'button': {
      const text = (a.text as string) || 'Button';
      const url = (a.url as string) || '#';
      const align = (a.align as string) || 'left';
      const style = (a.style as string) || 'fill';
      const width = (a.width as string) || 'auto';
      const bgColor = (a.color as string) || '#3b82f6';
      const textColor = (a.textColor as string) || '#ffffff';
      const radius = typeof a.radius === 'number' ? a.radius : 12;
      const target = a.linkTarget === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';

      const flexJustify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
      const widthCss = width === 'auto' ? 'width:auto;' : `width:${width};max-width:100%;text-align:center;box-sizing:border-box;`;

      const btnStyle = style === 'outline'
        ? `display:inline-block;${widthCss}padding:12px 24px;background:transparent;color:${bgColor};border:2px solid ${bgColor};border-radius:${radius}px;text-decoration:none;font-weight:600;font-size:14px;transition:all 0.2s`
        : `display:inline-block;${widthCss}padding:12px 24px;background:${bgColor};color:${textColor};border-radius:${radius}px;text-decoration:none;font-weight:600;font-size:14px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);transition:all 0.2s`;

      return `<div class="be-button-wrapper" style="display:flex;justify-content:${flexJustify};margin:12px 0;width:100%"><a href="${escapeHtml(url)}"${target} class="be-button-link" style="${btnStyle}">${escapeHtml(text)}</a></div>`;
    }
    case 'file': {
      const fileName = (a.fileName as string) || 'Download File';
      const url = (a.url as string) || '#';
      const btnText = (a.buttonText as string) || 'Download';
      return `<div class="be-file" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background-color:#f8fafc;border:1px solid #e2e8f0;margin:16px 0;width:100%;box-sizing:border-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span style="flex:1;min-width:140px;font-size:14px;font-weight:500;color:#1e293b;word-break:break-word">${escapeHtml(fileName)}</span><a href="${escapeHtml(url)}" download class="be-file-btn" style="padding:8px 16px;border-radius:8px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;text-align:center">${escapeHtml(btnText)}</a></div>`;
    }
    case 'html':
      return a.content as string;
    case 'live-updates': {
      const feedTitle = (a.feedTitle as string) || 'Live Updates';
      const isLive = a.isLive !== false;
      const updates = (a.updates as any[]) || [];
      const badge = isLive
        ? `<span style="display:inline-flex;align-items:center;gap:6px;background:#dc2626;color:#ffffff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:900;letter-spacing:0.05em;text-transform:uppercase;"><span style="width:7px;height:7px;background:#ffffff;border-radius:50%;display:inline-block;"></span>LIVE COVERAGE</span>`
        : `<span style="background:#6b7280;color:#ffffff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:700;">CONCLUDED</span>`;

      const itemsHtml = updates.map((u) => {
        const pinHtml = u.isPinned ? `<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;border:1px solid #fde68a;">📌 PINNED</span>` : '';
        const timeHtml = u.time ? `<span style="color:#6b7280;font-size:13px;font-weight:500;">${escapeHtml(u.time)}</span>` : '';
        const alignJustify = u.mediaAlign === 'left' ? 'flex-start' : u.mediaAlign === 'right' ? 'flex-end' : 'center';
        const mediaMaxWidth = u.mediaAlign === 'left' || u.mediaAlign === 'right' ? '75%' : '100%';

        let mediaHtml = '';
        const embedList = extractEmbedList(u.embedCodes || u.embedCode);
        if (embedList.length > 0) {
          const embedsHtml = embedList.map((rawEmbed) => {
            const raw = (rawEmbed || '').trim();
            if (isTwitterUrl(raw)) {
              const tweetUrl = normalizeTwitterUrl(raw);
              const twAlign = u.mediaAlign === 'left' ? 'left' : u.mediaAlign === 'right' ? 'right' : 'center';
              return `<div style="max-width:550px;width:100%;margin-bottom:12px;"><blockquote class="twitter-tweet" data-align="${twAlign}"><a href="${escapeHtml(tweetUrl)}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script></div>`;
            } else if (isInstagramUrl(raw)) {
              const igEmbedUrl = normalizeInstagramUrl(raw);
              return `<div style="max-width:540px;width:100%;min-height:600px;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);margin-bottom:16px;"><iframe src="${escapeHtml(igEmbedUrl)}" width="100%" height="680" style="border:0;width:100%;height:680px;overflow:hidden;" allowtransparency="true" allowfullscreen scrolling="no"></iframe></div>`;
            } else if (isSpotifyUrl(raw)) {
              const spotifyUrl = normalizeSpotifyUrl(raw);
              return `<div style="max-width:560px;width:100%;margin-bottom:12px;"><iframe src="${escapeHtml(spotifyUrl)}" width="100%" height="152" style="border:0;border-radius:12px;" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>`;
            } else {
              const src = extractEmbedSrc(raw);
              return `<div style="max-width:580px;width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#000;box-shadow:0 2px 6px rgba(0,0,0,0.15);margin-bottom:12px;">
                <iframe src="${escapeHtml(src)}" style="width:100%;height:100%;border:0;" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
              </div>`;
            }
          }).join('\n');

          mediaHtml = `<div style="display:flex;flex-direction:column;align-items:${alignJustify};margin-top:10px;width:100%;">
            ${embedsHtml}
          </div>`;
        } else if (u.mediaUrl) {
          if (u.mediaType === 'pdf') {
            mediaHtml = `<div style="display:flex;justify-content:${alignJustify};margin-top:10px;width:100%;">
              <div style="max-width:680px;width:100%;border:1px solid #fecaca;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);box-sizing:border-box;">
                <div style="background:linear-gradient(to right, #fef2f2, #ffffff);padding:10px 14px;border-bottom:1px solid #fee2e2;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                  <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                    <div style="width:32px;height:32px;border-radius:8px;background:#dc2626;color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:10px;letter-spacing:0.05em;flex-shrink:0;">PDF</div>
                    <div style="min-width:0;flex:1;">
                      <div style="font-size:13px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(u.mediaFileName || 'Document.pdf')}</div>
                      <div style="font-size:10px;color:#dc2626;font-weight:600;">PDF Document ${u.mediaFileSize ? `· <span style="color:#6b7280">${escapeHtml(u.mediaFileSize)}</span>` : ''}</div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <a href="${escapeHtml(u.mediaUrl)}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;background:#f3f4f6;color:#374151;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;">Open</a>
                    <a href="${escapeHtml(u.mediaUrl)}" download="${escapeHtml(u.mediaFileName || 'document.pdf')}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;background:#dc2626;color:#ffffff;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">Download</a>
                  </div>
                </div>
                <div style="width:100%;height:480px;background:#f9fafb;">
                  <iframe src="${escapeHtml(u.mediaUrl)}#toolbar=0&navpanes=0" title="${escapeHtml(u.mediaFileName || 'PDF Preview')}" style="width:100%;height:100%;border:0;background:#ffffff;"></iframe>
                </div>
              </div>
            </div>`;
          } else if (u.mediaType === 'video') {
            mediaHtml = `<div style="display:flex;justify-content:${alignJustify};margin-top:10px;width:100%;"><div style="max-width:${mediaMaxWidth};width:100%;border-radius:12px;overflow:hidden;background:#000;"><video src="${escapeHtml(u.mediaUrl)}" controls playsinline style="width:100%;height:auto;max-height:540px;display:block;margin:0 auto;border-radius:12px;"></video></div></div>`;
          } else {
            mediaHtml = `<div style="display:flex;justify-content:${alignJustify};margin-top:10px;width:100%;"><div style="max-width:${mediaMaxWidth};width:100%;border-radius:12px;overflow:hidden;"><img src="${escapeHtml(u.mediaUrl)}" alt="${escapeHtml(u.title || '')}" style="width:100%;height:auto;max-height:600px;object-fit:contain;display:block;border-radius:12px;" /></div></div>`;
          }
        }

        return `<div style="position:relative;margin-bottom:24px;text-align:left;">
          <span style="position:absolute;left:-28px;top:4px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:2px solid #ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.1);display:inline-block;"></span>
          <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:#111827;line-height:1.35;text-align:left;">${escapeHtml(u.title || '')}</h3>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;text-align:left;">
            ${pinHtml}
            ${timeHtml}
          </div>
          ${u.content && u.content.trim() !== u.embedCode?.trim() && u.content.trim() !== u.mediaUrl?.trim() ? `<p style="margin:0 0 10px 0;font-size:14px;line-height:1.65;color:#374151;white-space:pre-wrap;text-align:left;">${escapeHtml(u.content)}</p>` : ''}
          ${mediaHtml}
        </div>`;
      }).join('\n');

      return `<div class="be-live-updates-feed" style="border:1px solid #e5e7eb;border-radius:16px;padding:16px 18px;margin:20px 0;background:#ffffff;box-sizing:border-box;max-width:100%;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;margin-bottom:18px;border-bottom:1px solid #f3f4f6;padding-bottom:12px;">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;flex:1;min-width:180px;">
            ${badge}
            <h2 style="margin:0;font-size:17px;font-weight:900;color:#111827;line-height:1.3;">${escapeHtml(feedTitle)}</h2>
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
      const activeMode = (block.attributes.mode as string) || 'tally-bar';
      const totalSeats = Number(block.attributes.totalSeats) || 182;
      const majoritySeats = Number(block.attributes.majoritySeats) || 92;
      const isLive = block.attributes.isLive !== false;
      const parties = (block.attributes.parties as any[]) || [];
      const battle = (block.attributes.battle as any) || {};
      const widgetId = `election_${block.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const countedSeats = parties.reduce((sum, p) => sum + (Number(p.lead) || 0) + (Number(p.won) || 0), 0);
      const counted = countedSeats;

      const badge = isLive
        ? `<span style="background:#dc2626;color:#ffffff;padding:3px 9px;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">● LIVE TRENDS</span>`
        : `<span style="background:#059669;color:#ffffff;padding:3px 9px;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;white-space:nowrap;">✓ FINAL RESULTS</span>`;

      // 1. CANDIDATE BATTLE HTML
      const battlesList: any[] = Array.isArray(block.attributes.battles) && block.attributes.battles.length > 0
        ? block.attributes.battles
        : [
            {
              constituency: battle.constituency || 'Ghatlodia / ઘાટલોડિયા (અમદાવાદ)',
              roundInfo: battle.roundInfo || 'Round 8 of 14 Completed',
              candidates: Array.isArray(battle.candidates) && battle.candidates.length > 0
                ? battle.candidates
                : [
                    { name: battle.candidate1?.name || 'Candidate 1', party: battle.candidate1?.party || 'BJP', color: battle.candidate1?.color || '#f97316', photoUrl: battle.candidate1?.photoUrl || '', votes: Number(battle.candidate1?.votes) || 84520 },
                    { name: battle.candidate2?.name || 'Candidate 2', party: battle.candidate2?.party || 'INC', color: battle.candidate2?.color || '#0284c7', photoUrl: battle.candidate2?.photoUrl || '', votes: Number(battle.candidate2?.votes) || 60170 }
                  ]
            }
          ];

      const battleHtml = battlesList.map((bItem, bIdx) => {
        const rawCandidates: any[] = bItem.candidates || [];
        const maxVotes = Math.max(...rawCandidates.map((c) => Number(c.votes) || 0));
        const sortedVotes = [...rawCandidates.map((c) => Number(c.votes) || 0)].sort((x, y) => y - x);
        const secondMax = sortedVotes[1] || 0;
        const leadMargin = maxVotes - secondMax;

        const candCardsHtml = rawCandidates.map((c) => {
          const candVotes = Number(c.votes) || 0;
          const computedLeading = maxVotes > 0 && candVotes === maxVotes;
          const currentStatus = c.statusOverride || (computedLeading ? 'leading' : 'trailing');
          const isLeading = currentStatus === 'leading' || currentStatus === 'won';
          const photoHtml = c.photoUrl
            ? `<img src="${escapeHtml(c.photoUrl)}" alt="${escapeHtml(c.name)}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;border:1.5px solid ${isLeading ? '#10b981' : '#cbd5e1'};flex-shrink:0;" />`
            : `<div style="width:40px;height:40px;border-radius:10px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;color:#64748b;flex-shrink:0;">👤</div>`;

          let statusBadgeHtml = '';
          if (currentStatus === 'won') {
            statusBadgeHtml = `<span style="display:inline-flex;align-items:center;height:20px;background:#f59e0b;color:#fff;padding:0 6px;border-radius:6px;font-size:9px;font-weight:900;">🏆 WON</span>`;
          } else if (currentStatus === 'leading') {
            statusBadgeHtml = `<span style="display:inline-flex;align-items:center;height:20px;background:#10b981;color:#fff;padding:0 6px;border-radius:6px;font-size:9px;font-weight:900;">● LEADING</span>`;
          } else if (currentStatus === 'lost') {
            statusBadgeHtml = `<span style="display:inline-flex;align-items:center;height:20px;background:#e11d48;color:#fff;padding:0 6px;border-radius:6px;font-size:9px;font-weight:900;">LOST</span>`;
          } else {
            statusBadgeHtml = `<span style="display:inline-flex;align-items:center;height:20px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:0 6px;border-radius:6px;font-size:9px;font-weight:900;">TRAILING</span>`;
          }

          return `<div style="border:${isLeading ? '2px solid #10b981;background:#ffffff;' : '1px solid #e2e8f0;background:#ffffff;'}border-radius:12px;padding:10px;box-sizing:border-box;">
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
              ${photoHtml}
              <div style="min-width:0;flex:1;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
                  <span style="display:inline-flex;align-items:center;gap:4px;height:20px;background:#f1f5f9;border:1px solid #e2e8f0;padding:0 6px;border-radius:6px;font-size:9.5px;font-weight:900;color:#0f172a;">
                    <span style="width:7px;height:7px;border-radius:9999px;background:${c.color || '#f97316'};display:inline-block;"></span>
                    ${escapeHtml(c.party || '')}
                  </span>
                  ${statusBadgeHtml}
                </div>
                <div style="font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.name || '')}</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding-top:6px;font-size:11px;">
              <div style="color:#64748b;font-weight:700;">Votes: <strong style="color:#0f172a;font-size:12px;">${candVotes.toLocaleString()}</strong></div>
              <div style="text-align:right;">
                ${isLeading && leadMargin > 0
                  ? `<span style="color:#059669;font-weight:900;background:#ecfdf5;padding:1px 5px;border-radius:4px;font-size:10px;">+${leadMargin.toLocaleString()} Lead</span>`
                  : !isLeading && maxVotes > candVotes
                  ? `<span style="color:#dc2626;font-weight:700;background:#fef2f2;padding:1px 5px;border-radius:4px;font-size:10px;">-${(maxVotes - candVotes).toLocaleString()} Behind</span>`
                  : ''
                }
              </div>
            </div>
          </div>`;
        }).join('\n');

        return `
          <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:12px;background:#f8fafc;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:6px;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="background:#4f46e5;color:#fff;font-size:10px;font-weight:900;padding:2px 6px;border-radius:4px;">VIP</span>
                <strong style="font-size:14px;color:#0f172a;">${escapeHtml(bItem.constituency || `Ward #${bIdx + 1}`)}</strong>
              </div>
              <span style="font-size:11px;color:#64748b;font-weight:600;">${escapeHtml(bItem.roundInfo || 'Counting in progress')}</span>
            </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                ${candCardsHtml}
              </div>
            </div>
          `;
        }).join('\n');

        const renderExportedChart = (chartType: string) => {
          if (chartType === 'donut') {
            let currentAngle = -Math.PI / 2;
            const cx = 150;
            const cy = 150;
            const rOut = 120;
            const rIn = 70;

            const paths = activeParties.map((p) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              if (total <= 0) return '';
              const span = (total / (totalSeats || 182)) * (2 * Math.PI);
              const startA = currentAngle;
              const endA = currentAngle + span;
              currentAngle = endA;

              const x1 = cx + rOut * Math.cos(startA);
              const y1 = cy + rOut * Math.sin(startA);
              const x2 = cx + rOut * Math.cos(endA);
              const y2 = cy + rOut * Math.sin(endA);
              const x3 = cx + rIn * Math.cos(endA);
              const y3 = cy + rIn * Math.sin(endA);
              const x4 = cx + rIn * Math.cos(startA);
              const y4 = cy + rIn * Math.sin(startA);

              const largeArc = span > Math.PI ? 1 : 0;
              const d = `M ${x1},${y1} A ${rOut},${rOut} 0 ${largeArc},1 ${x2},${y2} L ${x3},${y3} A ${rIn},${rIn} 0 ${largeArc},0 ${x4},${y4} Z`;
              return `<path d="${d}" fill="${p.color}" stroke="#ffffff" stroke-width="2" />`;
            }).join('\n');

            return `
              <div style="text-align:center;">
                <svg viewBox="0 0 300 300" style="max-width:200px;width:100%;height:auto;margin:0 auto;display:block;">
                  ${paths}
                  <circle cx="150" cy="150" r="66" fill="#ffffff" />
                  <text x="150" y="142" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a" font-family="sans-serif">${countedSeats}</text>
                  <text x="150" y="162" text-anchor="middle" font-size="10" font-weight="700" fill="#94a3b8" font-family="sans-serif">of ${totalSeats} Declared</text>
                </svg>
              </div>
            `;
          } else if (chartType === 'pie') {
            let currentAngle = -Math.PI / 2;
            const cx = 150;
            const cy = 150;
            const r = 120;

            const paths = activeParties.map((p) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              if (total <= 0) return '';
              const span = (total / (totalSeats || 182)) * (2 * Math.PI);
              const startA = currentAngle;
              const endA = currentAngle + span;
              currentAngle = endA;

              const x1 = cx + r * Math.cos(startA);
              const y1 = cy + r * Math.sin(startA);
              const x2 = cx + r * Math.cos(endA);
              const y2 = cy + r * Math.sin(endA);

              const largeArc = span > Math.PI ? 1 : 0;
              const d = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
              return `<path d="${d}" fill="${p.color}" stroke="#ffffff" stroke-width="2" />`;
            }).join('\n');

            return `
              <div style="text-align:center;">
                <svg viewBox="0 0 300 300" style="max-width:200px;width:100%;height:auto;margin:0 auto;display:block;">
                  ${paths}
                </svg>
              </div>
            `;
          } else if (chartType === 'bar') {
            const barWidth = Math.min(44, (280 / activeParties.length) - 12);
            const gap = (280 - barWidth * activeParties.length) / (activeParties.length + 1);
            const majY = 140 - (majoritySeats / (totalSeats || 182)) * 120;

            const bars = activeParties.map((p, idx) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              const barHeight = Math.max(4, (total / (totalSeats || 182)) * 120);
              const x = 45 + gap + idx * (barWidth + gap);
              const y = 140 - barHeight;

              return `
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${p.color}" rx="6" />
                <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" fill="#0f172a" font-size="10" font-weight="900" font-family="sans-serif">${total}</text>
                <text x="${x + barWidth / 2}" y="156" text-anchor="middle" fill="#475569" font-size="9.5" font-weight="700" font-family="sans-serif">${escapeHtml(p.shortName)}</text>
              `;
            }).join('\n');

            return `
              <div style="text-align:center;">
                <svg viewBox="0 0 340 180" style="max-width:380px;width:100%;height:auto;margin:0 auto;display:block;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                  <line x1="40" y1="20" x2="330" y2="20" stroke="#e2e8f0" stroke-dasharray="3,3" />
                  <line x1="40" y1="60" x2="330" y2="60" stroke="#e2e8f0" stroke-dasharray="3,3" />
                  <line x1="40" y1="100" x2="330" y2="100" stroke="#e2e8f0" stroke-dasharray="3,3" />
                  <line x1="40" y1="140" x2="330" y2="140" stroke="#cbd5e1" stroke-width="1.5" />
                  <line x1="40" y1="${majY}" x2="330" y2="${majY}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,4" />
                  <text x="330" y="${majY - 4}" text-anchor="end" fill="#f59e0b" font-size="8.5" font-weight="900" font-family="sans-serif">Majority (${majoritySeats})</text>
                  ${bars}
                </svg>
              </div>
            `;
          } else if (chartType === 'horizontal-bar') {
            const hBars = activeParties.map((p) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              const pct = totalSeats > 0 ? ((total / totalSeats) * 100).toFixed(1) : '0';
              const isMajority = total >= majoritySeats;

              return `
                <div style="margin-bottom:8px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;font-weight:700;margin-bottom:3px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
                      <span>${escapeHtml(p.shortName)}</span>
                      ${isMajority ? `<span style="font-size:8.5px;background:#f59e0b;color:#fff;padding:1px 4px;border-radius:3px;">WIN</span>` : ''}
                    </div>
                    <div><strong>${total}</strong> <span style="color:#94a3b8;font-weight:normal;font-size:10px;">(${pct}%)</span></div>
                  </div>
                  <div style="width:100%;height:10px;background:#f1f5f9;border-radius:9999px;overflow:hidden;">
                    <div style="width:${Math.min(100, (total / (totalSeats || 182)) * 100)}%;height:100%;background:${p.color};border-radius:9999px;"></div>
                  </div>
                </div>
              `;
            }).join('\n');

            return `<div style="max-width:380px;margin:0 auto;">${hBars}</div>`;
          } else if (chartType === 'stacked-bar') {
            const segments = activeParties.map((p) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              const width = totalSeats > 0 ? (total / totalSeats) * 100 : 0;
              if (width <= 0) return '';
              return `<div style="width:${width}%;background:${p.color};height:100%;color:#fff;font-weight:900;font-size:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${width >= 10 ? `${escapeHtml(p.shortName)} ${total}` : ''}</div>`;
            }).join('\n');

            const majLeft = (majoritySeats / (totalSeats || 182)) * 100;

            return `
              <div style="max-width:380px;margin:0 auto;position:relative;padding-top:18px;">
                <div style="position:absolute;top:0;left:${majLeft}%;transform:translateX(-50%);text-align:center;">
                  <span style="background:#f59e0b;color:#fff;font-size:8px;font-weight:900;padding:1px 4px;border-radius:3px;">Maj (${majoritySeats})</span>
                  <div style="width:2px;height:34px;background:#f59e0b;margin:0 auto;"></div>
                </div>
                <div style="width:100%;height:30px;background:#f1f5f9;border-radius:8px;overflow:hidden;display:flex;border:1px solid #e2e8f0;">
                  ${segments}
                </div>
              </div>
            `;
          } else if (chartType === 'line') {
            const polylines = activeParties.map((p) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              const p1 = 150 - ((total * 0.25) / (totalSeats || 182)) * 130;
              const p2 = 150 - ((total * 0.55) / (totalSeats || 182)) * 130;
              const p3 = 150 - ((total * 0.8) / (totalSeats || 182)) * 130;
              const p4 = 150 - (total / (totalSeats || 182)) * 130;
              const points = `45,${p1} 130,${p2} 220,${p3} 310,${p4}`;

              return `
                <polyline fill="none" stroke="${p.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
                <circle cx="310" cy="${p4}" r="4" fill="${p.color}" stroke="#ffffff" stroke-width="2" />
                <text x="310" y="${p4 - 6}" text-anchor="middle" fill="#0f172a" font-size="9" font-weight="900">${total}</text>
              `;
            }).join('\n');

            return `
              <div style="text-align:center;">
                <svg viewBox="0 0 340 180" style="max-width:380px;width:100%;height:auto;margin:0 auto;display:block;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                  <line x1="30" y1="30" x2="330" y2="30" stroke="#e2e8f0" stroke-dasharray="3,3" />
                  <line x1="30" y1="80" x2="330" y2="80" stroke="#e2e8f0" stroke-dasharray="3,3" />
                  <line x1="30" y1="130" x2="330" y2="130" stroke="#e2e8f0" stroke-dasharray="3,3" />
                  <line x1="30" y1="150" x2="330" y2="150" stroke="#cbd5e1" stroke-width="1.5" />
                  ${polylines}
                  <text x="45" y="165" text-anchor="middle" fill="#94a3b8" font-size="8">R1</text>
                  <text x="130" y="165" text-anchor="middle" fill="#94a3b8" font-size="8">R5</text>
                  <text x="220" y="165" text-anchor="middle" fill="#94a3b8" font-size="8">R10</text>
                  <text x="310" y="165" text-anchor="middle" fill="#94a3b8" font-size="8">Now</text>
                </svg>
              </div>
            `;
          } else if (chartType === 'area') {
            const gradients = activeParties.map((p) => `
              <linearGradient id="area_grad_exp_${p.id}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${p.color}" stop-opacity="0.6" />
                <stop offset="100%" stop-color="${p.color}" stop-opacity="0.05" />
              </linearGradient>
            `).join('\n');

            const curves = activeParties.map((p) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              const yPeak = 150 - (total / (totalSeats || 182)) * 125;
              const d = `M 30,150 C 90,140 120,${yPeak} 180,${yPeak} C 240,${yPeak} 270,145 330,150 Z`;

              return `
                <path d="${d}" fill="url(#area_grad_exp_${p.id})" />
                <path d="M 30,150 C 90,140 120,${yPeak} 180,${yPeak} C 240,${yPeak} 270,145 330,150" fill="none" stroke="${p.color}" stroke-width="2.5" />
                <circle cx="180" cy="${yPeak}" r="4" fill="${p.color}" stroke="#ffffff" stroke-width="2" />
                <text x="180" y="${yPeak - 6}" text-anchor="middle" fill="#0f172a" font-size="9" font-weight="900">${escapeHtml(p.shortName)} (${total})</text>
              `;
            }).join('\n');

            return `
              <div style="text-align:center;">
                <svg viewBox="0 0 340 180" style="max-width:380px;width:100%;height:auto;margin:0 auto;display:block;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                  <defs>${gradients}</defs>
                  <line x1="30" y1="150" x2="330" y2="150" stroke="#cbd5e1" stroke-width="1.5" />
                  ${curves}
                </svg>
              </div>
            `;
          } else if (chartType === 'gauge') {
            const leader = [...parties].sort((a, b) => ((Number(b.lead) || 0) + (Number(b.won) || 0)) - ((Number(a.lead) || 0) + (Number(a.won) || 0)))[0];
            const leaderTotal = leader ? (Number(leader.lead) || 0) + (Number(leader.won) || 0) : 0;
            const ratio = Math.min(1, Math.max(0, leaderTotal / (totalSeats || 182)));
            const needleAngle = Math.PI - ratio * Math.PI;
            const nx = 150 + 80 * Math.cos(needleAngle);
            const ny = 150 - 80 * Math.sin(needleAngle);

            const majRatio = Math.min(1, Math.max(0, majoritySeats / (totalSeats || 182)));
            const majAngle = Math.PI - majRatio * Math.PI;
            const mx = 150 + 105 * Math.cos(majAngle);
            const my = 150 - 105 * Math.sin(majAngle);

            return `
              <div style="text-align:center;">
                <svg viewBox="0 0 300 165" style="max-width:240px;width:100%;height:auto;margin:0 auto;display:block;">
                  <path d="M 35,150 A 115,115 0 0,1 265,150" fill="none" stroke="#e2e8f0" stroke-width="24" stroke-linecap="round" />
                  ${leader ? `<path d="M 35,150 A 115,115 0 0,1 ${150 + 115 * Math.cos(needleAngle)},${150 - 115 * Math.sin(needleAngle)}" fill="none" stroke="${leader.color}" stroke-width="24" stroke-linecap="round" />` : ''}
                  <line x1="${mx}" y1="${my}" x2="${150 + 125 * Math.cos(majAngle)}" y2="${150 - 125 * Math.sin(majAngle)}" stroke="#f59e0b" stroke-width="3" />
                  <line x1="150" y1="150" x2="${nx}" y2="${ny}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
                  <circle cx="150" cy="150" r="7" fill="#0f172a" />
                  <text x="150" y="115" text-anchor="middle" font-size="18" font-weight="900" fill="#0f172a" font-family="sans-serif">${leader ? `${escapeHtml(leader.shortName)}: ${leaderTotal}` : 'No Data'}</text>
                  <text x="150" y="135" text-anchor="middle" font-size="9.5" font-weight="700" fill="#94a3b8" font-family="sans-serif">${leaderTotal >= majoritySeats ? `🏆 Majority Won (+${leaderTotal - majoritySeats})` : `${majoritySeats - leaderTotal} to Majority`}</text>
                </svg>
              </div>
            `;
          } else if (chartType === 'table') {
            const rows = parties.map((p) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              const share = totalSeats > 0 ? ((total / totalSeats) * 100).toFixed(1) : '0';

              return `
                <tr style="border-bottom:1px solid #f1f5f9;font-size:11px;">
                  <td style="padding:6px 8px;font-weight:700;display:flex;align-items:center;gap:4px;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
                    <span>${escapeHtml(p.shortName)}</span>
                  </td>
                  <td style="padding:6px 8px;text-align:center;color:#475569;">${p.lead}</td>
                  <td style="padding:6px 8px;text-align:center;color:#059669;font-weight:700;">${p.won}</td>
                  <td style="padding:6px 8px;text-align:center;font-weight:900;color:#0f172a;">${total}</td>
                  <td style="padding:6px 8px;text-align:center;color:#64748b;">${share}%</td>
                </tr>
              `;
            }).join('\n');

            return `
              <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;">
                <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
                  <thead style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#475569;">
                    <tr>
                      <th style="padding:6px 8px;">Party</th>
                      <th style="padding:6px 8px;text-align:center;">Lead</th>
                      <th style="padding:6px 8px;text-align:center;">Won</th>
                      <th style="padding:6px 8px;text-align:center;">Total</th>
                      <th style="padding:6px 8px;text-align:center;">Share</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            `;
          } else {
            // Default: parliament-arch
            let currentAngle = Math.PI;
            const radius = 120;
            const cx = 150;
            const cy = 150;
            const paths = activeParties.map((p) => {
              const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
              if (total <= 0) return '';
              const angleSpan = (total / totalSeats) * Math.PI;
              const startA = currentAngle;
              const endA = currentAngle - angleSpan;
              currentAngle = endA;
              const x1 = cx + radius * Math.cos(startA);
              const y1 = cy - radius * Math.sin(startA);
              const x2 = cx + radius * Math.cos(endA);
              const y2 = cy - radius * Math.sin(endA);
              return `<path d="M ${x1},${y1} A ${radius},${radius} 0 0,1 ${x2},${y2}" fill="none" stroke="${p.color}" stroke-width="28" stroke-linecap="butt" />`;
            }).join('\n');

            return `
              <div style="text-align:center;">
                <svg viewBox="0 0 300 160" style="max-width:280px;width:100%;height:auto;margin:0 auto;display:block;">
                  <path d="M 30,150 A 120,120 0 0,1 270,150" fill="none" stroke="#e2e8f0" stroke-width="28" stroke-linecap="round" />
                  ${paths}
                  <text x="150" y="125" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a" font-family="sans-serif">${totalSeats}</text>
                  <text x="150" y="145" text-anchor="middle" font-size="10" font-weight="700" fill="#94a3b8" font-family="sans-serif">Total Seats</text>
                </svg>
              </div>
            `;
          }
        };

        const activeParties = parties.filter((p) => ((Number(p.lead) || 0) + (Number(p.won) || 0)) > 0);
        const rawCharts = (block.attributes.charts as string[]) || (block.attributes.chartType ? [block.attributes.chartType as string] : ['parliament-arch']);
        const chartsList = rawCharts.length > 0 ? rawCharts : ['parliament-arch'];
        const chartsHtml = chartsList.map((cType) => `
          <div style="padding:14px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-sizing:border-box;">
            ${renderExportedChart(cType)}
          </div>
        `).join('\n');
        const legends = parties.map((p) => {
          const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
          const pct = totalSeats > 0 ? ((total / totalSeats) * 100).toFixed(1) : '0';
          return `<div style="display:flex;align-items:center;gap:5px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:11px;font-weight:700;">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
            <span>${escapeHtml(p.shortName)}:</span>
            <strong>${total}</strong>
            <span style="color:#94a3b8;font-weight:normal;">(${pct}%)</span>
          </div>`;
        }).join('\n');
        const archHtml = `
          <div style="display:grid;grid-template-columns:${chartsList.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))'};gap:14px;margin-bottom:14px;">
            ${chartsHtml}
          </div>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">${legends}</div>
        `;

        const shareRows = parties.map((p) => {
          const share = Number(p.voteSharePercent) || 0;
          return `<div style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#ffffff;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:12px;font-weight:700;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
                <span>${escapeHtml(p.name)} (${escapeHtml(p.shortName)})</span>
              </div>
              <strong style="font-size:13px;color:#0f172a;">${share}%</strong>
            </div>
            <div style="height:7px;background:#f1f5f9;border-radius:9999px;overflow:hidden;">
              <div style="height:100%;background:${p.color};width:${Math.min(100, share)}%;"></div>
            </div>
          </div>`;
        }).join('\n');
        const shareHtml = `<div style="max-width:600px;margin:0 auto;">${shareRows}</div>`;

        const segments = parties.map((p) => {
          const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
          const pct = totalSeats > 0 ? (total / totalSeats) * 100 : 0;
          if (pct <= 0) return '';
          return `<div style="width:${pct}%;background:${p.color};height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:11px;overflow:hidden;box-sizing:border-box;">
            ${pct >= 14 ? `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 3px;">${escapeHtml(p.shortName)} ${total}</span>` : ''}
          </div>`;
        }).join('\n');
        const cards = parties.map((p) => {
          const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
          const isMaj = total >= majoritySeats;
          return `<div style="border:${isMaj ? '2px solid #fbbf24;background:#fffbeb;' : '1px solid #e2e8f0;background:#ffffff;'}border-radius:12px;padding:10px 12px;box-sizing:border-box;min-width:0;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <div style="display:flex;align-items:center;gap:5px;min-width:0;">
                <span style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0;"></span>
                <span style="font-weight:900;font-size:13px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.shortName)}</span>
              </div>
              ${isMaj ? `<span style="font-size:10px;">🏆</span>` : ''}
            </div>
            <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:4px;line-height:1.1;">${total}</div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;border-top:1px solid #f1f5f9;padding-top:4px;">
              <span>Lead: <strong style="color:#0f172a;">${p.lead || 0}</strong></span>
              <span style="color:#059669;font-weight:700;">Won: ${p.won || 0}</span>
            </div>
          </div>`;
        }).join('\n');
        const safeLeft = Math.min(88, Math.max(12, totalSeats > 0 ? (majoritySeats / totalSeats) * 100 : 50));
        const tallyHtml = `
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;margin-bottom:12px;font-size:11px;color:#64748b;">
            <span>Declared / Trends: <strong style="color:#0f172a;">${counted} / ${totalSeats}</strong></span>
            <span style="background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:9999px;font-weight:700;">Majority: ${majoritySeats}</span>
          </div>
          <div style="position:relative;margin:22px 0 16px 0;">
            <div style="position:absolute;top:-18px;left:${safeLeft}%;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;align-items:center;pointer-events:none;">
              <span style="background:#0f172a;color:#ffffff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:4px;white-space:nowrap;">Majority: ${majoritySeats}</span>
            </div>
            <div style="height:32px;border-radius:8px;overflow:hidden;display:flex;background:#f1f5f9;border:1px solid #cbd5e1;box-sizing:border-box;">
              ${segments}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:8px;">
            ${cards}
          </div>
        `;

        return `
          <div id="${widgetId}" class="be-election-widget" style="border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin:20px 0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.05);box-sizing:border-box;max-width:100%;">
            <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;margin-bottom:16px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;flex:1;min-width:180px;">
                ${badge}
                <h2 style="margin:0;font-size:17px;font-weight:900;color:#0f172a;line-height:1.3;">${escapeHtml(title)}</h2>
              </div>
              <div style="display:flex;align-items:center;background:#f1f5f9;border-radius:10px;padding:3px;gap:2px;overflow-x:auto;">
                <button type="button" onclick="switchElectionTab('${widgetId}', 'tally-bar')" data-tab="tally-bar" style="padding:4px 10px;font-size:11.5px;font-weight:700;border-radius:7px;border:none;cursor:pointer;transition:all 0.2s ease;${activeMode === 'tally-bar' ? 'background:#ffffff;color:#4f46e5;box-shadow:0 1px 2px rgba(0,0,0,0.08);' : 'background:transparent;color:#64748b;'}">📊 Chart</button>
                <button type="button" onclick="switchElectionTab('${widgetId}', 'parliament-arch')" data-tab="parliament-arch" style="padding:4px 10px;font-size:11.5px;font-weight:700;border-radius:7px;border:none;cursor:pointer;transition:all 0.2s ease;${activeMode === 'parliament-arch' ? 'background:#ffffff;color:#4f46e5;box-shadow:0 1px 2px rgba(0,0,0,0.08);' : 'background:transparent;color:#64748b;'}">🏛️ Arch</button>
                <button type="button" onclick="switchElectionTab('${widgetId}', 'candidate-battle')" data-tab="candidate-battle" style="padding:4px 10px;font-size:11.5px;font-weight:700;border-radius:7px;border:none;cursor:pointer;transition:all 0.2s ease;${activeMode === 'candidate-battle' ? 'background:#ffffff;color:#4f46e5;box-shadow:0 1px 2px rgba(0,0,0,0.08);' : 'background:transparent;color:#64748b;'}">👥 Battle</button>
                <button type="button" onclick="switchElectionTab('${widgetId}', 'vote-share')" data-tab="vote-share" style="padding:4px 10px;font-size:11.5px;font-weight:700;border-radius:7px;border:none;cursor:pointer;transition:all 0.2s ease;${activeMode === 'vote-share' ? 'background:#ffffff;color:#4f46e5;box-shadow:0 1px 2px rgba(0,0,0,0.08);' : 'background:transparent;color:#64748b;'}">🧱 Share %</button>
              </div>
            </div>
            <div id="${widgetId}_tab_tally-bar" class="election-tab-panel" style="display:${activeMode === 'tally-bar' ? 'block' : 'none'};">${tallyHtml}</div>
            <div id="${widgetId}_tab_parliament-arch" class="election-tab-panel" style="display:${activeMode === 'parliament-arch' ? 'block' : 'none'};">${archHtml}</div>
            <div id="${widgetId}_tab_candidate-battle" class="election-tab-panel" style="display:${activeMode === 'candidate-battle' ? 'block' : 'none'};">${battleHtml}</div>
            <div id="${widgetId}_tab_vote-share" class="election-tab-panel" style="display:${activeMode === 'vote-share' ? 'block' : 'none'};">${shareHtml}</div>
            <script>
              (function() {
                window.switchElectionTab = window.switchElectionTab || function(wId, targetMode) {
                  var widget = document.getElementById(wId);
                  if (!widget) return;
                  var panels = widget.querySelectorAll('.election-tab-panel');
                  panels.forEach(function(p) { p.style.display = 'none'; });
                  var targetP = document.getElementById(wId + '_tab_' + targetMode);
                  if (targetP) targetP.style.display = 'block';
                  var btns = widget.querySelectorAll('button[data-tab]');
                  btns.forEach(function(b) {
                    if (b.getAttribute('data-tab') === targetMode) {
                      b.style.background = '#ffffff';
                      b.style.color = '#4f46e5';
                      b.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
                    } else {
                      b.style.background = 'transparent';
                      b.style.color = '#64748b';
                      b.style.boxShadow = 'none';
                    }
                  });
                };
              })();
            </script>
          </div>
        `;
    }
    case 'poll': {
      const question = (block.attributes.question as string) || '';
      const description = (block.attributes.description as string) || '';
      const isClosed = Boolean(block.attributes.isClosed);
      const options = (block.attributes.options as Array<{ id: string; text: string; votes: number; color: string }>) || [];

      if (!question && options.length === 0) {
        return '';
      }

      const totalVotes = options.reduce((sum, opt) => sum + (Number(opt.votes) || 0), 0);
      const pollId = `poll_${block.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const optionsHtml = options.map((opt) => {
        const votes = Number(opt.votes) || 0;
        const pct = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';

        return `
          <div
            class="poll-option"
            data-opt-id="${opt.id}"
            data-votes="${votes}"
            data-color="${opt.color}"
            ${isClosed ? '' : `onclick="handlePollVote('${pollId}', '${opt.id}')"`}
            style="position:relative;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:10px;padding:12px 14px;cursor:${isClosed ? 'default' : 'pointer'};background:${isClosed ? '#f8fafc' : '#ffffff'};overflow:hidden;transition:all 0.2s ease;box-sizing:border-box;"
          >
            <div class="poll-bar" style="position:absolute;top:0;bottom:0;left:0;width:${pct}%;background:${opt.color};opacity:${isClosed ? '0.18' : '0.14'};transition:width 0.5s ease;pointer-events:none;"></div>
            <div style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;z-index:2;">
              <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
                ${isClosed ? `<span style="width:8px;height:8px;border-radius:50%;background:${opt.color};flex-shrink:0;"></span>` : `<span class="poll-radio" style="width:16px;height:16px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-sizing:border-box;background:transparent;"></span>`}
                <span style="font-size:13px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(opt.text)}</span>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <span class="poll-votes-text" style="font-size:12px;font-weight:900;color:#0f172a;">${votes} Votes</span>
                <span class="poll-pct-text" style="font-size:11px;font-weight:700;color:#64748b;margin-left:2px;">(${pct}%)</span>
              </div>
            </div>
          </div>
        `;
      }).join('\n');

      return `
        <div id="${pollId}" class="be-poll-widget" style="border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin:20px 0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.05);box-sizing:border-box;max-width:100%;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:10.5px;font-weight:900;text-transform:uppercase;color:#4f46e5;background:#eef2ff;padding:3px 8px;border-radius:6px;">🗳️ Poll & Voting</span>
              ${isClosed ? `<span style="font-size:10px;font-weight:900;color:#e11d48;background:#ffe4e6;padding:2px 7px;border-radius:6px;">🔴 Poll Closed</span>` : ''}
            </div>
            <span class="poll-total-votes" style="font-size:11px;font-weight:700;color:#64748b;">Total: <strong>${totalVotes}</strong> votes</span>
          </div>

          ${isClosed ? `<div style="margin-bottom:12px;padding:8px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;font-size:11.5px;font-weight:700;color:#92400e;">⚠️ આ મતદાન પૂર્ણ થયેલ છે. આખરી પરિણામ નીચે મુજબ છે.</div>` : ''}

          <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:900;color:#0f172a;line-height:1.3;">${escapeHtml(question)}</h3>
          ${description ? `<p style="margin:0 0 14px 0;font-size:12px;color:#64748b;">${escapeHtml(description)}</p>` : '<div style="margin-bottom:14px;"></div>'}

          <div class="poll-options-container">
            ${optionsHtml}
          </div>

          <script>
            (function() {
              window.handlePollVote = window.handlePollVote || function(pId, optId) {
                var pollEl = document.getElementById(pId);
                if (!pollEl) return;
                var options = pollEl.querySelectorAll('.poll-option');
                var prevVote = pollEl.getAttribute('data-voted-id');
                var total = 0;

                options.forEach(function(opt) {
                  var id = opt.getAttribute('data-opt-id');
                  var v = parseInt(opt.getAttribute('data-votes') || '0', 10);
                  if (id === optId) {
                    if (prevVote !== optId) v += 1;
                  } else if (prevVote === id) {
                    v = Math.max(0, v - 1);
                  }
                  opt.setAttribute('data-votes', v);
                  total += v;
                });

                pollEl.setAttribute('data-voted-id', optId);
                var totalEl = pollEl.querySelector('.poll-total-votes strong');
                if (totalEl) totalEl.textContent = total;

                options.forEach(function(opt) {
                  var id = opt.getAttribute('data-opt-id');
                  var v = parseInt(opt.getAttribute('data-votes') || '0', 10);
                  var pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                  var bar = opt.querySelector('.poll-bar');
                  if (bar) bar.style.width = pct + '%';
                  var vText = opt.querySelector('.poll-votes-text');
                  if (vText) vText.textContent = v + ' Votes';
                  var pText = opt.querySelector('.poll-pct-text');
                  if (pText) pText.textContent = '(' + pct + '%)';
                  var radio = opt.querySelector('.poll-radio');
                  if (radio) {
                    if (id === optId) {
                      radio.style.borderColor = '#4f46e5';
                      radio.style.backgroundColor = '#4f46e5';
                      radio.innerHTML = '<span style="color:#fff;font-size:10px;line-height:1;">✓</span>';
                      opt.style.borderColor = '#6366f1';
                    } else {
                      radio.style.borderColor = '#cbd5e1';
                      radio.style.backgroundColor = 'transparent';
                      radio.innerHTML = '';
                      opt.style.borderColor = '#e2e8f0';
                    }
                  }
                });
              };
            })();
          </script>
        </div>
      `;
    }
    default:
      return '';
  }
}

export function blocksToHtml(blocks: BlockInstance[]): string {
  return blocks.map(renderBlock).join('\n');
}

function getGoogleFontsLink(blocks: BlockInstance[]): string {
  const fontSet = new Set<string>();

  const collect = (list: BlockInstance[]) => {
    list.forEach((b) => {
      if (b.attributes?.fontFamily) {
        fontSet.add(b.attributes.fontFamily as string);
      }
      if (b.innerBlocks) {
        collect(b.innerBlocks);
      }
    });
  };

  collect(blocks);

  const googleFonts = Array.from(fontSet).filter(
    (f) => f && f !== 'system' && f !== 'arial' && f !== 'times' && f !== 'georgia' && f !== 'courier' && f !== 'verdana' && f !== 'tahoma'
  );

  if (googleFonts.length === 0) return '';

  const familiesParam = googleFonts
    .map((f) => `family=${encodeURIComponent(f.replace(/["']/g, ''))}:wght@300;400;500;600;700;800`)
    .join('&');

  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${familiesParam}&display=swap" rel="stylesheet">`;
}

export function exportHtml(blocks: BlockInstance[], documentTitle?: string): string {
  const fontsLink = getGoogleFontsLink(blocks);
  const css = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
      padding: clamp(12px, 3vw, 24px);
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      overflow-x: hidden;
      box-sizing: border-box;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      font-weight: 600;
      line-height: 1.3;
    }
    h1 { font-size: clamp(28px, 5vw, 56px); line-height: 1.15; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
    h2 { font-size: clamp(24px, 4vw, 42px); line-height: 1.2; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
    h3 { font-size: clamp(20px, 3vw, 32px); line-height: 1.25; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
    h4 { font-size: clamp(18px, 2.5vw, 24px); line-height: 1.3; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
    h5 { font-size: clamp(16px, 2vw, 20px); line-height: 1.35; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
    h6 { font-size: clamp(14px, 1.5vw, 16px); line-height: 1.4; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
    p { font-size: clamp(14px, 1.8vw, 18px); line-height: 1.65; margin-bottom: 1rem; width: 100%; max-width: 100%; }
    ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
    li { margin-bottom: 0.5rem; }
    pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin-bottom: 1rem;
      font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    code {
      font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    }
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 1rem;
      margin-left: 0;
      margin-bottom: 1rem;
      color: #6b7280;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 0.75rem;
      text-align: left;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0;
    }
    video, iframe {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
      margin: 0.75rem 0;
    }
    a {
      color: #3b82f6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    strong {
      font-weight: 600;
    }
    em {
      font-style: italic;
    }

    /* 2 Columns Equal 50% / 50% Split */
    @media (min-width: 641px) {
      .be-columns-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 20px !important;
        align-items: center !important;
      }
    }

    /* Gallery Grid Responsive Breakpoints & Full Width Image Scaling */
    .be-gallery-grid, .be-gallery-masonry, .be-gallery-item {
      width: 100% !important;
      max-width: 100% !important;
    }

    .be-gallery-grid img, .be-gallery-item img {
      width: 100% !important;
      max-width: 100% !important;
      display: block !important;
    }

    @media (min-width: 641px) and (max-width: 1024px) {
      .be-gallery-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .be-gallery-masonry {
        column-count: 2 !important;
      }
    }
    @media (max-width: 640px) {
      .be-gallery-grid {
        grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
      }
      .be-gallery-masonry {
        column-count: 1 !important;
      }
    }
    @media (max-width: 640px) {
      body { padding: 0.75rem; }
      .be-columns-grid, .be-columns-wrapper, .be-columns {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        width: 100% !important;
        gap: 16px !important;
        padding: 16px !important;
        border-radius: 16px !important;
      }
      .be-column {
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .be-paragraph, h1, h2, h3, h4, h5, h6, p {
        width: 100% !important;
      }
      .be-cover {
        padding: 20px 16px !important;
        min-height: 240px !important;
        border-radius: 16px !important;
        text-align: center !important;
      }
      .be-button-wrapper, .be-button {
        width: 100% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        margin-top: 12px !important;
        text-align: center !important;
      }
      .be-button-link, .be-button input {
        width: auto !important;
        max-width: 100% !important;
        display: inline-block !important;
        margin: 0 auto !important;
        text-align: center !important;
      }
    }

    /* Slider Responsive Frame Heights & Caption Rows */
    @media (min-width: 641px) and (max-width: 1024px) {
      .be-slider-frame {
        height: 330px !important;
      }
    }

    @media (max-width: 640px) {
      .be-slider-wrapper {
        width: 100% !important;
        max-width: 100% !important;
      }

      .be-slider-frame {
        height: 240px !important;
      }

      .be-slider-caption-row {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 8px !important;
      }

      .be-slider-nav-arrows {
        align-self: flex-end !important;
        margin-top: 4px;
      }

      .be-row {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
        width: 100% !important;
      }

      .be-row > .be-column {
        width: 100% !important;
        flex: 1 1 100% !important;
      }

      .be-group, .be-stack {
        width: 100% !important;
        max-width: 100% !important;
      }

      .be-spacer {
        max-height: 24px !important;
      }
    }

    @media (max-width: 480px) {
      .be-slider-frame {
        max-height: 280px !important;
        min-height: 180px !important;
      }
      .be-slider-caption-row {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 8px !important;
      }
      .be-slider-nav-arrows {
        align-self: flex-end !important;
        margin-top: 4px;
      }
      .be-table-wrapper td, .be-table-wrapper th {
        padding: 5px 6px !important;
        font-size: 11px !important;
      }
    }
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(documentTitle || 'Exported Content')}</title>
  ${fontsLink}
  <style>
${css}
  </style>
</head>
<body>
${blocksToHtml(blocks)}
</body>
</html>`;
}
