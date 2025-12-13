"use client";

import { useCallback, useRef } from "react";
import { CanvasEffect } from "../CanvasEffect";
import { themeConfig } from "../config";

interface NightSkyEffectProps {
  enabled: boolean;
}

interface Star {
  angle: number;
  distance: number;
  size: number;
  brightness: number;
  speed: number;
  twinkleOffset: number;
}

const config = themeConfig.nightsky;

const TREES = [
  { x: 0.03, height: 0.07 },
  { x: 0.08, height: 0.09 },
  { x: 0.14, height: 0.065 },
  { x: 0.38, height: 0.08 },
  { x: 0.44, height: 0.06 },
  { x: 0.5, height: 0.075 },
  { x: 0.78, height: 0.085 },
  { x: 0.85, height: 0.065 },
  { x: 0.92, height: 0.08 },
  { x: 0.97, height: 0.055 },
];

/**
 * Night sky effect with rotating stars and landscape silhouette.
 */
export function NightSkyEffect({ enabled }: NightSkyEffectProps) {
  const starsRef = useRef<Star[]>([]);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const onInit = useCallback(
    (_ctx: CanvasRenderingContext2D, width: number, height: number) => {
      dimensionsRef.current = { width, height };
      const maxDim = Math.max(width, height);
      starsRef.current = Array.from({ length: config.maxStars }, () => ({
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * maxDim * 1.2 + 30,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.6 + 0.4,
        speed: 1 + Math.random() * 0.1 - 0.05,
        twinkleOffset: Math.random() * Math.PI * 2,
      }));
    },
    []
  );

  const onResize = useCallback((width: number, height: number) => {
    dimensionsRef.current = { width, height };
  }, []);

  const onDraw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0a0a1a");
      gradient.addColorStop(0.3, "#0d1025");
      gradient.addColorStop(0.6, "#111428");
      gradient.addColorStop(1, "#151830");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const poleX = width * 0.5;
      const poleY = height * 0.88;
      const now = Date.now();
      const maxDim = Math.max(width, height);

      for (const star of starsRef.current) {
        star.angle += config.speed * star.speed;

        const x = poleX + Math.cos(star.angle) * star.distance;
        const y = poleY + Math.sin(star.angle) * star.distance;

        if (y > height * 0.92) continue;

        const distFromPole = star.distance / (maxDim * 1.2);
        const alpha = star.brightness * config.opacity * (0.5 + distFromPole * 0.5);
        const twinkle = Math.sin(now * 0.0015 + star.twinkleOffset) * 0.18 + 0.82;
        const finalAlpha = alpha * twinkle;

        const hue = 200 + star.twinkleOffset * 6;
        const sat = 10 + distFromPole * 20;
        const light = 80 + distFromPole * 15;

        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${finalAlpha})`;
        ctx.fill();

        if (star.size > 1.2 && finalAlpha > 0.3) {
          ctx.beginPath();
          ctx.arc(x, y, star.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${finalAlpha * 0.1})`;
          ctx.fill();
        }
      }

      const landscapeHeight = height * 0.08;
      const baseY = height - landscapeHeight;

      ctx.fillStyle = "#0a0c12";
      ctx.beginPath();
      ctx.moveTo(0, height);
      const points = [
        { x: 0, y: baseY + landscapeHeight * 0.2 },
        { x: width * 0.1, y: baseY + landscapeHeight * 0.15 },
        { x: width * 0.2, y: baseY + landscapeHeight * 0.25 },
        { x: width * 0.3, y: baseY + landscapeHeight * 0.1 },
        { x: width * 0.4, y: baseY + landscapeHeight * 0.2 },
        { x: width * 0.5, y: baseY + landscapeHeight * 0.15 },
        { x: width * 0.6, y: baseY + landscapeHeight * 0.25 },
        { x: width * 0.7, y: baseY + landscapeHeight * 0.1 },
        { x: width * 0.8, y: baseY + landscapeHeight * 0.2 },
        { x: width * 0.9, y: baseY + landscapeHeight * 0.15 },
        { x: width, y: baseY + landscapeHeight * 0.2 },
      ];
      for (const point of points) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      for (const tree of TREES) {
        drawTree(ctx, width * tree.x, height, height * tree.height);
      }
    },
    []
  );

  return (
    <CanvasEffect
      enabled={enabled}
      fps={config.fps}
      reducedMotionStyle={{
        background: "linear-gradient(to bottom, #0a0a1a 0%, #0d1025 30%, #111428 60%, #151830 100%)",
      }}
      onInit={onInit}
      onDraw={onDraw}
      onResize={onResize}
    />
  );
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, treeHeight: number) {
  ctx.fillStyle = "#050608";

  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x - treeHeight * 0.25, baseY);
  ctx.lineTo(x, baseY - treeHeight);
  ctx.lineTo(x + treeHeight * 0.25, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, baseY - treeHeight * 0.3);
  ctx.lineTo(x - treeHeight * 0.2, baseY - treeHeight * 0.3);
  ctx.lineTo(x, baseY - treeHeight * 1.15);
  ctx.lineTo(x + treeHeight * 0.2, baseY - treeHeight * 0.3);
  ctx.closePath();
  ctx.fill();
}
