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

function extractEmbedSrc(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const srcMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  if (srcMatch?.[1]) return srcMatch[1];
  const dataSrcMatch = trimmed.match(/<iframe[^>]*\sdata-src=["']([^"']+)["'][^>]*>/i);
  if (dataSrcMatch?.[1]) return dataSrcMatch[1];
  return trimmed;
}

function renderBlock(block: BlockInstance): string {
  const a = block.attributes;
  switch (block.type) {
    case 'paragraph':
      return `<p style="text-align:${a.align};${styleObjectToString(getTypographyStyle('paragraph', a))}">${richTextToHtml(a.content as RichTextValue, true)}</p>`;
    case 'heading':
      return `<h${a.level} style="text-align:${a.align};${styleObjectToString(getTypographyStyle('heading', a))}">${richTextToHtml(a.content as RichTextValue)}</h${a.level}>`;
    case 'list': {
      const isChecklist = a.style === 'checklist';
      const tag = a.style === 'bullet' || isChecklist ? 'ul' : 'ol';
      const listStyleBase = listStyleCss(a.style as string);

      const items = (a.items as { content: RichTextValue; level?: number; checked?: boolean }[]).map((item) => {
        const itemLevel = item.level || 0;
        const marginLeft = itemLevel > 0 ? `margin-left:${itemLevel * 20}px;` : '';

        if (isChecklist) {
          const checkedAttr = item.checked ? 'checked' : '';
          const lineThrough = item.checked ? 'text-decoration:line-through;opacity:0.6;' : '';
          return `<li style="list-style-type:none;${marginLeft}margin-bottom:6px;display:flex;align-items:flex-start;gap:8px"><input type="checkbox" ${checkedAttr} disabled style="margin-top:4px" /><span style="${lineThrough}">${richTextToHtml(item.content)}</span></li>`;
        }

        const currentListStyle = itemLevel > 0
          ? (a.style === 'bullet' ? (itemLevel % 2 === 1 ? 'circle' : 'square') : (itemLevel % 2 === 1 ? 'lower-alpha' : 'lower-roman'))
          : listStyleBase;

        return `<li style="list-style-type:${currentListStyle};${marginLeft}margin-bottom:6px">${richTextToHtml(item.content)}</li>`;
      }).join('');

      return `<${tag} style="padding-left:24px;text-align:${a.align};${styleObjectToString(getTypographyStyle('list', a))}">${items}</${tag}>`;
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
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        width: 100% !important;
        gap: 16px !important;
        padding: 16px !important;
        border-radius: 16px !important;
      }
      .be-column {
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
      }
      .be-paragraph, h1, h2, h3, h4, h5, h6, p {
        width: 100% !important;
        text-align: center !important;
        margin-left: auto !important;
        margin-right: auto !important;
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
