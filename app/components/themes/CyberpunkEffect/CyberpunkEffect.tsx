"use client";

import { useCallback, useRef } from "react";
import { CanvasEffect } from "../CanvasEffect";
import { themeConfig } from "../config";

interface CyberpunkEffectProps {
  enabled: boolean;
}

interface Raindrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

const config = themeConfig.cyberpunk;

/**
 * Cyberpunk neon rain effect with falling droplets.
 */
export function CyberpunkEffect({ enabled }: CyberpunkEffectProps) {
  const raindropsRef = useRef<Raindrop[]>([]);

  const onInit = useCallback(
    (_ctx: CanvasRenderingContext2D, width: number, height: number) => {
      raindropsRef.current = Array.from(
        { length: config.maxRaindrops },
        () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          length: Math.random() * 20 + 10,
          speed: (Math.random() * 8 + 4) * config.speed,
          opacity: (Math.random() * 0.3 + 0.1) * config.opacity,
        })
      );
    },
    []
  );

  const onDraw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.fillStyle = "rgba(10, 10, 18, 0.3)";
      ctx.fillRect(0, 0, width, height);

      const gradient1 = ctx.createRadialGradient(
        width * 0.8,
        height * 0.2,
        0,
        width * 0.8,
        height * 0.2,
        width * 0.4
      );
      gradient1.addColorStop(0, "rgba(255, 42, 109, 0.05)");
      gradient1.addColorStop(1, "transparent");
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);

      const gradient2 = ctx.createRadialGradient(
        width * 0.2,
        height * 0.7,
        0,
        width * 0.2,
        height * 0.7,
        width * 0.3
      );
      gradient2.addColorStop(0, "rgba(1, 200, 238, 0.04)");
      gradient2.addColorStop(1, "transparent");
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      for (const drop of raindropsRef.current) {
        drop.y += drop.speed;

        if (drop.y > height) {
          drop.y = -drop.length;
          drop.x = Math.random() * width;
        }

        const color =
          config.colors[Math.floor(drop.x / 100) % config.colors.length];

        const gradient = ctx.createLinearGradient(
          drop.x,
          drop.y,
          drop.x,
          drop.y + drop.length
        );
        gradient.addColorStop(0, `${color}00`);
        gradient.addColorStop(
          0.5,
          color +
            Math.round(drop.opacity * 255)
              .toString(16)
              .padStart(2, "0")
        );
        gradient.addColorStop(1, `${color}00`);

        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.length);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
    []
  );

  return (
    <CanvasEffect
      enabled={enabled}
      fps={config.fps}
      reducedMotionStyle={{
        background:
          "radial-gradient(ellipse at 80% 20%, rgba(255, 42, 109, 0.1) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 20% 70%, rgba(1, 200, 238, 0.08) 0%, transparent 40%), " +
          "linear-gradient(to bottom, #12121a 0%, #1a1a25 100%)",
      }}
      onInit={onInit}
      onDraw={onDraw}
    />
  );
}
