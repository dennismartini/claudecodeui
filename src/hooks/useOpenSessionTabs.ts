import { useCallback, useEffect, useState } from 'react';

import type { LLMProvider } from '../types/app';

export type SessionTab = {
  sessionId: string;
  projectId: string;
  provider: LLMProvider;
  title: string;
};

const STORAGE_KEY = 'openSessionTabs';
const MAX_TABS = 20;

const isSessionTab = (value: unknown): value is SessionTab => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SessionTab>;
  return (
    typeof candidate.sessionId === 'string' &&
    typeof candidate.projectId === 'string' &&
    typeof candidate.provider === 'string' &&
    typeof candidate.title === 'string'
  );
};

const readInitialTabs = (): SessionTab[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSessionTab).slice(0, MAX_TABS);
  } catch {
    return [];
  }
};

export function useOpenSessionTabs() {
  const [tabs, setTabs] = useState<SessionTab[]>(readInitialTabs);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      // localStorage unavailable — keep in-memory only.
    }
  }, [tabs]);

  // Adds a tab if it isn't open yet; otherwise refreshes its title in place.
  // Returns nothing — callers should manage "active session" via the existing
  // handleSessionSelect flow that navigates to /session/:id.
  const openTab = useCallback((tab: SessionTab) => {
    setTabs((prev) => {
      const existingIndex = prev.findIndex((t) => t.sessionId === tab.sessionId);
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        if (existing.title === tab.title && existing.projectId === tab.projectId) {
          return prev;
        }
        const next = [...prev];
        next[existingIndex] = { ...existing, ...tab };
        return next;
      }
      const next = [...prev, tab];
      // Cap so a runaway loop / mass-open can't blow up localStorage.
      return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
    });
  }, []);

  // Removes a tab by sessionId. Returns the sessionId of the neighbor to focus
  // next (or null if the closed tab wasn't active or no tabs remain).
  const closeTab = useCallback((sessionId: string, currentActiveSessionId: string | null): string | null => {
    let nextActiveSessionId: string | null = null;
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.sessionId === sessionId);
      if (index === -1) return prev;
      const next = prev.filter((t) => t.sessionId !== sessionId);
      if (sessionId === currentActiveSessionId) {
        // Prefer the right neighbor, then the left one. Mirrors browser/IDE tab UX.
        const neighbor = next[index] || next[index - 1] || null;
        nextActiveSessionId = neighbor?.sessionId ?? null;
      }
      return next;
    });
    return nextActiveSessionId;
  }, []);

  const updateTabTitle = useCallback((sessionId: string, title: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.sessionId === sessionId);
      if (index === -1 || prev[index].title === title) return prev;
      const next = [...prev];
      next[index] = { ...next[index], title };
      return next;
    });
  }, []);

  const removeTabsForProject = useCallback((projectId: string): SessionTab[] => {
    let removed: SessionTab[] = [];
    setTabs((prev) => {
      const next = prev.filter((t) => t.projectId !== projectId);
      removed = prev.filter((t) => t.projectId === projectId);
      return next;
    });
    return removed;
  }, []);

  const removeTab = useCallback((sessionId: string) => {
    setTabs((prev) => prev.filter((t) => t.sessionId !== sessionId));
  }, []);

  const clearTabs = useCallback(() => {
    setTabs([]);
  }, []);

  return {
    tabs,
    openTab,
    closeTab,
    removeTab,
    removeTabsForProject,
    updateTabTitle,
    clearTabs,
  };
}
