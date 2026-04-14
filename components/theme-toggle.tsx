"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "vercel-test-theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const currentTheme =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";

    setTheme(currentTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) {
    return <div className="toolbar-control--placeholder" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="toolbar-control"
      aria-label={`Trocar para tema ${theme === "dark" ? "claro" : "escuro"}`}
    >
      <span className="toolbar-control__indicator" />
      <span>{theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}</span>
    </button>
  );
}
