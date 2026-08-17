import { useEditorStore } from './store';

export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export const CONTAINER_MAX_WIDTHS: Record<ContainerSize, string> = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  full: '100%',
};

export const RESPONSIVE_TYPOGRAPHY_TOKENS = {
  h1: 'clamp(28px, 5vw, 56px)',
  h2: 'clamp(24px, 4vw, 42px)',
  h3: 'clamp(20px, 3vw, 32px)',
  h4: 'clamp(18px, 2.5vw, 24px)',
  h5: 'clamp(16px, 2vw, 20px)',
  h6: 'clamp(14px, 1.5vw, 16px)',
  paragraph: 'clamp(14px, 1.8vw, 18px)',
  small: 'clamp(12px, 1.2vw, 14px)',
} as const;

export function useResponsive() {
  const deviceView = useEditorStore((s) => s.deviceView);
  const isMobile = deviceView === 'mobile';
  const isTablet = deviceView === 'tablet';
  const isDesktop = deviceView === 'desktop';

  return {
    deviceView,
    isMobile,
    isTablet,
    isDesktop,

    // Helper to compute responsive columns
    getResponsiveCols: (desktopCols: number) => {
      if (isMobile) return 1;
      if (isTablet) return Math.min(desktopCols, 2);
      return Math.max(1, desktopCols);
    },

    // Helper to compute responsive frame heights
    getResponsiveHeight: (desktopHeight: string | number | undefined, minMobile = '240px', minTablet = '330px') => {
      if (isMobile) return minMobile;
      if (isTablet) return minTablet;
      if (!desktopHeight) return '450px';
      return typeof desktopHeight === 'number' ? `${desktopHeight}px` : desktopHeight;
    },

    // Helper to compute responsive padding
    getResponsivePadding: (desktopPadding?: number | string) => {
      if (isMobile) return '12px 14px';
      if (isTablet) return '16px 20px';
      if (desktopPadding === undefined || desktopPadding === null) return undefined;
      return typeof desktopPadding === 'number' ? `${desktopPadding}px` : desktopPadding;
    },

    // Helper to compute responsive font size using clamp
    getResponsiveFontSize: (rawSize: number | string | undefined, defaultType: keyof typeof RESPONSIVE_TYPOGRAPHY_TOKENS = 'paragraph') => {
      if (!rawSize) return RESPONSIVE_TYPOGRAPHY_TOKENS[defaultType];
      const num = typeof rawSize === 'number' ? rawSize : parseFloat(String(rawSize));
      if (isNaN(num) || num <= 0) return RESPONSIVE_TYPOGRAPHY_TOKENS[defaultType];
      if (isMobile) return `${Math.min(num, 20)}px`;
      if (isTablet) return `${Math.min(num, 28)}px`;
      const minPx = Math.max(14, Math.round(num * 0.65));
      return `clamp(${minPx}px, 2.5vw, ${num}px)`;
    },

    // Helper to compute container styles
    getContainerStyle: (size: ContainerSize | string = 'full') => {
      const maxWidth = CONTAINER_MAX_WIDTHS[size as ContainerSize] || (typeof size === 'string' ? size : '100%');
      return {
        width: '100%',
        maxWidth: isMobile ? '100%' : maxWidth,
        marginRight: 'auto',
        marginLeft: 'auto',
      };
    },
  };
}
