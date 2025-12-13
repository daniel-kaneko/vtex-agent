"use client";

import { useCallback, useRef } from "react";
import { CanvasEffect } from "../CanvasEffect";
import { themeConfig } from "../config";

interface SakuraEffectProps {
  enabled: boolean;
}

interface Petal {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  speedX: number;
  speedY: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
}

const config = themeConfig.sakura;

/**
 * Sakura cherry blossom effect with falling petals.
 */
export function SakuraEffect({ enabled }: SakuraEffectProps) {
  const petalsRef = useRef<Petal[]>([]);

  const onInit = useCallback(
    (_ctx: CanvasRenderingContext2D, width: number, height: number) => {
      petalsRef.current = Array.from({ length: config.maxPetals }, () => ({
        x: Math.random() * width,
        y: Math.random() * height - height,
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: (Math.random() * 1 + 0.5) * config.speed,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        opacity: (Math.random() * 0.4 + 0.3) * config.opacity,
      }));
    },
    []
  );

  const onDraw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const petal of petalsRef.current) {
        petal.wobble += petal.wobbleSpeed;
        petal.x += petal.speedX + Math.sin(petal.wobble) * 0.5;
        petal.y += petal.speedY;
        petal.rotation += petal.rotationSpeed;

        if (petal.y > height + petal.size) {
          petal.y = -petal.size * 2;
          petal.x = Math.random() * width;
        }
        if (petal.x > width + petal.size) petal.x = -petal.size;
        if (petal.x < -petal.size) petal.x = width + petal.size;

        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rotation);
        ctx.globalAlpha = petal.opacity;

        ctx.beginPath();
        ctx.moveTo(0, -petal.size);
        ctx.bezierCurveTo(
          petal.size * 0.8,
          -petal.size * 0.5,
          petal.size * 0.8,
          petal.size * 0.5,
          0,
          petal.size
        );
        ctx.bezierCurveTo(
          -petal.size * 0.8,
          petal.size * 0.5,
          -petal.size * 0.8,
          -petal.size * 0.5,
          0,
          -petal.size
        );

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, petal.size);
        gradient.addColorStop(0, "#ffb7c5");
        gradient.addColorStop(0.5, "#ff90b3");
        gradient.addColorStop(1, "#ff7aa2");

        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
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
          "linear-gradient(to bottom, #231c28 0%, #2d2533 50%, #3d3345 100%)",
      }}
      onInit={onInit}
      onDraw={onDraw}
    />
  );
}
