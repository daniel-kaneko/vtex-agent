/**
 * API route types
 * @module types/api
 */

import type { Source } from "./chat";

/**
 * Server-Sent Event for streaming responses
 */
export interface StreamEvent {
  type: "chunk" | "done";
  content?: string;
  sources?: Source[];
}

/**
 * Health check status for individual services
 */
export interface ServiceHealth {
  status: "up" | "down";
  message?: string;
  docCount?: number;
}

/**
 * Overall health status response
 */
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    ollama: ServiceHealth;
    chroma: ServiceHealth;
  };
  timestamp: string;
}

/**
 * Request body for the /api/ask endpoint
 */
export interface AskRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  stream?: boolean;
  useRAG?: boolean;
  topK?: number;
}

/**
 * Non-streaming response from /api/ask
 */
export interface AskResponse {
  output: string;
  sources: Source[];
}

/**
 * Error response format
 */
export interface ApiError {
  error: string;
  details?: string;
}

