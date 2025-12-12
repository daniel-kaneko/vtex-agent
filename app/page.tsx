"use client";

import { useState, useRef, useEffect } from "react";
import {
  Header,
  MessageBubble,
  TypingIndicator,
  EmptyState,
  ChatInput,
  ThemeSelector,
  MatrixRain,
  SnowEffect,
  Theme,
} from "./components/chat";
import { useChat } from "@/hooks/useChat";

export default function Home() {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<Theme>("grey");
  const [matrixRain, setMatrixRain] = useState(false);
  const [christmasSnow, setChristmasSnow] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedRain = localStorage.getItem("matrixRain") === "true";
    const savedSnow = localStorage.getItem("christmasSnow") === "true";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
    setMatrixRain(savedRain);
    setChristmasSnow(savedSnow);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "grey")
      return document.documentElement.removeAttribute("data-theme");

    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleMatrixRainChange = (enabled: boolean) => {
    setMatrixRain(enabled);
    localStorage.setItem("matrixRain", String(enabled));
  };

  const handleChristmasSnowChange = (enabled: boolean) => {
    setChristmasSnow(enabled);
    localStorage.setItem("christmasSnow", String(enabled));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const content = input.trim();
    setInput("");
    await sendMessage(content);
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      <Header>
        <ThemeSelector
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          matrixRain={matrixRain}
          onMatrixRainChange={handleMatrixRainChange}
          christmasSnow={christmasSnow}
          onChristmasSnowChange={handleChristmasSnowChange}
        />
      </Header>

      <main className="flex-1 overflow-y-auto min-h-0 relative">
        {theme === "matrix" && <MatrixRain enabled={matrixRain} />}
        {theme === "christmas" && <SnowEffect enabled={christmasSnow} />}
        <div className="max-w-4xl mx-auto px-4 py-4 relative z-10">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="py-2 border-b border-[var(--bg-highlight)]">
                  <div className="flex gap-3">
                    <span className="text-[var(--green)]">λ</span>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
