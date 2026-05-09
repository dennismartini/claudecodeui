import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Supported themes.
 * - light: original light palette
 * - dark: original blue-tinted dark palette
 * - vscode-dark: VS Code-style soft grayscale dark palette
 */
const VALID_THEMES = ['light', 'dark', 'vscode-dark'];
const DARK_THEMES = new Set(['dark', 'vscode-dark']);
const STORAGE_KEY = 'theme';
const LEGACY_DARK_VALUES = new Set(['dark', 'true']);

const THEME_COLORS = {
  light: '#ffffff',
  dark: '#0c1117',
  'vscode-dark': '#1f1f1f',
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const detectInitialTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_THEMES.includes(saved)) {
      return saved;
    }
    // Migrate legacy values that only knew 'dark'/'light'/'true'/'false'.
    if (saved && LEGACY_DARK_VALUES.has(saved)) {
      return 'dark';
    }
    if (saved === 'false') {
      return 'light';
    }
  } catch {
    // ignore — fall back to media query
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(detectInitialTheme);

  const isDarkMode = DARK_THEMES.has(theme);

  // Apply theme classes + iOS metadata whenever the active theme changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    // Drop any previous theme-* class before applying the current one so we
    // never end up with stale variants stacked on the root element.
    root.classList.forEach((className) => {
      if (className.startsWith('theme-') && className !== `theme-${theme}`) {
        root.classList.remove(className);
      }
    });
    if (theme === 'vscode-dark') {
      root.classList.add('theme-vscode-dark');
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable — keep in-memory only
    }

    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', isDarkMode ? 'black-translucent' : 'default');
    }
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
    }
  }, [theme, isDarkMode]);

  // Follow OS theme changes only when the user hasn't explicitly chosen one.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        // ignore — still follow the media query
      }
      setThemeState(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((next) => {
    if (!VALID_THEMES.includes(next)) return;
    setThemeState(next);
  }, []);

  // Legacy API: flip between the user's chosen dark variant and light. We
  // remember the most recent dark variant so the toggle keeps the user's
  // preference (vscode-dark stays vscode-dark when re-enabling dark mode).
  const toggleDarkMode = useCallback(() => {
    setThemeState((current) => {
      if (DARK_THEMES.has(current)) {
        return 'light';
      }
      try {
        const remembered = localStorage.getItem('themeLastDark');
        if (remembered && DARK_THEMES.has(remembered)) {
          return remembered;
        }
      } catch {
        // ignore
      }
      return 'dark';
    });
  }, []);

  // Remember the most recent dark variant for `toggleDarkMode`.
  useEffect(() => {
    if (!DARK_THEMES.has(theme)) return;
    try {
      localStorage.setItem('themeLastDark', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isDarkMode,
      toggleDarkMode,
      availableThemes: VALID_THEMES,
    }),
    [theme, setTheme, isDarkMode, toggleDarkMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
