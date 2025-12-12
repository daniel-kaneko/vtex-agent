/**
 * Types for the ThemeSelector component
 * @module chat/ThemeSelector/types
 */

/**
 * Available theme options
 */
export type Theme = "grey" | "gruvbox" | "nord" | "tokyo" | "catppuccin" | "matrix";

/**
 * Props for the ThemeSelector component
 */
export interface ThemeSelectorProps {
  /** Currently selected theme */
  currentTheme: Theme;
  /** Callback when theme changes */
  onThemeChange: (theme: Theme) => void;
  /** Whether matrix rain effect is enabled */
  matrixRain: boolean;
  /** Callback when matrix rain toggle changes */
  onMatrixRainChange: (enabled: boolean) => void;
}

/**
 * Theme option definition
 */
export interface ThemeOption {
  id: Theme;
  name: string;
  color: string;
}

