import { NextResponse } from "next/server";
import { getCollectionStats } from "@/lib/chroma-rest";
import type { HealthStatus } from "@/types";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

export async function GET() {
  const health: HealthStatus = {
    status: "healthy",
    services: {
      ollama: { status: "down" },
      chroma: { status: "down" },
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    health.services.ollama = res.ok
      ? { status: "up" }
      : { status: "down", message: `HTTP ${res.status}` };
  } catch (error) {
    health.services.ollama = {
      status: "down",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }

  try {
    const stats = await getCollectionStats();
    health.services.chroma = { status: "up", docCount: stats.count };
  } catch (error) {
    health.services.chroma = {
      status: "down",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }

  const ollamaUp = health.services.ollama.status === "up";
  const chromaUp = health.services.chroma.status === "up";

  if (!ollamaUp && !chromaUp) {
    health.status = "unhealthy";
  } else if (ollamaUp && chromaUp) {
    health.status = "healthy";
  } else {
    health.status = "degraded";
  }

  const httpStatus = health.status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, { status: httpStatus });
}

