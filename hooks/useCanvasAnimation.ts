"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "./useReducedMotion";

interface CanvasAnimationOptions {
  enabled: boolean;
  fps?: number;
  onInit?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  onDraw: (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => void;
  onResize?: (width: number, height: number) => void;
}

interface CanvasAnimationResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  prefersReducedMotion: boolean;
}

/**
 * Custom hook for canvas-based animations.
 * Handles canvas setup, resize, animation loop with optional FPS throttling, and cleanup.
 */
export function useCanvasAnimation({
  enabled,
  fps,
  onInit,
  onDraw,
  onResize,
}: CanvasAnimationOptions): CanvasAnimationResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const timeRef = useRef(0);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const stableOnInit = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      onInit?.(ctx, width, height);
    },
    [onInit]
  );

  const stableOnResize = useCallback(
    (width: number, height: number) => {
      onResize?.(width, height);
    },
    [onResize]
  );

  useEffect(() => {
    if (!enabled || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
      dimensionsRef.current = { width, height };
      stableOnResize(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const { width, height } = dimensionsRef.current;
    stableOnInit(ctx, width, height);

    let animationId: number;
    let lastFrameTime = 0;
    const frameInterval = fps ? 1000 / fps : 0;

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);

      if (fps) {
        const deltaTime = currentTime - lastFrameTime;
        if (deltaTime < frameInterval) return;
        lastFrameTime = currentTime - (deltaTime % frameInterval);
      }

      timeRef.current++;
      const { width: w, height: h } = dimensionsRef.current;
      onDraw(ctx, w, h, timeRef.current);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [enabled, prefersReducedMotion, fps, onDraw, stableOnInit, stableOnResize]);

  return { canvasRef, prefersReducedMotion };
}

