"use client";

import { useState } from "react";
import { ThemeSelectorProps, ThemeOption, Theme } from "./types";

const themes: ThemeOption[] = [
  { id: "grey", name: "Grey", color: "#71717a" },
  { id: "gruvbox", name: "Gruvbox", color: "#fabd2f" },
  { id: "nord", name: "Nord", color: "#88c0d0" },
  { id: "tokyo", name: "Tokyo", color: "#bb9af7" },
  { id: "catppuccin", name: "Catppuccin", color: "#f5c2e7" },
  { id: "matrix", name: "Matrix", color: "#00ff41" },
];

/**
 * Theme selector component with cog icon dropdown.
 *
 * @component
 * @param props - Component props
 * @param props.currentTheme - Currently active theme
 * @param props.onThemeChange - Handler for theme changes
 * @returns The theme selector component
 */
export function ThemeSelector({
  currentTheme,
  onThemeChange,
  matrixRain,
  onMatrixRainChange,
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (theme: Theme): void => {
    onThemeChange(theme);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        aria-label="Select theme"
      >
        <CogIcon />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--bg-soft)] border border-[var(--bg-highlight)] py-1 min-w-[160px] animate-fade-in">
            <div className="px-2 py-1 text-xs text-[var(--fg-muted)] border-b border-[var(--bg-highlight)]">
              theme
            </div>
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`w-full px-2 py-1 text-sm flex items-center gap-2 hover:bg-[var(--bg-highlight)] transition-colors ${
                  currentTheme === theme.id
                    ? "text-[var(--fg)]"
                    : "text-[var(--fg-dim)]"
                }`}
              >
                <button
                  onClick={() => handleSelect(theme.id)}
                  className="flex items-center gap-2 flex-1"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span>{theme.name}</span>
                  {currentTheme === theme.id && theme.id !== "matrix" && (
                    <span className="ml-auto text-[var(--green)]">✓</span>
                  )}
                </button>
                {theme.id === "matrix" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTheme === "matrix") {
                        onMatrixRainChange(!matrixRain);
                      }
                    }}
                    disabled={currentTheme !== "matrix"}
                    className={`ml-auto w-6 h-3 rounded-full transition-all relative flex items-center ${
                      currentTheme !== "matrix"
                        ? "bg-[var(--bg-highlight)] opacity-30 cursor-not-allowed"
                        : matrixRain
                        ? "bg-[var(--green)]"
                        : "bg-[var(--bg-highlight)]"
                    }`}
                    title={currentTheme === "matrix" ? "Toggle rain effect" : "Select Matrix theme first"}
                  >
                    <span
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        currentTheme !== "matrix"
                          ? "bg-[var(--fg-muted)] ml-0.5"
                          : matrixRain
                          ? "bg-white ml-3.5"
                          : "bg-white ml-0.5"
                      }`}
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Cog/gear icon SVG component
 */
function CogIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

