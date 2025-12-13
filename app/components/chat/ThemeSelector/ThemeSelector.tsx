"use client";

import { useState } from "react";
import { ThemeSelectorProps, ThemeOption, Theme } from "./types";

const EFFECT_TOOLTIP = "⚡ Use with care ⚡";

interface ThemeConfig extends ThemeOption {
  description: string;
  hasEffect?: boolean;
}

const themes: ThemeConfig[] = [
  {
    id: "grey",
    name: "Grey",
    color: "#71717a",
    description: "Clean minimal dark theme",
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    color: "#fabd2f",
    description: "Retro groove with warm colors",
  },
  {
    id: "nord",
    name: "Nord",
    color: "#88c0d0",
    description: "Arctic, north-bluish palette",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    color: "#bb9af7",
    description: "Night in Tokyo vibes",
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    color: "#f5c2e7",
    description: "Soothing pastel theme",
  },
  {
    id: "solarized",
    name: "Solarized",
    color: "#268bd2",
    description: "Classic light theme ☀️",
  },
  {
    id: "github",
    name: "GitHub",
    color: "#24292e",
    description: "Clean and familiar light theme 📄",
  },
  {
    id: "matrix",
    name: "Matrix",
    color: "#00ff41",
    description: "Enter the Matrix 🐇",
    hasEffect: true,
  },
  {
    id: "christmas",
    name: "Christmas",
    color: "#c41e3a",
    description: "Festive holiday spirit 🎄",
    hasEffect: true,
  },
  {
    id: "space",
    name: "Space",
    color: "#818cf8",
    description: "Deep space exploration 🚀",
    hasEffect: true,
  },
  {
    id: "nightsky",
    name: "Night Sky",
    color: "#a5b4fc",
    description: "Stargazing at midnight ✨",
    hasEffect: true,
  },
  {
    id: "synthwave",
    name: "Synthwave",
    color: "#ff00c8",
    description: "80s neon retrowave 🌆",
    hasEffect: true,
  },
  {
    id: "ocean",
    name: "Ocean",
    color: "#00d4aa",
    description: "Deep underwater vibes 🌊",
    hasEffect: true,
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    color: "#ff2a6d",
    description: "Neon-lit rain city 🏙️",
    hasEffect: true,
  },
  {
    id: "sakura",
    name: "Sakura",
    color: "#ff90b3",
    description: "Cherry blossom serenity 🌸",
    hasEffect: true,
  },
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
  christmasSnow,
  onChristmasSnowChange,
  spaceStars,
  onSpaceStarsChange,
  nightSkyRotation,
  onNightSkyRotationChange,
  synthwaveGrid,
  onSynthwaveGridChange,
  oceanBubbles,
  onOceanBubblesChange,
  cyberpunkRain,
  onCyberpunkRainChange,
  sakuraPetals,
  onSakuraPetalsChange,
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
          <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--bg-soft)] border border-[var(--bg-highlight)] py-1 min-w-[230px] animate-fade-in">
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
                  data-tooltip={theme.description}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span>{theme.name}</span>
                  {currentTheme === theme.id && !theme.hasEffect && (
                    <span className="ml-auto text-[var(--green)]">✓</span>
                  )}
                </button>
                {theme.id === "matrix" && (
                  <label
                    className={`ml-auto flex items-center gap-1 text-xs ${
                      currentTheme !== "matrix"
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    {...(currentTheme === "matrix" && {
                      "data-tooltip": EFFECT_TOOLTIP,
                    })}
                  >
                    <span className="text-[var(--fg-dim)] text-xs">+swag?</span>
                    <input
                      type="checkbox"
                      checked={matrixRain}
                      disabled={currentTheme !== "matrix"}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (currentTheme === "matrix") {
                          onMatrixRainChange(!matrixRain);
                        }
                      }}
                      className="w-3 h-3 appearance-none rounded-sm border border-[var(--fg-muted)] bg-[var(--bg-highlight)] checked:bg-[var(--green)] checked:border-[var(--green)] disabled:checked:bg-[var(--fg-muted)] disabled:checked:border-[var(--fg-muted)] relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[8px] checked:after:text-black checked:after:font-bold"
                    />
                  </label>
                )}
                {theme.id === "christmas" && (
                  <label
                    className={`ml-auto flex items-center gap-1 text-xs ${
                      currentTheme !== "christmas"
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    {...(currentTheme === "christmas" && {
                      "data-tooltip": EFFECT_TOOLTIP,
                    })}
                  >
                    <span className="text-[var(--fg-dim)] text-xs">+snow?</span>
                    <input
                      type="checkbox"
                      checked={christmasSnow}
                      disabled={currentTheme !== "christmas"}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (currentTheme === "christmas") {
                          onChristmasSnowChange(!christmasSnow);
                        }
                      }}
                      className="w-3 h-3 appearance-none rounded-sm border border-[var(--fg-muted)] bg-[var(--bg-highlight)] checked:bg-[var(--red)] checked:border-[var(--red)] disabled:checked:bg-[var(--fg-muted)] disabled:checked:border-[var(--fg-muted)] relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[8px] checked:after:text-white checked:after:font-bold"
                    />
                  </label>
                )}
                {theme.id === "space" && (
                  <label
                    className={`ml-auto flex items-center gap-1 text-xs ${
                      currentTheme !== "space"
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    {...(currentTheme === "space" && {
                      "data-tooltip": EFFECT_TOOLTIP,
                    })}
                  >
                    <span className="text-[var(--fg-dim)] text-xs">+warp?</span>
                    <input
                      type="checkbox"
                      checked={spaceStars}
                      disabled={currentTheme !== "space"}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (currentTheme === "space") {
                          onSpaceStarsChange(!spaceStars);
                        }
                      }}
                      className="w-3 h-3 appearance-none rounded-sm border border-[var(--fg-muted)] bg-[var(--bg-highlight)] checked:bg-[var(--accent)] checked:border-[var(--accent)] disabled:checked:bg-[var(--fg-muted)] disabled:checked:border-[var(--fg-muted)] relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[8px] checked:after:text-white checked:after:font-bold"
                    />
                  </label>
                )}
                {theme.id === "nightsky" && (
                  <label
                    className={`ml-auto flex items-center gap-1 text-xs ${
                      currentTheme !== "nightsky"
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    {...(currentTheme === "nightsky" && {
                      "data-tooltip": EFFECT_TOOLTIP,
                    })}
                  >
                    <span className="text-[var(--fg-dim)] text-xs">
                      +peace?
                    </span>
                    <input
                      type="checkbox"
                      checked={nightSkyRotation}
                      disabled={currentTheme !== "nightsky"}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (currentTheme === "nightsky") {
                          onNightSkyRotationChange(!nightSkyRotation);
                        }
                      }}
                      className="w-3 h-3 appearance-none rounded-sm border border-[var(--fg-muted)] bg-[var(--bg-highlight)] checked:bg-[var(--accent)] checked:border-[var(--accent)] disabled:checked:bg-[var(--fg-muted)] disabled:checked:border-[var(--fg-muted)] relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[8px] checked:after:text-white checked:after:font-bold"
                    />
                  </label>
                )}
                {theme.id === "synthwave" && (
                  <label
                    className={`ml-auto flex items-center gap-1 text-xs ${
                      currentTheme !== "synthwave"
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    {...(currentTheme === "synthwave" && {
                      "data-tooltip": EFFECT_TOOLTIP,
                    })}
                  >
                    <span className="text-[var(--fg-dim)] text-xs">
                      +vibes?
                    </span>
                    <input
                      type="checkbox"
                      checked={synthwaveGrid}
                      disabled={currentTheme !== "synthwave"}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (currentTheme === "synthwave") {
                          onSynthwaveGridChange(!synthwaveGrid);
                        }
                      }}
                      className="w-3 h-3 appearance-none rounded-sm border border-[var(--fg-muted)] bg-[var(--bg-highlight)] checked:bg-[var(--accent)] checked:border-[var(--accent)] disabled:checked:bg-[var(--fg-muted)] disabled:checked:border-[var(--fg-muted)] relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[8px] checked:after:text-white checked:after:font-bold"
                    />
                  </label>
                )}
                {theme.id === "ocean" && (
                  <label
                    className={`ml-auto flex items-center gap-1 text-xs ${
                      currentTheme !== "ocean"
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    {...(currentTheme === "ocean" && {
                      "data-tooltip": EFFECT_TOOLTIP,
                    })}
                  >
                    <span className="text-[var(--fg-dim)] text-xs">+dive?</span>
                    <input
                      type="checkbox"
                      checked={oceanBubbles}
                      disabled={currentTheme !== "ocean"}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (currentTheme === "ocean") {
                          onOceanBubblesChange(!oceanBubbles);
                        }
                      }}
                      className="w-3 h-3 appearance-none rounded-sm border border-[var(--fg-muted)] bg-[var(--bg-highlight)] checked:bg-[var(--accent)] checked:border-[var(--accent)] disabled:checked:bg-[var(--fg-muted)] disabled:checked:border-[var(--fg-muted)] relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[8px] checked:after:text-white checked:after:font-bold"
                    />
                  </label>
                )}
                {theme.id === "cyberpunk" && (
                  <label
                    className={`ml-auto flex items-center gap-1 text-xs ${
                      currentTheme !== "cyberpunk"
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    {...(currentTheme === "cyberpunk" && {
                      "data-tooltip": EFFECT_TOOLTIP,
                    })}
                  >
                    <span className="text-[var(--fg-dim)] text-xs">+rain?</span>
                    <input
                      type="checkbox"
                      checked={cyberpunkRain}
                      disabled={currentTheme !== "cyberpunk"}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (currentTheme === "cyberpunk") {
                          onCyberpunkRainChange(!cyberpunkRain);
                        }
                      }}
                      className="w-3 h-3 appearance-none rounded-sm border border-[var(--fg-muted)] bg-[var(--bg-highlight)] checked:bg-[var(--accent)] checked:border-[var(--accent)] disabled:checked:bg-[var(--fg-muted)] disabled:checked:border-[var(--fg-muted)] relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[8px] checked:after:text-white checked:after:font-bold"
                    />
                  </label>
                )}
                {theme.id === "sakura" && (
                  <label
                    className={`ml-auto flex items-center gap-1 text-xs ${
                      currentTheme !== "sakura"
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    {...(currentTheme === "sakura" && {
                      "data-tooltip": EFFECT_TOOLTIP,
                    })}
                  >
                    <span className="text-[var(--fg-dim)] text-xs">
                      +bloom?
                    </span>
                    <input
                      type="checkbox"
                      checked={sakuraPetals}
                      disabled={currentTheme !== "sakura"}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (currentTheme === "sakura") {
                          onSakuraPetalsChange(!sakuraPetals);
                        }
                      }}
                      className="w-3 h-3 appearance-none rounded-sm border border-[var(--fg-muted)] bg-[var(--bg-highlight)] checked:bg-[var(--accent)] checked:border-[var(--accent)] disabled:checked:bg-[var(--fg-muted)] disabled:checked:border-[var(--fg-muted)] relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[8px] checked:after:text-white checked:after:font-bold"
                    />
                  </label>
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
