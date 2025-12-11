/**
 * Types for the Header component
 * @module chat/Header/types
 */

import { ReactNode } from "react";

/**
 * Props for the Header component
 */
export interface HeaderProps {
  /** Optional custom title to display */
  title?: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional right-side content (e.g., ThemeSelector) */
  children?: ReactNode;
}
