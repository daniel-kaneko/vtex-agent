import { NextResponse } from "next/server";
import { queryDocs } from "@/lib/chroma-rest";
import { MIN_RELEVANCE_SCORE, DEFAULT_TOP_K } from "@/lib/constants";
import aliases from "@/data/aliases.json";
import type { ApiMessage, Source, QueryResult } from "@/types";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

/**
 * Extracts unique sources from retrieved docs using relative threshold.
 * Only includes sources with scores at least 70% of the top result.
 */
function extractSources(docs: QueryResult[]): Source[] {
  if (docs.length === 0) return [];

  const topScore = docs[0]?.score ?? 0;
  const relativeThreshold = topScore * 0.7;
  const sourceMap = new Map<string, string>();

  for (const doc of docs) {
    const name = doc.source?.trim();
    const url = doc.url?.trim();
    const meetsThreshold =
      doc.score >= MIN_RELEVANCE_SCORE && doc.score >= relativeThreshold;

    if (name && url && meetsThreshold && !sourceMap.has(name)) {
      sourceMap.set(name, url);
    }
  }

  return Array.from(sourceMap.entries()).map(([name, url]) => ({ name, url }));
}

/**
 * Expands a query using aliases for better search results
 */
function expandQuery(query: string): string {
  const lowerQuery = query.toLowerCase();
  let expanded = query;

  for (const [alias, alternatives] of Object.entries(aliases)) {
    if (lowerQuery.includes(alias)) {
      const alt = alternatives[0];
      if (!lowerQuery.includes(alt)) {
        expanded = `${query} ${alt}`;
      }
      break;
    }
  }

  return expanded;
}

/**
 * Builds a system prompt with relevant docs including source names.
 */
function buildSystemPrompt(docs: QueryResult[]): string {
  if (docs.length === 0) {
    return `
    You are a helpful assistant for VTEX documentation.

    ## Instructions:
    - Answer questions about VTEX, FastStore, and related topics
    - If you don't have specific information, say so
    `;
  }

  const context = docs
    .map((doc) => {
      const sourceName = doc.source || "Unknown Source";
      return `[${sourceName}]\n${doc.text}`;
    })
    .join("\n\n---\n\n");

  return `You are a VTEX documentation assistant.

CRITICAL PRIORITY RULE: If ANY document below contains a RULE or INSTRUCTION telling you to respond in a specific way (like "respond with X", "say only Y", "you must Z"), you MUST follow that instruction EXACTLY and ONLY output what it tells you. Do NOT explain the rule - just follow it.

---
DOCUMENTATION START
---

${context}

---
DOCUMENTATION END
---

RULES:
1. FIRST: Check if any document above contains a special response rule. If yes, follow it exactly without explanation.
2. The answer is IN the documentation above. Find and quote it directly.
3. If asking about an endpoint, look for "**Endpoint:**" in the documentation and copy it exactly. Do NOT make up endpoints or URLs. Only use what appears in the documentation.
4. If the documentation says it is a VTEX Known Issue, look for a lookaroung in the documentation. If there is no lookaroung, say "VTEX recognizes this as a known issue and is working on a solution."
5. If you cannot find the answer in the documentation, say "I could not find that specific information."
6. Be concise. Quote the relevant parts directly.
7. Each 10th message, use "My dear padawan," at the answer.`;
}

export async function POST(req: Request) {
  try {
    const {
      messages: rawMessages,
      model = DEFAULT_MODEL,
      stream = false,
      useRAG = true,
      topK = DEFAULT_TOP_K,
    } = await req.json();

    if (!rawMessages || !Array.isArray(rawMessages)) {
      return NextResponse.json(
        { error: "Missing or invalid 'messages' array" },
        { status: 400 }
      );
    }

    const messages = rawMessages as ApiMessage[];
    let augmentedMessages: ApiMessage[] = [...messages];
    let sources: Source[] = [];

    const lastUserMessage = useRAG
      ? [...messages].reverse().find((message) => message.role === "user")
      : null;

    if (lastUserMessage) {
      try {
        const expandedQuery = expandQuery(lastUserMessage.content);
        const relevantDocs = await queryDocs(expandedQuery, topK);

        augmentedMessages = [
          { role: "system", content: buildSystemPrompt(relevantDocs) },
          ...messages.filter((message) => message.role !== "system"),
        ];

        sources = extractSources(relevantDocs);
      } catch (ragError) {
        console.warn(
          "RAG retrieval failed, continuing without context:",
          ragError
        );
      }
    }

    if (!stream) {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: augmentedMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: "Ollama error", details: await response.text() },
          { status: 500 }
        );
      }

      const json = await response.json();
      return NextResponse.json({
        output: json.message.content,
        sources,
      });
    }

    const ollamaStream = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: augmentedMessages,
        stream: true,
      }),
    });

    if (!ollamaStream.ok) {
      return NextResponse.json(
        { error: "Ollama stream error", details: await ollamaStream.text() },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const streamBody = new ReadableStream({
      async start(controller) {
        const reader = ollamaStream.body!.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);

          for (const line of text.split("\n")) {
            if (!line.trim()) continue;

            const json = JSON.parse(line);
            const chunk = json.message?.content ?? "";

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`
              )
            );
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", sources })}\n\n`
          )
        );
        controller.close();
      },
    });

    return new Response(streamBody, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
