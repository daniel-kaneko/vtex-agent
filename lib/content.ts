import * as cheerio from "cheerio";
import type { ExtractOptions } from "@/types";

export type { ExtractOptions };

export const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "footer",
  "header",
  ".nav",
  ".navigation",
  ".menu",
  ".sidebar",
  ".footer",
  ".header",
  ".ads",
  ".advertisement",
  ".cookie-banner",
  ".popup",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
] as const;

export const CONTENT_SELECTORS = [
  "article",
  "main",
  "[role='main']",
  ".content",
  "#content",
  ".post-content",
  ".article-content",
  ".documentation",
  ".docs-content",
  ".markdown-body",
  ".prose",
] as const;

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

export function extractWithSelector(html: string, selector: string): string {
  const $ = cheerio.load(html);
  const selected = $(selector).first();

  if (selected.length === 0) return "";

  REMOVE_SELECTORS.forEach((sel) => selected.find(sel).remove());
  return cleanText(selected.text());
}

export function extractContentAuto(html: string): string {
  const $ = cheerio.load(html);
  REMOVE_SELECTORS.forEach((selector) => $(selector).remove());

  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector).first();
    if (element.length > 0) return cleanText(element.text());
  }

  return cleanText($("body").text());
}

/**
 * Extracts content from HTML using CSS selectors.
 * Falls back to auto-detection if selectors don't match.
 */
export function extractHtmlContent(
  html: string,
  selector?: string | string[],
  silent = false
): string {
  if (!selector) return extractContentAuto(html);

  const selectors = Array.isArray(selector) ? selector : [selector];

  for (const sel of selectors) {
    const content = extractWithSelector(html, sel);
    if (content) return content;
  }

  if (!silent) {
    console.log(
      `      ⚠️ Selectors [${selectors.join(", ")}] returned empty, using auto-detect`
    );
  }

  return extractContentAuto(html);
}

/**
 * Main content extraction function.
 * @param content The raw HTML content string.
 * @param options Extraction options including selector.
 * @returns The extracted text content.
 */
export function extractContent(
  content: string,
  options?: ExtractOptions | string | string[],
  silent = false
): string {
  if (typeof options === "string" || Array.isArray(options)) {
    return extractHtmlContent(content, options, silent);
  }

  const { selector, silent: optionsSilent = silent } = options || {};

  return extractHtmlContent(content, selector, optionsSilent);
}

export function extractTitle(html: string): string {
  const $ = cheerio.load(html);
  return cleanText($("title").text() || $("h1").first().text() || "");
}
