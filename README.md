# VTEX Docs Agent

A local RAG (Retrieval Augmented Generation) agent that answers questions using VTEX documentation. Runs entirely on your machine with Ollama + Chroma.

## Quick Start

### Development Mode (Recommended)

```bash
# 1. Install dependencies
pnpm install

# 2. Start Chroma (vector DB)
docker compose up chroma -d

# 3. Start Ollama (if not already running)
ollama serve

# 4. Pull models
ollama pull llama3.1:8b
ollama pull mxbai-embed-large

# 5. Ingest documentation
pnpm chroma:sync

# 6. Run the app
pnpm dev
```

### Docker Mode (Full Stack)

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project container
pnpm docker:build

# 3. Start all services
pnpm docker:up

# 4. Pull models in container
pnpm ollama:pull

# 5. Ingest documentation
pnpm chroma:fresh

# 6. Access at http://localhost:3000
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │────▶│   Chroma    │────▶│   Ollama    │
│  Frontend   │     │  (vectors)  │     │  (LLM)      │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Ollama** - Local LLM (llama3.1:8b) + embeddings (mxbai-embed-large)
- **Chroma** - Vector database for semantic search
- **Next.js** - Frontend + API

## Project Structure

```
vtex-agent/
├── app/
│   ├── api/ask/route.ts     # RAG API endpoint
│   ├── components/          # Chat UI components
│   └── page.tsx             # Chat UI
├── lib/
│   └── chroma.ts            # Chroma client & queries
├── data/
│   ├── aliases.json         # Query expansion aliases
│   ├── manual-docs.json     # Curated documentation
│   ├── urls.json            # URLs to scrape
│   └── openapi-config.json  # OpenAPI ingestion config
├── scripts/
│   ├── ingest-manual.ts     # Ingest manual-docs.json
│   ├── ingest-urls.ts       # Scrape & ingest URLs
│   ├── ingest-openapi.ts    # Fetch & ingest OpenAPI schemas
│   ├── chroma-inspect.ts    # View stored docs
│   └── chroma-reset.ts      # Clear database
└── docker-compose.yml       # Chroma + Ollama services
```

## Adding Documentation

### Option 1: Manual docs (best quality)

Edit `data/manual-docs.json`:

```json
[
  {
    "topic": "Extension Points",
    "text": "FastStore Checkout provides extension points for customization...",
    "url": "https://docs.example.com/extension-points"
  }
]
```

The `url` field is optional but enables clickable source links.

### Option 2: URL scraping

Edit `data/urls.json`:

```json
[
  {
    "url": "https://docs.example.com/page",
    "name": "Page Name",
    "selector": ".content"
  }
]
```

The `selector` field is optional (CSS selector for content extraction).

### Option 3: OpenAPI schemas (recommended for API docs)

Edit `data/openapi-config.json`:

```json
{
  "githubRepo": "vtex/openapi-schemas",
  "branch": "master",
  "filePrefix": "VTEX -",
  "docsBaseUrl": "https://developers.vtex.com/docs/api-reference"
}
```

Then run:

```bash
pnpm ingest:openapi
```

### Testing contexts

Use the "Duck Rule" to check if contexts are being applied correctly.

- Ask **"What about ducks?"** and the agent should respond with **"quack quack"**
- If it doesn't, contexts are NOT working correctly

**Features:**

- Fetches OpenAPI specs directly from GitHub
- Extracts API overviews and endpoint details
- Generates documentation URLs automatically
- Caches with 7-day TTL for fast re-runs

## Scripts

| Script                        | Description                      |
| ----------------------------- | -------------------------------- |
| `pnpm dev`                    | Start development server         |
| `pnpm docker:up`              | Start Ollama + Chroma containers |
| `pnpm docker:down`            | Stop containers                  |
| `pnpm chroma:sync`            | Ingest all docs                  |
| `pnpm chroma:fresh`           | Reset database and re-ingest     |
| `pnpm chroma:inspect`         | View stored documents            |
| `pnpm chroma:inspect "query"` | Search documents                 |
| `pnpm ingest:manual`          | Ingest manual-docs.json          |
| `pnpm ingest:urls`            | Scrape and ingest urls.json      |
| `pnpm ingest:openapi`         | Fetch and ingest OpenAPI schemas |
| `pnpm ingest:openapi:force`   | Force re-ingest (ignore cache)   |
| `pnpm ollama:pull`            | Pull required Ollama models      |

## Environment Variables

| Variable      | Default                  | Description    |
| ------------- | ------------------------ | -------------- |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API URL |
| `CHROMA_HOST` | `http://localhost:8000`  | Chroma API URL |

## UI Themes

The chat interface includes multiple themes inspired by popular coding color schemes:

- **Grey** (default) - Clean dark grey
- **Gruvbox** - Warm retro colors
- **Nord** - Arctic, bluish tones
- **Tokyo** - Purple-tinted night theme
- **Catppuccin** - Pastel Mocha
- **Matrix** - Green terminal aesthetic

Select your theme from the dropdown in the header.

## How It Works

1. **Ingestion**: Documents are chunked, embedded via Ollama, and stored in Chroma
2. **Query**: User question is embedded and matched against stored docs
3. **RAG**: Top matches are injected into the LLM prompt as context
4. **Response**: LLM generates answer grounded in the documentation
5. **Sources**: Clickable links to source docs are shown below each response

## GPU Support

GPU acceleration is **enabled by default** in `docker-compose.yml` for much faster embeddings.

### Requirements

```bash
# Arch Linux - install nvidia-container-toolkit
sudo pacman -S nvidia-container-toolkit
sudo systemctl restart docker

# Or use the official Ollama installer (auto-detects GPU)
curl -fsSL https://ollama.com/install.sh | sh
```

### Verify GPU is being used

```bash
# Check Ollama is using GPU
ollama ps
# Should show "100% GPU" instead of "100% CPU"

# Monitor GPU usage
nvidia-smi
```

### Models

| Model               | Purpose    | Size  |
| ------------------- | ---------- | ----- |
| `llama3.1:8b`       | Chat/LLM   | 4.7GB |
| `mxbai-embed-large` | Embeddings | 670MB |
