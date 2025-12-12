"use client";

import { useEffect, useRef } from "react";

interface SnowEffectProps {
  enabled: boolean;
}

/**
 * Winter scene with mountains, trees, and falling snow for the Christmas theme.
 */
export function SnowEffect({ enabled }: SnowEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Snowflake {
      x: number;
      y: number;
      radius: number;
      speed: number;
      drift: number;
      opacity: number;
    }

    const snowflakes: Snowflake[] = [];
    const maxSnowflakes = 150;

    for (let i = 0; i < maxSnowflakes; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3 + 1,
        speed: Math.random() * 1.5 + 0.5,
        drift: Math.random() * 0.5 - 0.25,
        opacity: Math.random() * 0.6 + 0.4,
      });
    }

    const drawMountains = () => {
      const mountainColor1 = "rgba(200, 205, 215, 0.5)";
      const mountainColor2 = "rgba(185, 190, 205, 0.38)";
      const mountainColor3 = "rgba(170, 180, 195, 0.26)";

      ctx.fillStyle = mountainColor3;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height * 0.7);
      ctx.lineTo(width * 0.15, height * 0.5);
      ctx.lineTo(width * 0.3, height * 0.65);
      ctx.lineTo(width * 0.45, height * 0.45);
      ctx.lineTo(width * 0.6, height * 0.6);
      ctx.lineTo(width * 0.75, height * 0.4);
      ctx.lineTo(width * 0.9, height * 0.55);
      ctx.lineTo(width, height * 0.5);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = mountainColor2;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height * 0.6);
      ctx.lineTo(width * 0.2, height * 0.45);
      ctx.lineTo(width * 0.35, height * 0.55);
      ctx.lineTo(width * 0.5, height * 0.38);
      ctx.lineTo(width * 0.65, height * 0.5);
      ctx.lineTo(width * 0.85, height * 0.42);
      ctx.lineTo(width, height * 0.55);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = mountainColor1;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height * 0.65);
      ctx.lineTo(width * 0.1, height * 0.55);
      ctx.lineTo(width * 0.25, height * 0.62);
      ctx.lineTo(width * 0.4, height * 0.5);
      ctx.lineTo(width * 0.55, height * 0.58);
      ctx.lineTo(width * 0.7, height * 0.48);
      ctx.lineTo(width * 0.85, height * 0.56);
      ctx.lineTo(width, height * 0.6);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    };

    const drawTree = (x: number, baseY: number, treeHeight: number, opacity: number) => {
      const trunkWidth = treeHeight * 0.08;
      const trunkHeight = treeHeight * 0.15;

      ctx.fillStyle = `rgba(40, 25, 15, ${opacity})`;
      ctx.fillRect(x - trunkWidth / 2, baseY - trunkHeight, trunkWidth, trunkHeight);

      ctx.fillStyle = `rgba(20, 50, 30, ${opacity})`;
      const layers = 4;
      for (let i = 0; i < layers; i++) {
        const layerWidth = treeHeight * (0.5 - i * 0.08);
        const layerHeight = treeHeight * 0.3;
        const layerY = baseY - trunkHeight - i * layerHeight * 0.7;

        ctx.beginPath();
        ctx.moveTo(x, layerY - layerHeight);
        ctx.lineTo(x + layerWidth, layerY);
        ctx.lineTo(x - layerWidth, layerY);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
      for (let i = 0; i < layers; i++) {
        const layerWidth = treeHeight * (0.5 - i * 0.08) * 0.3;
        const layerHeight = treeHeight * 0.1;
        const layerY = baseY - trunkHeight - i * (treeHeight * 0.3) * 0.7;

        ctx.beginPath();
        ctx.moveTo(x, layerY - layerHeight - treeHeight * 0.2);
        ctx.lineTo(x + layerWidth, layerY - treeHeight * 0.15);
        ctx.lineTo(x - layerWidth, layerY - treeHeight * 0.15);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawTrees = () => {
      const treePositions = [
        { x: 0.05, size: 0.12, opacity: 0.7 },
        { x: 0.12, size: 0.18, opacity: 0.8 },
        { x: 0.22, size: 0.1, opacity: 0.6 },
        { x: 0.78, size: 0.15, opacity: 0.75 },
        { x: 0.88, size: 0.2, opacity: 0.85 },
        { x: 0.95, size: 0.11, opacity: 0.65 },
        { x: 0.03, size: 0.08, opacity: 0.5 },
        { x: 0.97, size: 0.09, opacity: 0.55 },
      ];

      for (const tree of treePositions) {
        drawTree(width * tree.x, height, height * tree.size, tree.opacity);
      }
    };

    const drawSnow = () => {
      for (const flake of snowflakes) {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        ctx.fill();

        flake.y += flake.speed;
        flake.x += flake.drift + Math.sin(flake.y * 0.01) * 0.5;

        if (flake.y > height) {
          flake.y = -flake.radius;
          flake.x = Math.random() * width;
        }

        if (flake.x > width) flake.x = 0;
        if (flake.x < 0) flake.x = width;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      drawMountains();
      drawTrees();
      drawSnow();
    };

    const interval = setInterval(draw, 33);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}

