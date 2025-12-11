import { EmptyStateProps } from "./types";

/**
 * Neovim-style empty buffer display.
 *
 * @component
 * @param props - Component props
 * @returns The empty state component
 */
export function EmptyState({}: EmptyStateProps) {
  return (
    <div className="py-8 text-[var(--fg-muted)]">
      <div className="space-y-1">
        <p className="text-[var(--fg)]">vtex-agent v0.1.0</p>
        <p>&nbsp;</p>
        <p>
          type a question and press{" "}
          <span className="text-[var(--yellow)]">Enter</span> to ask
        </p>
        <p>&nbsp;</p>
        <p className="text-[var(--fg-dim)]">~ Ask anything about VTEX</p>
        <p>&nbsp;</p>
      </div>
    </div>
  );
}
