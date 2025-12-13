"use client";

import { useState, useCallback } from "react";
import { CONTEXT_WINDOW, API_ENDPOINTS } from "@/lib/constants";
import type { Message, StreamEvent } from "@/types";

/**
 * Custom hook for chat functionality with streaming support.
 * Handles message state, API communication, and streaming responses.
 */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      const assistantId = crypto.randomUUID();

      setMessages((currentMessages) => [...currentMessages, userMessage]);
      setIsLoading(true);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          sources: [],
        },
      ]);

      try {
        const recentMessages = [...messages, userMessage]
          .slice(-CONTEXT_WINDOW)
          .map((message) => ({ role: message.role, content: message.content }));

        const res = await fetch(API_ENDPOINTS.ask, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: recentMessages, stream: true }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Request failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event: StreamEvent = JSON.parse(jsonStr);

              if (event.type === "chunk" && event.content) {
                setMessages((currentMessages) =>
                  currentMessages.map((message) =>
                    message.id === assistantId
                      ? { ...message, content: message.content + event.content }
                      : message
                  )
                );
              } else if (event.type === "done") {
                setMessages((currentMessages) =>
                  currentMessages.map((message) =>
                    message.id === assistantId
                      ? { ...message, sources: event.sources || [] }
                      : message
                  )
                );
              }
            } catch {}
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "failed to connect to server";
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantId
              ? { ...message, content: `error: ${errorMessage}` }
              : message
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
