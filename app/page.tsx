"use client";

import { useState, useRef, useEffect } from "react";
import {
  Header,
  MessageBubble,
  TypingIndicator,
  EmptyState,
  ChatInput,
  ThemeSelector,
  Theme,
} from "./components/chat";
import {
  MatrixRain,
  SnowEffect,
  SpaceEffect,
  NightSkyEffect,
  SynthwaveEffect,
  OceanEffect,
  CyberpunkEffect,
  SakuraEffect,
} from "./components/themes";
import { useChat } from "@/hooks/useChat";

export default function Home() {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<Theme>("grey");
  const [matrixRain, setMatrixRain] = useState(false);
  const [christmasSnow, setChristmasSnow] = useState(false);
  const [spaceStars, setSpaceStars] = useState(false);
  const [nightSkyRotation, setNightSkyRotation] = useState(false);
  const [synthwaveGrid, setSynthwaveGrid] = useState(false);
  const [oceanBubbles, setOceanBubbles] = useState(false);
  const [cyberpunkRain, setCyberpunkRain] = useState(false);
  const [sakuraPetals, setSakuraPetals] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedRain = localStorage.getItem("matrixRain") === "true";
    const savedSnow = localStorage.getItem("christmasSnow") === "true";
    const savedStars = localStorage.getItem("spaceStars") === "true";
    const savedNightSky = localStorage.getItem("nightSkyRotation") === "true";
    const savedSynthwave = localStorage.getItem("synthwaveGrid") === "true";
    const savedOcean = localStorage.getItem("oceanBubbles") === "true";
    const savedCyberpunk = localStorage.getItem("cyberpunkRain") === "true";
    const savedSakura = localStorage.getItem("sakuraPetals") === "true";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
    setMatrixRain(savedRain);
    setChristmasSnow(savedSnow);
    setSpaceStars(savedStars);
    setNightSkyRotation(savedNightSky);
    setSynthwaveGrid(savedSynthwave);
    setOceanBubbles(savedOcean);
    setCyberpunkRain(savedCyberpunk);
    setSakuraPetals(savedSakura);
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

  const handleSpaceStarsChange = (enabled: boolean) => {
    setSpaceStars(enabled);
    localStorage.setItem("spaceStars", String(enabled));
  };

  const handleNightSkyRotationChange = (enabled: boolean) => {
    setNightSkyRotation(enabled);
    localStorage.setItem("nightSkyRotation", String(enabled));
  };

  const handleSynthwaveGridChange = (enabled: boolean) => {
    setSynthwaveGrid(enabled);
    localStorage.setItem("synthwaveGrid", String(enabled));
  };

  const handleOceanBubblesChange = (enabled: boolean) => {
    setOceanBubbles(enabled);
    localStorage.setItem("oceanBubbles", String(enabled));
  };

  const handleCyberpunkRainChange = (enabled: boolean) => {
    setCyberpunkRain(enabled);
    localStorage.setItem("cyberpunkRain", String(enabled));
  };

  const handleSakuraPetalsChange = (enabled: boolean) => {
    setSakuraPetals(enabled);
    localStorage.setItem("sakuraPetals", String(enabled));
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
          spaceStars={spaceStars}
          onSpaceStarsChange={handleSpaceStarsChange}
          nightSkyRotation={nightSkyRotation}
          onNightSkyRotationChange={handleNightSkyRotationChange}
          synthwaveGrid={synthwaveGrid}
          onSynthwaveGridChange={handleSynthwaveGridChange}
          oceanBubbles={oceanBubbles}
          onOceanBubblesChange={handleOceanBubblesChange}
          cyberpunkRain={cyberpunkRain}
          onCyberpunkRainChange={handleCyberpunkRainChange}
          sakuraPetals={sakuraPetals}
          onSakuraPetalsChange={handleSakuraPetalsChange}
        />
      </Header>

      <main className="flex-1 overflow-y-auto min-h-0 relative">
        <div className="sticky top-0 left-0 w-full h-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[calc(100vh-8rem)]">
            {theme === "matrix" && <MatrixRain enabled={matrixRain} />}
            {theme === "christmas" && <SnowEffect enabled={christmasSnow} />}
            {theme === "space" && <SpaceEffect enabled={spaceStars} />}
            {theme === "nightsky" && <NightSkyEffect enabled={nightSkyRotation} />}
            {theme === "synthwave" && <SynthwaveEffect enabled={synthwaveGrid} />}
            {theme === "ocean" && <OceanEffect enabled={oceanBubbles} />}
            {theme === "cyberpunk" && <CyberpunkEffect enabled={cyberpunkRain} />}
            {theme === "sakura" && <SakuraEffect enabled={sakuraPetals} />}
          </div>
        </div>
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
