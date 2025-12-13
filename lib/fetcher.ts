import pLimit from "p-limit";

export interface FetchOptions {
  userAgent?: string;
  accept?: string;
  retries?: number;
  retryDelay?: number;
}

export interface ConcurrentFetchOptions extends FetchOptions {
  concurrency?: number;
  rateLimitMs?: number;
  onProgress?: (
    completed: number,
    total: number,
    url: string,
    success: boolean
  ) => void;
}

export interface FetchTask<T> {
  url: string;
  meta?: T;
}

export interface FetchResult<T> {
  url: string;
  content: string | null;
  error: string | null;
  meta?: T;
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0";
const DEFAULT_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9";
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_RATE_LIMIT_MS = 300;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUrl(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const {
    userAgent = DEFAULT_USER_AGENT,
    accept = DEFAULT_ACCEPT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
  } = options;

  const cacheBustUrl = new URL(url);
  cacheBustUrl.searchParams.set("_t", Date.now().toString());

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(cacheBustUrl.toString(), {
        headers: {
          "User-Agent": userAgent,
          Accept: accept,
          "Cache-Control": "no-cache, no-store",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await delay(retryDelay * (attempt + 1));
      }
    }
  }

  throw lastError || new Error("Unknown fetch error");
}

export async function fetchConcurrent<T = unknown>(
  tasks: FetchTask<T>[],
  options: ConcurrentFetchOptions = {}
): Promise<FetchResult<T>[]> {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    rateLimitMs = DEFAULT_RATE_LIMIT_MS,
    onProgress,
    ...fetchOptions
  } = options;

  const limit = pLimit(concurrency);
  const results: FetchResult<T>[] = [];
  let completed = 0;

  const fetchTask = async (task: FetchTask<T>): Promise<FetchResult<T>> => {
    try {
      const content = await fetchUrl(task.url, fetchOptions);
      if (rateLimitMs > 0) await delay(rateLimitMs);

      return { url: task.url, content, error: null, meta: task.meta };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        url: task.url,
        content: null,
        error: errorMessage,
        meta: task.meta,
      };
    } finally {
      completed++;
      const success =
        results.find((result) => result.url === task.url)?.content !== null;
      onProgress?.(completed, tasks.length, task.url, success);
    }
  };

  return Promise.all(tasks.map((task) => limit(() => fetchTask(task))));
}

export async function processConcurrent<TInput, TOutput>(
  items: TInput[],
  processor: (item: TInput, index: number) => Promise<TOutput>,
  options: {
    concurrency?: number;
    rateLimitMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<TOutput[]> {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    rateLimitMs = DEFAULT_RATE_LIMIT_MS,
    onProgress,
  } = options;

  const limit = pLimit(concurrency);
  let completed = 0;

  const processTask = async (item: TInput, index: number): Promise<TOutput> => {
    try {
      const result = await processor(item, index);
      if (rateLimitMs > 0) await delay(rateLimitMs);
      return result;
    } finally {
      completed++;
      onProgress?.(completed, items.length);
    }
  };

  return Promise.all(
    items.map((item, index) => limit(() => processTask(item, index)))
  );
}
