/**
 * Content extraction types
 * @module types/content
 */

/**
 * Options for HTML content extraction
 */
export interface ExtractOptions {
  /** CSS selector(s) to extract content from */
  selector?: string | string[];
  /** Suppress warnings when selectors don't match */
  silent?: boolean;
}

