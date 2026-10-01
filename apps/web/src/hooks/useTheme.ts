import { useState, useCallback } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const THEME_COLORS: Record<Theme, string> = {
  dark: "#05070F",
  light: "#E9EDF7",
};

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[next]);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}
