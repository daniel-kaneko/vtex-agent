/**
 * Centralized configuration for all theme effects.
 * Adjust speed and opacity values here to control all effects.
 */

export const themeConfig = {
  matrix: {
    fps: 20,
    speed: 1,
    opacity: 0.15,
    fontSize: 14,
    chars: "01",
    color: "#00ff41",
  },

  snow: {
    fps: 30,
    speed: 1,
    opacity: 1,
    maxSnowflakes: 150,
    snowflakeMinRadius: 1,
    snowflakeMaxRadius: 4,
  },

  space: {
    fps: 60,
    speed: 0.25,
    opacity: 0.4,
    maxStars: 300,
    maxDepth: 2000,
    spread: 2000,
  },

  nightsky: {
    fps: 60,
    speed: 0.0005,
    opacity: 0.5,
    maxStars: 650,
  },

  synthwave: {
    fps: 60,
    speed: 0.1,
    opacity: 0.4,
  },

  ocean: {
    fps: 60,
    speed: 0.25,
    opacity: 1,
    maxBubbles: 40,
    causticOpacity: 0.03,
  },

  cyberpunk: {
    fps: 30,
    speed: 0.15,
    opacity: 1,
    maxRaindrops: 100,
    colors: ["#01c8ee", "#ff2a6d", "#05ffa1", "#f9f002"],
  },

  sakura: {
    fps: 30,
    speed: 0.5,
    opacity: 1,
    maxPetals: 50,
  },
} as const;

export type ThemeConfigKey = keyof typeof themeConfig;
