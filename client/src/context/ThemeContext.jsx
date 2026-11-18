import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export const PALETTES = [
  {
    id: "mint",
    name: "Emerald Mint",
    accent: "#10B981",
    bubble: "#E6F7F2",
    bubbleDark: "#064E3B",
    dot: "bg-emerald-500",
  },
  {
    id: "lavender",
    name: "Soft Lavender",
    accent: "#8B5CF6",
    bubble: "#EDE9FE",
    bubbleDark: "#4C1D95",
    dot: "bg-purple-500",
  },
  {
    id: "ocean",
    name: "Ocean Sky",
    accent: "#3B82F6",
    bubble: "#EFF6FF",
    bubbleDark: "#1E3A8A",
    dot: "bg-blue-500",
  },
  {
    id: "coral",
    name: "Sunset Rose",
    accent: "#F43F5E",
    bubble: "#FFF1F2",
    bubbleDark: "#881337",
    dot: "bg-rose-500",
  },
  {
    id: "amber",
    name: "Warm Honey",
    accent: "#F59E0B",
    bubble: "#FFFBEB",
    bubbleDark: "#78350F",
    dot: "bg-amber-500",
  },
];

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("chat_theme");
    if (saved === "dark" || saved === "light") return saved;
    // Default to light to showcase the new modern reference UI
    return "light";
  });

  const [palette, setPaletteState] = useState(() => {
    if (typeof window === "undefined") return "mint";
    const saved = localStorage.getItem("chat_palette");
    const valid = PALETTES.some((p) => p.id === saved);
    return valid ? saved : "mint";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.setAttribute("data-theme", theme);
    localStorage.setItem("chat_theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-palette", palette);
    localStorage.setItem("chat_palette", palette);
  }, [palette]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setPalette = (paletteId) => {
    if (PALETTES.some((p) => p.id === paletteId)) {
      setPaletteState(paletteId);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        toggleTheme,
        setTheme,
        palette,
        setPalette,
        palettes: PALETTES,
        activePalette: PALETTES.find((p) => p.id === palette) || PALETTES[0],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
