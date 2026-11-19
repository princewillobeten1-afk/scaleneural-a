export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'sn-theme';

export function isValidTheme(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

export function resolveTheme(
  storedValue: string | null | undefined,
  fallback: ThemeMode = 'dark'
): ThemeMode {
  if (isValidTheme(storedValue)) {
    return storedValue;
  }
  return fallback;
}

export function getNextTheme(current: ThemeMode): ThemeMode {
  return current === 'light' ? 'dark' : 'light';
}

export interface ThemeToggleMeta {
  current: ThemeMode;
  next: ThemeMode;
  ariaLabel: string;
  title: string;
  pressed: boolean;
}

export function getThemeToggleMeta(current: ThemeMode): ThemeToggleMeta {
  const next = getNextTheme(current);
  const label =
    next === 'light' ? 'Switch to light mode' : 'Switch to dark mode';
  return {
    current,
    next,
    ariaLabel: label,
    title: label,
    pressed: current === 'light',
  };
}

export function formatAuditSuccessMessage(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0];
  if (!firstName) {
    return 'Thanks — your audit request has been received.';
  }
  return `Thanks, ${firstName} — your audit request has been received.`;
}

export function calculateScrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const maxScroll = scrollHeight - clientHeight;
  if (!Number.isFinite(maxScroll) || maxScroll <= 0) {
    return 0;
  }
  if (!Number.isFinite(scrollTop) || scrollTop <= 0) {
    return 0;
  }
  return Math.min(1, scrollTop / maxScroll);
}

export function shouldShowBackToTop(
  heroBottomInViewport: number,
  scrollTop: number,
  hasHero: boolean
): boolean {
  if (!Number.isFinite(scrollTop) || scrollTop <= 0) {
    return false;
  }
  if (hasHero) {
    return Number.isFinite(heroBottomInViewport) && heroBottomInViewport <= 120;
  }
  return scrollTop >= 400;
}

export function toggleFaqItem(
  activeIndex: number | null,
  clickedIndex: number
): number | null {
  return activeIndex === clickedIndex ? null : clickedIndex;
}
