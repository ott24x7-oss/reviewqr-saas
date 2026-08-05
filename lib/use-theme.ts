"use client";
import { useEffect, useState } from "react";

/**
 * Lightweight dark-mode toggle for the dashboard/admin shells. Applies a
 * scoped `.dark` class on the shell root (not <html>) so the marketing and
 * review surfaces stay unaffected. Persists the choice and honours the OS
 * preference on first load.
 */
export function useDarkToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dash-theme");
      const initial = saved
        ? saved === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(initial);
    } catch {}
  }, []);

  function toggle() {
    setDark((d) => {
      const next = !d;
      try {
        localStorage.setItem("dash-theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  }

  return { dark, toggle };
}
