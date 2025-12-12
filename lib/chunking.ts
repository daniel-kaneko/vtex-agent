import crypto from "crypto";

export const DEFAULT_CHUNK_SIZE = 800;
export const DEFAULT_CHUNK_OVERLAP = 100;
export const MIN_CHUNK_LENGTH = 50;

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
  minLength?: number;
}

export interface ChunkDoc {
  id: string;
  text: string;
  source: string;
  url: string;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_CHUNK_OVERLAP,
    minLength = MIN_CHUNK_LENGTH,
  } = options;

  if (text.length <= chunkSize) {
    return text.trim().length >= minLength ? [text.trim()] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      const searchStart = Math.max(end - 100, start);
      const searchText = text.slice(searchStart, end);
      const sentenceEnd = searchText.search(/[.!?]\s/);

      if (sentenceEnd !== -1) {
        end = searchStart + sentenceEnd + 2;
      } else {
        const lastSpace = text.lastIndexOf(" ", end);
        if (lastSpace > start + overlap) end = lastSpace;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= minLength) chunks.push(chunk);

    const nextStart = end - overlap;
    if (nextStart <= start) {
      start = start + chunkSize - overlap;
    } else {
      start = nextStart;
    }

    if (start >= text.length) break;
  }

  return chunks;
}

export function hashString(str: string, length = 16): string {
  return crypto.createHash("md5").update(str).digest("hex").slice(0, length);
}

export function generateChunkId(
  prefix: string,
  url: string,
  chunkIndex: number
): string {
  return `${prefix}_${hashString(url)}_chunk_${chunkIndex}`;
}

export function createChunkDocs(
  text: string,
  options: {
    idPrefix: string;
    url: string;
    source: string;
    chunkOptions?: ChunkOptions;
  }
): ChunkDoc[] {
  const { idPrefix, url, source, chunkOptions } = options;
  return chunkText(text, chunkOptions).map((chunkText, idx) => ({
    id: generateChunkId(idPrefix, url, idx),
    text: chunkText,
    source,
    url,
  }));
}
