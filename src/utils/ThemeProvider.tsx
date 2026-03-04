import React, { createContext, useContext, useEffect, useState } from "react";
import { MantineProvider } from "@mantine/core";

type ColorScheme = "light" | "dark";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  toggleColorScheme: (value?: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type Props = { children: React.ReactNode };

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export default function ThemeProvider({ children }: Props) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    try {
      const saved = localStorage.getItem("theme");
      return (saved as ColorScheme) || "light";
    } catch (e) {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("theme", colorScheme);
    } catch (e) {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", colorScheme === "dark");

      const html = document.documentElement;
      html.setAttribute("data-mantine-color-scheme", colorScheme);
    }
  }, [colorScheme]);

  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
      <MantineProvider>{children}</MantineProvider>
    </ThemeContext.Provider>
  );
}
