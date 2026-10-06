'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeToDOM(newTheme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(newTheme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', newTheme === 'light' ? '#FAFAFA' : '#030303');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('runova_theme') as Theme | null) ?? 'light';
    setThemeState(savedTheme);
    applyThemeToDOM(savedTheme);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('runova_theme', newTheme);
    applyThemeToDOM(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
