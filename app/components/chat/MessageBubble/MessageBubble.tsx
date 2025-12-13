import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageBubbleProps } from "./types";

/**
 * Neovim-style message display component.
 * Uses line prefixes instead of bubbles.
 * Renders markdown for assistant messages.
 *
 * @component
 * @param props - Component props
 * @param props.message - The message object to display
 * @returns The message component
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const validSources =
    message.sources?.filter(
      (source) => source.name?.trim() && source.url?.trim()
    ) || [];
  const hasSources = !isUser && validSources.length > 0;

  return (
    <div className="animate-fade-in py-2 border-b border-[var(--bg-highlight)]">
      <div className="flex gap-3">
        <span
          className={`shrink-0 ${
            isUser ? "text-[var(--blue)]" : "text-[var(--green)]"
          }`}
        >
          {isUser ? ">" : "λ"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[var(--fg-muted)] mb-1">
            {isUser ? "you" : "assistant"}
          </div>
          {isUser ? (
            <div className="text-[var(--fg)] whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <div className="prose-chat text-[var(--fg)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {hasSources && (
            <div className="mt-3 pt-2 border-t border-[var(--bg-highlight)]">
              <div className="text-xs text-[var(--fg-muted)] mb-1">
                sources:
              </div>
              <div className="flex flex-wrap gap-2">
                {validSources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-[var(--bg-highlight)] text-[var(--blue)] hover:text-[var(--fg)] transition-colors"
                  >
                    <span>→</span>
                    <span>{source.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
