/**
 * Chat domain types
 * @module types/chat
 */

/**
 * Represents a source document used in responses
 */
export interface Source {
  /** Display name of the source */
  name: string;
  /** URL to the source documentation */
  url: string;
}

/**
 * Represents a chat message in the conversation
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender */
  role: "system" | "user" | "assistant";
  /** Text content of the message */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
  /** Sources used for assistant responses */
  sources?: Source[];
}

/**
 * Simplified message format for API requests
 */
export interface ApiMessage {
  /** Role of the message sender */
  role: "system" | "user" | "assistant";
  /** Text content of the message */
  content: string;
}

