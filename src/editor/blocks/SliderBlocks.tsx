import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Image as ImageIcon, Video, Play } from 'lucide-react';
import type { BlockInstance, RichTextValue } from '../types';
import { useEditorStore } from '../store';
import RichText from '../RichText';
import { extractYouTubeId, extractVimeoId } from '../exporter';
import { useResponsive } from '../responsive';

export interface SlideItem {
  id: string;
  mediaType?: 'image' | 'video';
  imageUrl?: string;
  videoUrl?: string;
  videoDuration?: string;
  imageCredit?: string;
  bgColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  heading?: RichTextValue | string;
  paragraph?: RichTextValue | string;
  caption?: RichTextValue | string;
  buttonText?: string;
  buttonUrl?: string;
  buttonStyle?: 'fill' | 'outline' | 'link';
  buttonColor?: string;
  buttonTextColor?: string;
  align?: 'left' | 'center' | 'right';
  hideHeading?: boolean;
  hideParagraph?: boolean;
  hideButton?: boolean;
}

interface BlockProps {
  block: BlockInstance;
  selected?: boolean;
}

export function SliderBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes || {};
  const slides = (a.slides as SlideItem[]) ?? [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const { getResponsiveHeight } = useResponsive();

  const autoplay = Boolean(a.autoplay);
  const autoplayDelay = (a.autoplayDelay as number) || 4000;
  const pauseOnHover = a.pauseOnHover !== false;
  const loop = a.loop !== false;
  const animation = (a.animation as string) || 'slide';
  const layoutWidth = (a.layoutWidth as string) || 'boxed';
  const rawHeight = (a.height as string) || '450px';
  const effectiveHeight = getResponsiveHeight(rawHeight, '240px', '330px');
  const borderRadius = typeof a.borderRadius === 'number' ? `${a.borderRadius}px` : (a.borderRadius as string) || '16px';
  const showArrows = a.showArrows !== false;
  const arrowStyle = (a.arrowStyle as string) || 'glass';
  const showDots = a.showDots !== false;
  const layoutStyle = (a.layoutStyle as string) || 'news-caption'; // 'news-caption' | 'hero-overlay'
  const textPosition = (a.textPosition as string) || (layoutStyle === 'news-caption' ? 'below-slide' : 'overlay-bottom');
  const navPosition = (a.navPosition as string) || (layoutStyle === 'news-caption' ? 'bottom-right' : 'sides-overlay');
  const showCounter = a.showCounter !== false;

  // Ensure activeIndex is within range
  const safeIndex = slides.length > 0 ? Math.min(Math.max(0, activeIndex), slides.length - 1) : 0;
  const currentSlide = slides[safeIndex] as SlideItem | undefined;

  // Autoplay timer effect
  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    if (pauseOnHover && isHovered) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev < slides.length - 1) return prev + 1;
        return loop ? 0 : prev;
      });
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, loop, pauseOnHover, isHovered, slides.length]);

  const handleNext = () => {
    if (safeIndex < slides.length - 1) {
      setActiveIndex(safeIndex + 1);
    } else if (loop) {
      setActiveIndex(0);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setActiveIndex(safeIndex - 1);
    } else if (loop) {
      setActiveIndex(slides.length - 1);
    }
  };

  const updateCurrentSlide = (updater: (slide: SlideItem) => SlideItem) => {
    updateBlock(block.id, (b) => {
      const currentSlides = [...((b.attributes.slides as SlideItem[]) ?? [])];
      if (currentSlides[safeIndex]) {
        currentSlides[safeIndex] = updater(currentSlides[safeIndex]);
      }
      return { ...b, attributes: { ...b.attributes, slides: currentSlides } };
    });
  };

  if (slides.length === 0 || !currentSlide) {
    return (
      <div className="be-slider py-12 px-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
        <ImageIcon size={36} className="mx-auto mb-3 text-gray-400" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Empty Slider</p>
        <button
          onClick={() => {
            updateBlock(block.id, (b) => ({
              ...b,
              attributes: {
                ...b.attributes,
                slides: [
                  {
                    id: `slide-${Date.now()}`,
                    mediaType: 'image',
                    heading: [{ text: 'Welcome to Editor Studio' }],
                    paragraph: [{ text: 'Build beautiful media sliders with video and image support.' }],
                    buttonText: 'Get Started',
                    buttonUrl: '#',
                    bgColor: '#1e293b',
                    align: 'left',
                  },
                ],
              },
            }));
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus size={14} /> Add First Slide
        </button>
      </div>
    );
  }

  const getArrowButtonClasses = () => {
    switch (arrowStyle) {
      case 'rounded':
        return 'w-9 h-9 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer';
      case 'glass':
      default:
        return 'w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer';
    }
  };

  const isNewsLayout = layoutStyle === 'news-caption' || textPosition === 'below-slide';

  return (
    <div
      className={`be-slider relative group transition-all ${layoutWidth === 'full' ? 'w-full' : 'max-w-5xl mx-auto'}`}
      style={{
        marginTop: a.marginTop ? `${a.marginTop}px` : undefined,
        marginBottom: a.marginBottom ? `${a.marginBottom}px` : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Main Slide Frame (Image or Video) */}
      <div
        className="relative w-full overflow-hidden shadow-md be-slider-frame"
        style={{ height: effectiveHeight, borderRadius }}
      >
        {slides.map((slide, idx) => {
          if (!slide) return null;
          const isActive = idx === safeIndex;
          const isVideo = slide.mediaType === 'video' || Boolean(slide.videoUrl);
          const youtubeId = extractYouTubeId(slide.videoUrl || '');
          const vimeoId = extractVimeoId(slide.videoUrl || '');
          const bgImg = slide.imageUrl;
          const bgColor = slide.bgColor || '#1e293b';
          const overlayColor = slide.overlayColor || '#000000';
          const overlayOpacity = typeof slide.overlayOpacity === 'number' ? slide.overlayOpacity / 100 : (!isNewsLayout && bgImg ? 0.4 : 0);
          const slideAlign = slide.align || 'left';

          const hideHeading = Boolean(slide.hideHeading);
          const hideParagraph = Boolean(slide.hideParagraph);
          const hideButton = Boolean(slide.hideButton);

          const headingVal = typeof slide.heading === 'string' ? [{ text: slide.heading }] : (slide.heading ?? []);
          const paraVal = typeof slide.paragraph === 'string' ? [{ text: slide.paragraph }] : (slide.paragraph ?? []);

          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 w-full h-full flex flex-col transition-all duration-700 ease-in-out ${animation === 'fade'
                ? isActive ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-95 pointer-events-none'
                : isActive
                  ? 'translate-x-0 z-10 opacity-100'
                  : idx < safeIndex
                    ? '-translate-x-full z-0 opacity-0 pointer-events-none'
                    : 'translate-x-full z-0 opacity-0 pointer-events-none'
                }`}
              style={{ backgroundColor: bgColor }}
            >
              {/* Media Content Area */}
              {isVideo ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  {youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube video slide"
                    />
                  ) : vimeoId ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoId}`}
                      className="w-full h-full border-0"
                      allowFullScreen
                      title="Vimeo video slide"
                    />
                  ) : slide.videoUrl ? (
                    <video
                      src={slide.videoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : bgImg ? (
                    <div className="relative w-full h-full">
                      <img src={bgImg} alt="Video slide preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                        <div className="w-14 h-14 rounded-full bg-white/95 text-gray-900 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                          <Play size={24} className="ml-1 fill-gray-900" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/70 text-xs font-semibold flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <Video size={22} className="text-white" />
                      </div>
                      <span>Video Slide (Add Video File or URL in settings)</span>
                    </div>
                  )}

                  {/* Play icon overlay on top of video if URL provided */}
                  {(!youtubeId && !vimeoId && slide.videoUrl && !bgImg) && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-lg">
                        <Play size={20} className="ml-0.5 fill-white" />
                      </div>
                    </div>
                  )}

                  {/* Video Duration Badge e.g. "0:50" */}
                  {slide.videoDuration && (
                    <div className="absolute bottom-3 left-3 bg-black/85 text-white font-mono font-bold text-[11px] px-2.5 py-1 rounded-md shadow-md z-20 pointer-events-none border border-white/20">
                      {slide.videoDuration}
                    </div>
                  )}
                </div>
              ) : (
                /* Image Background Frame */
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: bgImg ? `url('${bgImg}')` : undefined,
                    backgroundColor: !bgImg ? bgColor : undefined,
                  }}
                />
              )}

              {/* Overlay inside slide if hero-overlay mode */}
              {!isNewsLayout && (
                <>
                  {overlayOpacity > 0 && (
                    <div
                      className="absolute inset-0 pointer-events-none z-0 transition-opacity"
                      style={{
                        backgroundColor: overlayColor,
                        opacity: overlayOpacity,
                      }}
                    />
                  )}

                  <div className={`relative z-10 w-full h-full max-w-4xl mx-auto p-5 sm:p-12 flex flex-col justify-end gap-2.5 ${slideAlign === 'center' ? 'items-center text-center' : slideAlign === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
                    {!hideHeading && (
                      <RichText
                        value={headingVal as RichTextValue}
                        onChange={(v) => updateCurrentSlide((s) => ({ ...s, heading: v }))}
                        placeholder="Write slide heading…"
                        className="text-xl sm:text-4xl font-extrabold text-white leading-tight drop-shadow-md outline-none break-words"
                        tagName="div"
                      />
                    )}

                    {!hideParagraph && (
                      <RichText
                        value={paraVal as RichTextValue}
                        onChange={(v) => updateCurrentSlide((s) => ({ ...s, paragraph: v }))}
                        placeholder="Write slide paragraph…"
                        className="text-xs sm:text-lg text-white/90 leading-relaxed drop-shadow-xs max-w-2xl outline-none break-words"
                        tagName="div"
                      />
                    )}

                    {!hideButton && slide.buttonText !== '' && (
                      <div className="mt-2">
                        <span
                          className="inline-flex items-center justify-center px-5 py-2 rounded-xl font-semibold text-xs text-white bg-primary-600 shadow-md cursor-pointer"
                        >
                          {slide.buttonText || 'Learn More'}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Sides Overlay Navigation Arrows (if navPosition === 'sides-overlay') */}
        {navPosition === 'sides-overlay' && showArrows && slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 ${getArrowButtonClasses()}`}
              title="Previous slide"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 ${getArrowButtonClasses()}`}
              title="Next slide"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* 2. Below-Slide Caption & Navigation Row (News & Media Layout) */}
      {isNewsLayout && currentSlide && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 pb-2 be-slider-caption-row">
          {/* Left Side: Counter + Text / Caption + Credit Line */}
          <div className="flex-1 min-w-0 text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium leading-normal w-full">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {showCounter && (
                <span className="font-bold text-gray-900 dark:text-white shrink-0">
                  ({safeIndex + 1}/{slides.length})
                </span>
              )}

              <div className="inline-block flex-1 min-w-0">
                <RichText
                  value={typeof currentSlide.heading === 'string' ? [{ text: currentSlide.heading }] : (currentSlide.heading ?? [{ text: '' }])}
                  onChange={(v) => updateCurrentSlide((s) => ({ ...s, heading: v }))}
                  placeholder="Slide title or news caption..."
                  className="inline font-semibold text-gray-900 dark:text-gray-100 outline-none mr-1.5 break-words"
                  tagName="div"
                />

                {currentSlide.imageCredit && (
                  <span className="text-gray-500 dark:text-gray-400 font-normal break-words">
                    (Image Credit: {currentSlide.imageCredit})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Navigation Arrows [ < ] [ > ] */}
          {navPosition === 'bottom-right' && showArrows && slides.length > 1 && (
            <div className="flex items-center gap-2 shrink-0 be-slider-nav-arrows self-end sm:self-auto">
              <button
                type="button"
                onClick={handlePrev}
                className="p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Previous slide"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Next slide"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation Dots (only when showDots is explicit and not news layout bottom-right arrows) */}
      {showDots && slides.length > 1 && (!isNewsLayout || navPosition !== 'bottom-right') && (
        <div className="mt-3 flex items-center justify-center gap-1.5 pb-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`rounded-full transition-all cursor-pointer ${idx === safeIndex ? 'w-5 h-2 bg-primary-600' : 'w-2 h-2 bg-gray-300 dark:bg-gray-700'}`}
            />
          ))}
        </div>
      )}

      {/* Editor Slide Indicator Badge */}
      <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 backdrop-blur-md text-white rounded-lg px-2.5 py-1 text-[11px] font-semibold">
        <span>Slide {safeIndex + 1}/{slides.length}</span>
        {currentSlide?.mediaType === 'video' ? <Video size={12} className="text-blue-400 ml-1" /> : <ImageIcon size={12} className="text-emerald-400 ml-1" />}
      </div>
    </div>
  );
}
