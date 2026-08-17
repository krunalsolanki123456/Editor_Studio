import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, RotateCcw, Crop as CropIcon } from 'lucide-react';

interface ImageCropModalProps {
  imageUrl: string;
  originalUrl?: string;
  onCrop: (croppedDataUrl: string) => void;
  onReset: () => void;
  onClose: () => void;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null;

export function ImageCropModal({
  imageUrl,
  originalUrl,
  onCrop,
  onReset,
  onClose,
}: ImageCropModalProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; box: typeof cropBox }>({
    mouseX: 0,
    mouseY: 0,
    box: { x: 10, y: 10, width: 80, height: 80 },
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Prevent page scroll behind modal when active
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const setRatioPreset = (ratio: number | null) => {
    setAspectRatio(ratio);
    if (!ratio) {
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
      return;
    }

    if (imgRef.current) {
      const imgWidth = imgRef.current.clientWidth;
      const imgHeight = imgRef.current.clientHeight;
      if (!imgWidth || !imgHeight) return;

      const imgAspect = imgWidth / imgHeight;
      let boxW = 80;
      let boxH = 80;

      if (ratio > imgAspect) {
        boxW = 80;
        boxH = (80 / ratio) * imgAspect;
      } else {
        boxH = 80;
        boxW = (80 * ratio) / imgAspect;
      }

      setCropBox({
        x: Math.max(0, (100 - boxW) / 2),
        y: Math.max(0, (100 - boxH) / 2),
        width: Math.min(100, boxW),
        height: Math.min(100, boxH),
      });
    }
  };

  const startDrag = (mode: DragMode, clientX: number, clientY: number, e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode(mode);
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      box: { ...cropBox },
    };
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!dragMode || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dx = ((clientX - dragStartRef.current.mouseX) / rect.width) * 100;
    const dy = ((clientY - dragStartRef.current.mouseY) / rect.height) * 100;
    const initial = dragStartRef.current.box;

    const minSize = 10;
    let x = initial.x;
    let y = initial.y;
    let width = initial.width;
    let height = initial.height;

    if (dragMode === 'move') {
      x = Math.max(0, Math.min(100 - width, initial.x + dx));
      y = Math.max(0, Math.min(100 - height, initial.y + dy));
    } else {
      let nextX = initial.x;
      let nextY = initial.y;
      let nextW = initial.width;
      let nextH = initial.height;

      if (dragMode.includes('w')) {
        const maxDx = initial.width - minSize;
        const clampedDx = Math.min(maxDx, Math.max(-initial.x, dx));
        nextX = initial.x + clampedDx;
        nextW = initial.width - clampedDx;
      }
      if (dragMode.includes('e')) {
        nextW = Math.max(minSize, Math.min(100 - initial.x, initial.width + dx));
      }
      if (dragMode.includes('n')) {
        const maxDy = initial.height - minSize;
        const clampedDy = Math.min(maxDy, Math.max(-initial.y, dy));
        nextY = initial.y + clampedDy;
        nextH = initial.height - clampedDy;
      }
      if (dragMode.includes('s')) {
        nextH = Math.max(minSize, Math.min(100 - initial.y, initial.height + dy));
      }

      if (aspectRatio && imgRef.current) {
        const imgAspect = imgRef.current.clientWidth / imgRef.current.clientHeight;
        const targetBoxAspect = aspectRatio / imgAspect;
        nextH = nextW / targetBoxAspect;
        if (nextY + nextH > 100) {
          nextH = 100 - nextY;
          nextW = nextH * targetBoxAspect;
        }
      }

      x = nextX;
      y = nextY;
      width = nextW;
      height = nextH;
    }

    setCropBox({ x, y, width, height });
  }, [dragMode, aspectRatio]);

  useEffect(() => {
    if (!dragMode) return;

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const stopDrag = () => setDragMode(null);

    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', stopDrag);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [dragMode, handlePointerMove]);

  const handleApplyCrop = () => {
    if (!imgRef.current) return;

    const img = imgRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const cropX = (cropBox.x / 100) * naturalWidth;
    const cropY = (cropBox.y / 100) * naturalHeight;
    const cropW = (cropBox.width / 100) * naturalWidth;
    const cropH = (cropBox.height / 100) * naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropW));
    canvas.height = Math.max(1, Math.round(cropH));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      const croppedDataUrl = canvas.toDataURL('image/png');
      onCrop(croppedDataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm select-none touch-none">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <CropIcon className="text-primary-600 dark:text-primary-400" size={20} />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Crop Image</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Image Workspace */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-950 p-6 min-h-[380px]">
          <div ref={wrapperRef} className="relative inline-block max-h-[52vh] max-w-full leading-none">
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop target"
              className="max-h-[52vh] max-w-full object-contain pointer-events-none block"
              crossOrigin="anonymous"
            />

            {/* Dark Mask around Crop Box */}
            <div
              className="absolute inset-0 bg-black/60 pointer-events-none"
              style={{
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                  ${cropBox.x}% ${cropBox.y}%,
                  ${cropBox.x}% ${cropBox.y + cropBox.height}%,
                  ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%,
                  ${cropBox.x + cropBox.width}% ${cropBox.y}%,
                  ${cropBox.x}% ${cropBox.y}%
                )`,
              }}
            />

            {/* Crop Bounding Box Overlay */}
            <div
              onMouseDown={(e) => startDrag('move', e.clientX, e.clientY, e)}
              onTouchStart={(e) => e.touches.length > 0 && startDrag('move', e.touches[0].clientX, e.touches[0].clientY, e)}
              className="absolute border-2 border-primary-400 cursor-move shadow-2xl transition-shadow"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
            >
              {/* Grid Overlay */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-white"></div>
                <div className="border-r border-white"></div>
                <div></div>
              </div>

              {/* Handles */}
              {/* Corners */}
              <div
                onMouseDown={(e) => startDrag('nw', e.clientX, e.clientY, e)}
                onTouchStart={(e) => e.touches.length > 0 && startDrag('nw', e.touches[0].clientX, e.touches[0].clientY, e)}
                className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-primary-600 rounded-sm cursor-nwse-resize shadow-md"
              />
              <div
                onMouseDown={(e) => startDrag('ne', e.clientX, e.clientY, e)}
                onTouchStart={(e) => e.touches.length > 0 && startDrag('ne', e.touches[0].clientX, e.touches[0].clientY, e)}
                className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-primary-600 rounded-sm cursor-nesw-resize shadow-md"
              />
              <div
                onMouseDown={(e) => startDrag('sw', e.clientX, e.clientY, e)}
                onTouchStart={(e) => e.touches.length > 0 && startDrag('sw', e.touches[0].clientX, e.touches[0].clientY, e)}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-primary-600 rounded-sm cursor-nesw-resize shadow-md"
              />
              <div
                onMouseDown={(e) => startDrag('se', e.clientX, e.clientY, e)}
                onTouchStart={(e) => e.touches.length > 0 && startDrag('se', e.touches[0].clientX, e.touches[0].clientY, e)}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-primary-600 rounded-sm cursor-nwse-resize shadow-md"
              />

              {/* Edges */}
              <div
                onMouseDown={(e) => startDrag('n', e.clientX, e.clientY, e)}
                onTouchStart={(e) => e.touches.length > 0 && startDrag('n', e.touches[0].clientX, e.touches[0].clientY, e)}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border-2 border-primary-600 rounded-sm cursor-ns-resize shadow-md"
              />
              <div
                onMouseDown={(e) => startDrag('s', e.clientX, e.clientY, e)}
                onTouchStart={(e) => e.touches.length > 0 && startDrag('s', e.touches[0].clientX, e.touches[0].clientY, e)}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border-2 border-primary-600 rounded-sm cursor-ns-resize shadow-md"
              />
              <div
                onMouseDown={(e) => startDrag('w', e.clientX, e.clientY, e)}
                onTouchStart={(e) => e.touches.length > 0 && startDrag('w', e.touches[0].clientX, e.touches[0].clientY, e)}
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-6 bg-white border-2 border-primary-600 rounded-sm cursor-ew-resize shadow-md"
              />
              <div
                onMouseDown={(e) => startDrag('e', e.clientX, e.clientY, e)}
                onTouchStart={(e) => e.touches.length > 0 && startDrag('e', e.touches[0].clientX, e.touches[0].clientY, e)}
                className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-6 bg-white border-2 border-primary-600 rounded-sm cursor-ew-resize shadow-md"
              />
            </div>
          </div>
        </div>

        {/* Modal Controls Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 p-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => setRatioPreset(null)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${aspectRatio === null ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => setRatioPreset(1)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${aspectRatio === 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              1:1 (Square)
            </button>
            <button
              type="button"
              onClick={() => setRatioPreset(16 / 9)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${aspectRatio === 16 / 9 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              16:9
            </button>
            <button
              type="button"
              onClick={() => setRatioPreset(4 / 3)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${aspectRatio === 4 / 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              4:3
            </button>

            {originalUrl && originalUrl !== imageUrl && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 hover:bg-red-200 cursor-pointer ml-2"
              >
                <RotateCcw size={13} /> Reset Original
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white cursor-pointer shadow-md transition-colors"
            >
              <Check size={16} /> Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
