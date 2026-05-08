import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sidebarWidth';
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 520;
export const SIDEBAR_DEFAULT_WIDTH = 288;

const clampWidth = (value: number): number => {
  if (!Number.isFinite(value)) {
    return SIDEBAR_DEFAULT_WIDTH;
  }
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(value)));
};

const readInitialWidth = (): number => {
  if (typeof window === 'undefined') {
    return SIDEBAR_DEFAULT_WIDTH;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return SIDEBAR_DEFAULT_WIDTH;
    }
    const parsed = Number(raw);
    return clampWidth(parsed);
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
};

export function useSidebarWidth() {
  const [width, setWidthState] = useState<number>(readInitialWidth);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      // localStorage unavailable — keep in-memory value only.
    }
  }, [width]);

  const setWidth = useCallback((next: number) => {
    setWidthState(clampWidth(next));
  }, []);

  const resetWidth = useCallback(() => {
    setWidthState(SIDEBAR_DEFAULT_WIDTH);
  }, []);

  return { width, setWidth, resetWidth };
}
