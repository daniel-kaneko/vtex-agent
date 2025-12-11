import { TypingIndicatorProps } from "./types";

/**
 * Neovim-style typing indicator with blinking cursor.
 *
 * @component
 * @param props - Component props
 * @returns The typing indicator component
 */
export function TypingIndicator({}: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-1 py-1 text-[var(--fg-muted)]">
      <span className="text-[var(--yellow)]">~</span>
      <span>thinking</span>
      <span className="cursor-blink">▋</span>
    </div>
  );
}
