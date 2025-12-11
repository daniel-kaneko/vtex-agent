/**
 * Types for the ChatInput component
 * @module chat/ChatInput/types
 */

/**
 * Props for the ChatInput component
 */
export interface ChatInputProps {
  /** Current value of the input */
  value: string;
  /** Callback when input value changes */
  onChange: (value: string) => void;
  /** Callback when form is submitted */
  onSubmit: () => void;
  /** Whether the input is in loading state */
  isLoading: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Footer text displayed below the input */
  footerText?: string;
}

