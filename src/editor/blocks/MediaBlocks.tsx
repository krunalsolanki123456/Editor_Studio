import { useRef, useState } from 'react';
import { Upload, Link as LinkIcon, X, Plus } from 'lucide-react';
import RichText from '../RichText';
import { useEditorStore } from '../store';
import { fileToDataUrl } from '../media';
import type { BlockInstance, RichTextValue, TextAlign } from '../types';
import BlockWrapper from '../BlockWrapper';
import { NestedBlockContext } from '../NestedBlockContext';
import { extractYouTubeId, extractVimeoId } from '../exporter';
import { ImageCropModal } from './ImageCropModal';
import { useResponsive } from '../responsive';
import {
  MediaPanel,
  mediaInputClassName,
  mediaPrimaryButtonClassName,
  mediaSecondaryButtonClassName,
  mediaSurfaceClassName,
} from './MediaUi';

import { toResponsiveFontSize } from '../typography';

interface BlockProps {
  block: BlockInstance;
  selected?: boolean;
}

function alignClass(align: TextAlign): string {
  return align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : '';
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

function FigureCaption({
  value, onChange, placeholder = 'Write caption…', style,
}: {
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
  placeholder?: string;
  style?: Record<string, any>;
}) {
  const safeValue = Array.isArray(value)
    ? value
    : typeof value === 'string' && (value as string).trim()
      ? [{ text: value }]
      : [];
  const inlineStyles: React.CSSProperties = style ? {
    marginTop: style.marginTop ?? 8,
    marginBottom: style.marginBottom,
    padding: style.padding,
    textAlign: style.align || 'center',
    fontFamily: style.fontFamily ? style.fontFamily : undefined,
    fontSize: toResponsiveFontSize(style.fontSize) || (style.fontSize ? `${style.fontSize}px` : undefined),
    fontWeight: style.bold || style.fontWeight === 'bold' || style.fontWeight === 700 ? 'bold' : (style.fontWeight ?? 'normal'),
    fontStyle: style.italic ? 'italic' : undefined,
    textDecoration: [style.underline ? 'underline' : '', style.strikethrough ? 'line-through' : '', style.textDecoration || ''].filter(Boolean).join(' ') || undefined,
    color: style.textColor,
    backgroundColor: style.backgroundColor,
  } : {};

  return (
    <RichText
      value={safeValue}
      onChange={onChange}
      placeholder={placeholder}
      className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400"
      tagName="figcaption"
      style={inlineStyles}
    />
  );
}

function MediaPicker({
  onUpload, onUrl, accept, label,
}: {
  onUpload: (dataUrl: string) => void;
  onUrl: (url: string) => void;
  accept: string;
  label: string;
}) {
  const [mode, setMode] = useState<'menu' | 'upload' | 'url'>('menu');
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (mode === 'menu') {
    return (
      <MediaPanel
        icon={<Upload size={22} />}
        title={`Add ${label}`}
        description="Upload a file or insert a direct URL."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setMode('upload')}
            className="flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/15"
          >
            <Upload size={18} /> Upload file
          </button>
          <button
            onClick={() => setMode('url')}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <LinkIcon size={18} /> Use URL
          </button>
        </div>
        <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
          Supported source: {accept.replace('/*', ' files')}.
        </p>
      </MediaPanel>
    );
  }

  if (mode === 'upload') {
    return (
      <div
        onClick={() => fileRef.current?.click()}
        className="group cursor-pointer overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center transition-colors hover:border-primary-400 hover:bg-primary-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-500/50 dark:hover:bg-primary-500/5"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-1 ring-primary-100 transition-transform group-hover:scale-105 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-500/20">
          <Upload size={28} />
        </div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Click to upload {label.toLowerCase()}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Your file will be inserted directly into the block.</p>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const dataUrl = await fileToDataUrl(file);
              onUpload(dataUrl);
            }
          }}
        />
      </div>
    );
  }

  return (
    <MediaPanel
      icon={<LinkIcon size={22} />}
      title={`Insert ${label} from URL`}
      description="Paste a direct file link and insert it into the block."
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = url.trim();
              if (value) onUrl(value);
            }
          }}
          placeholder="Paste URL…"
          className={mediaInputClassName}
        />
        <button
          onClick={() => {
            const value = url.trim();
            if (value) onUrl(value);
          }}
          className={mediaPrimaryButtonClassName}
          disabled={!url.trim()}
        >
          Insert
        </button>
      </div>
      <button
        onClick={() => setMode('menu')}
        className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Back
      </button>
    </MediaPanel>
  );
}

export function ImageBlock({ block, selected = false }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const url = a.url as string;
  const originalUrl = (a.originalUrl as string) || url;
  const isCropping = Boolean(a.isCropping);

  if (!url) {
    return (
      <div className="be-image">
        <MediaPicker
          accept="image/*"
          label="an image"
          onUpload={(dataUrl) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: dataUrl, originalUrl: dataUrl } }))}
          onUrl={(u) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: u, originalUrl: u } }))}
        />
      </div>
    );
  }

  const align = (a.align as TextAlign) || 'center';
  const alignWrapperClass = align === 'left'
    ? 'mr-auto ml-0 items-start'
    : align === 'right'
      ? 'ml-auto mr-0 items-end'
      : 'mx-auto items-center';

  const aspectRatioRaw = String(a.aspectRatio || 'auto');
  const aspectRatioCss = (aspectRatioRaw !== 'auto' && aspectRatioRaw !== 'original')
    ? aspectRatioRaw.replace(':', '/')
    : undefined;

  const widthCss = (a.width as string) || '100%';
  const heightCss = (a.height as string) || 'auto';
  const objectFitCss = (a.objectFit as React.CSSProperties['objectFit']) || 'cover';

  const radiusNum = typeof a.borderRadius === 'number' ? a.borderRadius : parseInt(String(a.borderRadius || 0), 10);
  const borderRadiusCss = isNaN(radiusNum) ? (a.borderRadius as string) || '0px' : `${radiusNum}px`;

  const shadowClassMap: Record<string, string> = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
  };
  const shadowClass = shadowClassMap[(a.shadow as string) || 'none'] || '';

  const opacityVal = typeof a.opacity === 'number' ? a.opacity / 100 : 1;
  const linkUrl = (a.link as string) || '';
  const linkTarget = (a.linkTarget as string) || '_blank';
  const lazyLoad = Boolean(a.lazyLoad);

  const captionStyle = (a.captionStyle as Record<string, any>) || {};

  const imageContent = (
    <img
      src={url}
      alt={(a.alt as string) || ''}
      loading={lazyLoad ? 'lazy' : 'eager'}
      className="block max-w-full w-full h-full transition-opacity"
      style={{
        width: widthCss === 'auto' ? 'auto' : '100%',
        height: heightCss === 'auto' ? '100%' : heightCss,
        objectFit: objectFitCss,
        borderRadius: borderRadiusCss,
        opacity: opacityVal,
      }}
    />
  );

  return (
    <div className={`w-full flex ${align === 'left' ? 'justify-start text-left' : align === 'right' ? 'justify-end text-right' : 'justify-center text-center'}`}>
      <figure
        className={`be-image flex flex-col ${alignWrapperClass}`}
        style={{
          width: widthCss === 'auto' ? 'fit-content' : widthCss,
          maxWidth: '100%',
        }}
      >
        <div
          className={`overflow-hidden border bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 ${shadowClass} transition-all ${
            selected
              ? 'ring-2 ring-blue-600 dark:ring-blue-500 border-blue-600 dark:border-blue-500 shadow-lg ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
              : 'border-gray-200/80 dark:border-gray-700'
          }`}
          style={{
            borderRadius: borderRadiusCss,
            width: widthCss === 'auto' ? 'fit-content' : '100%',
            height: heightCss !== 'auto' ? heightCss : undefined,
            aspectRatio: aspectRatioCss,
          }}
        >
          {linkUrl ? (
            <a
              href={linkUrl}
              target={linkTarget}
              rel="noopener noreferrer"
              onClick={(e) => e.preventDefault()}
              className="block w-full h-full cursor-pointer"
              title={`Link: ${linkUrl}`}
            >
              {imageContent}
            </a>
          ) : (
            imageContent
          )}
        </div>

        {a.showCaption !== false && (selected || hasCaptionText(a.caption as RichTextValue)) && (
          <figcaption className="w-full relative z-10" onClick={(e) => e.stopPropagation()}>
            <FigureCaption
              value={a.caption as RichTextValue}
              onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, caption: v } }))}
              style={captionStyle}
            />
          </figcaption>
        )}

        {/* Visual Crop Modal Launcher */}
        {isCropping && (
          <ImageCropModal
            imageUrl={originalUrl}
            onCrop={(croppedDataUrl: string) => {
              updateBlock(block.id, (b) => ({
                ...b,
                attributes: {
                  ...b.attributes,
                  url: croppedDataUrl,
                  isCropping: false,
                },
              }));
            }}
            onReset={() => {
              updateBlock(block.id, (b) => ({
                ...b,
                attributes: {
                  ...b.attributes,
                  url: b.attributes.originalUrl || url,
                  isCropping: false,
                },
              }));
            }}
            onClose={() => {
              updateBlock(block.id, (b) => ({
                ...b,
                attributes: { ...b.attributes, isCropping: false },
              }));
            }}
          />
        )}
      </figure>
    </div>
  );
}

export function GalleryBlock({ block }: BlockProps) {
  const { getResponsiveCols } = useResponsive();
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const images = (a.images as any[]) ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');

  const selectedImageIndex = typeof a.selectedImageIndex === 'number' && a.selectedImageIndex >= 0 && a.selectedImageIndex < images.length ? a.selectedImageIndex : null;

  const addImages = (urls: string[]) => {
    const newImgs = urls.map((u) => ({ url: u, alt: '' }));
    updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, images: [...((b.attributes.images as any[]) ?? []), ...newImgs] } }));
  };

  const cols = (a.columns as number) || 3;
  const gap = typeof a.gap === 'number' ? `${a.gap}px` : (a.gap as string) || '12px';
  const layoutType = (a.layoutType as string) || 'grid';
  const showCaptions = a.showCaptions !== false;
  const borderRadius = typeof a.borderRadius === 'number' ? `${a.borderRadius}px` : (a.borderRadius as string) || '12px';
  const borderColor = (a.borderColor as string) || 'transparent';
  const borderWidth = typeof a.borderWidth === 'number' ? `${a.borderWidth}px` : (a.borderWidth as string) || '0px';

  if (images.length === 0) {
    return (
      <div className="be-gallery">
        {urlMode ? (
          <MediaPanel
            icon={<LinkIcon size={22} />}
            title="Add gallery images from URLs"
            description="Paste direct image URLs (one URL per line or separated by commas)."
          >
            <div className="space-y-3">
              <textarea
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={'Paste image URLs here (one URL per line or separated by commas)…\nhttps://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
                rows={4}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-xs font-mono text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const parsed = url
                      .split(/[\n,]+/)
                      .map((u) => u.trim())
                      .filter((u) => u.length > 0);
                    if (parsed.length > 0) {
                      addImages(parsed);
                      setUrl('');
                      setUrlMode(false);
                    }
                  }}
                  className={mediaPrimaryButtonClassName}
                  disabled={!url.trim()}
                >
                  {(() => {
                    const count = url.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean).length;
                    return count > 1 ? `Add ${count} Images` : 'Add Image';
                  })()}
                </button>
                <button
                  type="button"
                  onClick={() => setUrlMode(false)}
                  className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Back
                </button>
              </div>
            </div>
          </MediaPanel>
        ) : (
          <MediaPanel
            icon={<Upload size={22} />}
            title="Add gallery images"
            description="Upload multiple images or insert direct image URLs."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/15 cursor-pointer"
              >
                <Upload size={18} /> Upload images
              </button>
              <button
                type="button"
                onClick={() => setUrlMode(true)}
                className={mediaSecondaryButtonClassName}
              >
                <LinkIcon size={18} /> Add URLs
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                const urls = await Promise.all(files.map(fileToDataUrl));
                addImages(urls);
              }}
            />
          </MediaPanel>
        )}
      </div>
    );
  }

  const responsiveCols = getResponsiveCols(cols);

  return (
    <figure
      className="be-gallery relative transition-all w-full max-w-full"
      style={{
        marginTop: a.marginTop ? `${a.marginTop}px` : undefined,
        marginBottom: a.marginBottom ? `${a.marginBottom}px` : undefined,
        padding: a.padding ? `${a.padding}px` : undefined,
      }}
      onClick={(e) => {
        // Deselect single image when clicking background of gallery
        if (e.target === e.currentTarget) {
          updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, selectedImageIndex: null } }));
        }
      }}
    >
      <div
        className={layoutType === 'masonry' ? 'columns-1 sm:columns-2 md:columns-3 lg:columns-4' : 'grid'}
        style={
          layoutType === 'masonry'
            ? { columnGap: gap }
            : { gridTemplateColumns: `repeat(${responsiveCols}, minmax(0, 1fr))`, gap }
        }
      >
        {images.map((img: any, i: number) => {
          const isSelected = selectedImageIndex === i;
          const imgObj = typeof img === 'string' ? { url: img } : (img || {});

          return (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                updateBlock(block.id, (b) => ({
                  ...b,
                  attributes: { ...b.attributes, selectedImageIndex: i },
                }));
              }}
              className={`group relative overflow-hidden transition-all cursor-pointer ${layoutType === 'masonry' ? 'mb-3 break-inside-avoid' : ''
                } ${isSelected
                  ? 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900 scale-[1.02] z-20 shadow-xl'
                  : 'hover:ring-2 hover:ring-primary-400/60'
                }`}
              style={{
                borderRadius: imgObj.borderRadius ? `${imgObj.borderRadius}px` : borderRadius,
                borderColor: imgObj.borderColor || borderColor,
                borderWidth: imgObj.borderWidth ? `${imgObj.borderWidth}px` : borderWidth,
                borderStyle: 'solid',
                opacity: typeof imgObj.opacity === 'number' ? imgObj.opacity / 100 : 1,
              }}
            >
              <img
                src={imgObj.url}
                alt={imgObj.alt || ''}
                className="w-full h-full block"
                style={{
                  objectFit: (imgObj.objectFit as any) || (a.cropImages ? 'cover' : 'contain'),
                  aspectRatio: imgObj.aspectRatio || (a.imageRatio && a.imageRatio !== 'original' ? String(a.imageRatio).replace(':', '/') : undefined),
                }}
              />

              {/* Show Captions */}
              {showCaptions && (imgObj.caption || isSelected) && (
                <div className="absolute bottom-0 inset-x-0 p-2 bg-black/60 backdrop-blur-xs text-white text-xs text-center truncate">
                  {imgObj.caption || 'Image caption…'}
                </div>
              )}

              {/* Delete Button overlay on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateBlock(block.id, (b) => {
                    const list = [...((b.attributes.images as any[]) ?? [])];
                    list.splice(i, 1);
                    return {
                      ...b,
                      attributes: {
                        ...b.attributes,
                        images: list,
                        selectedImageIndex: b.attributes.selectedImageIndex === i ? null : b.attributes.selectedImageIndex,
                      },
                    };
                  });
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 hover:bg-red-600 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md cursor-pointer z-30"
                title="Delete Image"
              >
                <X size={13} />
              </button>

              {/* Selected Badge */}
              {isSelected && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary-600 text-white font-bold text-[10px] shadow-md uppercase tracking-wider">
                  Selected
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/50 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add files
          </button>
          <button
            type="button"
            onClick={() => setUrlMode(!urlMode)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/50 transition-colors cursor-pointer"
          >
            <LinkIcon size={14} /> Add via URL
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            const urls = await Promise.all(files.map(fileToDataUrl));
            addImages(urls);
          }}
        />

        {selectedImageIndex !== null && (
          <button
            type="button"
            onClick={() => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, selectedImageIndex: null } }))}
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
          >
            Deselect image
          </button>
        )}
      </div>

      {urlMode && (
        <div className="mt-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 space-y-3">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            Paste image URLs (one URL per line or separated by commas):
          </p>
          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
            rows={3}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const parsed = url
                  .split(/[\n,]+/)
                  .map((u) => u.trim())
                  .filter((u) => u.length > 0);
                if (parsed.length > 0) {
                  addImages(parsed);
                  setUrl('');
                  setUrlMode(false);
                }
              }}
              className={mediaPrimaryButtonClassName}
              disabled={!url.trim()}
            >
              {(() => {
                const count = url.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean).length;
                return count > 1 ? `Add ${count} Images` : 'Add Image';
              })()}
            </button>
            <button
              type="button"
              onClick={() => setUrlMode(false)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </figure>
  );
}

export function CoverBlock({ block }: BlockProps) {
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const inner = (block.innerBlocks ?? []).filter(
    (b) => b.type === 'heading' || b.type === 'paragraph'
  );

  const { getResponsiveHeight } = useResponsive();
  const url = (a.url as string) || '';
  const overlayOpacity = typeof a.overlayOpacity === 'number' ? a.overlayOpacity / 100 : (typeof a.overlay === 'number' ? a.overlay / 100 : 0.5);
  const overlayColor = (a.overlayColor as string) || '#000000';
  const rawMinHeight = (a.minHeight as string) || '450px';
  const effectiveMinHeight = getResponsiveHeight(rawMinHeight, '220px', '320px');
  const contentWidth = (a.contentWidth as string) || '800px';

  const verticalAlign = (a.verticalAlign as string) || 'center';
  const horizontalAlign = (a.horizontalAlign as string) || 'center';

  const bgSize = (a.backgroundSize as string) || 'cover';
  const bgRepeat = (a.backgroundRepeat as string) || 'no-repeat';
  const bgAttachment = (a.backgroundAttachment as string) || 'scroll';
  const focal = (a.focalPoint as { x: number; y: number }) || { x: 50, y: 50 };

  const flexVerticalClass =
    verticalAlign === 'top'
      ? 'items-start'
      : verticalAlign === 'bottom'
        ? 'items-end'
        : 'items-center';

  const flexHorizontalClass =
    horizontalAlign === 'left'
      ? 'justify-start text-left'
      : horizontalAlign === 'right'
        ? 'justify-end text-right'
        : 'justify-center text-center';

  const supportedNestedBlocks = [
    { type: 'heading', label: 'Heading' },
    { type: 'paragraph', label: 'Paragraph' },
  ];

  return (
    <div
      id={(a.customId as string) || undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectBlock(block.id);
        }
      }}
      className={`be-cover relative rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg flex ${flexVerticalClass} ${flexHorizontalClass} p-3 sm:p-5 transition-all cursor-pointer ${(a.customCssClass as string) || ''}`}
      style={{
        minHeight: effectiveMinHeight,
      }}
    >
      {/* Background Image & Overlay Layer */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0"
        style={{
          backgroundImage: url ? `url('${url}')` : undefined,
          backgroundColor: !url ? (a.backgroundColor as string) || '#1e293b' : undefined,
          backgroundSize: bgSize,
          backgroundPosition: `${focal.x}% ${focal.y}%`,
          backgroundRepeat: bgRepeat,
          backgroundAttachment: bgAttachment,
        }}
      >
        <div
          className="absolute inset-0 transition-opacity"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          }}
        />
      </div>

      {/* Inner Content Area */}
      <div
        className="relative z-10 w-full transition-all"
        style={{ maxWidth: contentWidth }}
      >
        <NestedBlockContext.Provider value={{ isNested: true, isCover: true }}>
          {inner.length > 0 ? (
            <div className="space-y-4">
              {inner.map((b, idx) => (
                <BlockWrapper key={b.id} block={b} index={idx} total={inner.length} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs font-medium border border-dashed border-white/40 rounded-xl bg-black/20 text-white/90">
              Empty Cover Block. Click below to add content.
            </div>
          )}

          {a.showCaption === true && (
            <figcaption className="relative z-10 w-full mt-4 cursor-text" onClick={(e) => e.stopPropagation()}>
              <FigureCaption
                value={a.caption as RichTextValue}
                placeholder="Write cover caption…"
                onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, caption: v } }))}
                style={(a.captionStyle as Record<string, any>) || { textColor: '#ffffff' }}
              />
            </figcaption>
          )}

        </NestedBlockContext.Provider>
      </div>
    </div>
  );
}

export function VideoBlock({ block, selected = false }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const url = a.url as string;
  const youtubeId = extractYouTubeId(url);
  const vimeoId = extractVimeoId(url);

  if (!url) {
    return (
      <div className="be-video">
        <MediaPicker
          accept="video/*"
          label="a video"
          onUpload={(dataUrl) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: dataUrl } }))}
          onUrl={(u) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: u } }))}
        />
      </div>
    );
  }

  const activeVideoBorder = selected
    ? 'ring-2 ring-blue-600 dark:ring-blue-500 border-blue-600 dark:border-blue-500 shadow-lg ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
    : 'border-gray-200 dark:border-gray-700';

  if (youtubeId) {
    return (
      <figure className={`be-video w-full max-w-full ${alignClass(a.align as TextAlign)}`}>
        <div className={`relative w-full overflow-hidden rounded-2xl border bg-black shadow-sm transition-all ${activeVideoBorder}`} style={{ aspectRatio: '16 / 9', minHeight: '240px' }}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
            title="YouTube video"
          />
        </div>
        {a.showCaption !== false && (selected || hasCaptionText(a.caption as RichTextValue)) && (
          <FigureCaption
            value={a.caption as RichTextValue}
            onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, caption: v } }))}
          />
        )}
      </figure>
    );
  }

  if (vimeoId) {
    return (
      <figure className={`be-video w-full max-w-full ${alignClass(a.align as TextAlign)}`}>
        <div className={`relative w-full overflow-hidden rounded-2xl border bg-black shadow-sm transition-all ${activeVideoBorder}`} style={{ aspectRatio: '16 / 9', minHeight: '240px' }}>
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
            title="Vimeo video"
          />
        </div>
        {a.showCaption !== false && (selected || hasCaptionText(a.caption as RichTextValue)) && (
          <FigureCaption
            value={a.caption as RichTextValue}
            onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, caption: v } }))}
          />
        )}
      </figure>
    );
  }

  return (
    <figure className={`be-video w-full max-w-full ${alignClass(a.align as TextAlign)}`}>
      <div className={`overflow-hidden rounded-2xl border bg-black shadow-sm transition-all ${activeVideoBorder}`}>
        <div className="relative w-full" style={{ aspectRatio: '16 / 9', minHeight: '240px' }}>
          <video
            controls
            preload="metadata"
            playsInline
            src={url}
            className="absolute inset-0 h-full w-full object-contain"
            onError={() => {
              // Let the browser keep the native controls visible, but make the failure explicit in preview.
              console.warn('Unable to load video source:', url);
            }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Use a direct video file URL for this player, or paste a YouTube/Vimeo link to auto-embed.
      </p>
      {a.showCaption !== false && (selected || hasCaptionText(a.caption as RichTextValue)) && (
        <FigureCaption
          value={a.caption as RichTextValue}
          onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, caption: v } }))}
        />
      )}
    </figure>
  );
}

export function AudioBlock({ block, selected = false }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const url = a.url as string;

  if (!url) {
    return (
      <div className="be-audio w-full">
        <MediaPicker
          accept="audio/*"
          label="audio"
          onUpload={(dataUrl) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: dataUrl } }))}
          onUrl={(u) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: u } }))}
        />
      </div>
    );
  }

  return (
    <figure className="be-audio w-full">
      <div className={`${mediaSurfaceClassName} w-full`}>
        <div className="px-4 py-4 w-full">
          <audio controls src={url} className="w-full block" />
        </div>
      </div>
      {a.showCaption !== false && (selected || hasCaptionText(a.caption as RichTextValue)) && (
        <FigureCaption
          value={a.caption as RichTextValue}
          onChange={(v) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, caption: v } }))}
        />
      )}
    </figure>
  );
}
