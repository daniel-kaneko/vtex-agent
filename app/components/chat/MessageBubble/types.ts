/**
 * Types for the MessageBubble component
 * @module chat/MessageBubble/types
 */

import type { Message } from "@/types";

/**
 * Props for the MessageBubble component
 */
export interface MessageBubbleProps {
  /** The message object to display */
  message: Message;
  /** Whether to show the assistant avatar (default: true for assistant messages) */
  showAvatar?: boolean;
}

