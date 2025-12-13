"use client";

import { useCallback, useRef } from "react";
import { useCanvasAnimation } from "@/hooks/useCanvasAnimation";

interface CanvasEffectProps {
  enabled: boolean;
  fps?: number;
  canvasStyle?: React.CSSProperties;
  reducedMotionStyle: React.CSSProperties;
  onInit?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  onDraw: (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => void;
  onResize?: (width: number, height: number) => void;
}

/**
 * Reusable canvas-based effect component.
 * Handles enabled state, reduced motion fallback, and canvas rendering.
 */
export function CanvasEffect({
  enabled,
  fps,
  canvasStyle,
  reducedMotionStyle,
  onInit,
  onDraw,
  onResize,
}: CanvasEffectProps) {
  const initCalledRef = useRef(false);

  const stableOnInit = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (!initCalledRef.current) {
        initCalledRef.current = true;
        onInit?.(ctx, width, height);
      }
    },
    [onInit]
  );

  const { canvasRef, prefersReducedMotion } = useCanvasAnimation({
    enabled,
    fps,
    onInit: stableOnInit,
    onDraw,
    onResize,
  });

  if (prefersReducedMotion && enabled) {
    return (
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={reducedMotionStyle}
      />
    );
  }

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={canvasStyle}
    />
  );
}
