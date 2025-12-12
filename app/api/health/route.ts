import { NextResponse } from "next/server";
import { getCollectionStats } from "@/lib/chroma-rest";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    ollama: { status: "up" | "down"; message?: string };
    chroma: { status: "up" | "down"; message?: string; docCount?: number };
  };
  timestamp: string;
}

export async function GET() {
  const health: HealthStatus = {
    status: "healthy",
    services: {
      ollama: { status: "down" },
      chroma: { status: "down" },
    },
    timestamp: new Date().toISOString(),
  };

  // Check Ollama
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      health.services.ollama = { status: "up" };
    } else {
      health.services.ollama = {
        status: "down",
        message: `HTTP ${res.status}`,
      };
    }
  } catch (error) {
    health.services.ollama = {
      status: "down",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }

  // Check Chroma
  try {
    const stats = await getCollectionStats();
    health.services.chroma = {
      status: "up",
      docCount: stats.count,
    };
  } catch (error) {
    health.services.chroma = {
      status: "down",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }

  // Determine overall status
  const ollamaUp = health.services.ollama.status === "up";
  const chromaUp = health.services.chroma.status === "up";

  if (ollamaUp && chromaUp) {
    health.status = "healthy";
  } else if (ollamaUp || chromaUp) {
    health.status = "degraded";
  } else {
    health.status = "unhealthy";
  }

  const httpStatus = health.status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, { status: httpStatus });
}

