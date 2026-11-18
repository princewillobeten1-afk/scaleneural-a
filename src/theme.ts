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
