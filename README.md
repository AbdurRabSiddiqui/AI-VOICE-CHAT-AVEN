# BOT – Customer Support Voice Agent

An AI voice assistant built for credit card company Aven's challenge with Next.js, React, and the Vapi Web SDK. It answers user questions using a vector database (Pinecone) populated from the Aven website and generates answers via Google Generative AI (Gemini-compatible OpenAI API endpoint).

## Features

- **Voice Assistant (Vapi)**: In-browser call controls with transcript display via `@vapi-ai/web`.
- **RAG over Aven website**: Scrape Aven pages with Firecrawl, embed via Google `text-embedding-004`, and store in Pinecone.
- **Chat Completions API**: `POST /api/chat/completions` performs RAG lookup and returns completions (streaming or non-streaming).
- **Modern UI**: Tailwind + shadcn/ui components.
- **Type-safe config**: Runtime env validation with Zod, structured logging.

## Tech Stack

- Next.js 15, React 19
- `@vapi-ai/web` (voice), Daily (under the hood)
- Pinecone (vector DB), Google Generative AI (embeddings + chat)
- Firecrawl (scraping)
- Tailwind CSS, shadcn/ui
- TypeScript, Zod

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Environment variables

Create a `.env` file with your keys (examples below). Do not commit real keys.

```bash
# VAPI Configuration
VAPI_PRIVATE_KEY=your_vapi_private_key_here
VAPI_PUBLIC_KEY=your_vapi_public_key_here
VAPI_ASSISTANT_ID=your_vapi_assistant_id_here

# Google AI Configuration
GOOGLE_API_KEY=your_google_api_key_here

# Firecrawl Configuration
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
```

3. Run the dev server

```bash
npm run dev
```

4. (Optional) Expose locally via ngrok for external testing

```bash
ngrok http 3000
```

## Voice Widget (Vapi)

- Component: `src/app/components/VapiWidget.tsx`
- Usage: added in `src/app/page.tsx` with `apiKey={env.VAPI_PUBLIC_KEY}` and `assistantId={env.VAPI_ASSISTANT_ID}`.
- Events handled: `call-start`, `call-end`, `speech-start`, `speech-end`, `message (transcript)`, `error`.

If you see “Meeting ended due to ejection”, check:

- Assistant configuration in the Vapi dashboard
- Microphone permissions and HTTPS (ngrok/production)
- Webhook/function calls your assistant relies on

## Chat Completions API

- File: `src/app/api/chat/completions/route.ts`
- Endpoint: `POST /api/chat/completions`
- Flow:
  - Validate request
  - Embed last user message with `text-embedding-004`
  - Query Pinecone index `company-data`, namespace `aven`
  - Build context and create chat completion using Gemini-compatible OpenAI API (`gemini-1.5-flash`)
  - Supports `stream: true` for Server-Sent Events

Request example:

```json
{
  "model": "gemini-1.5-flash",
  "messages": [{ "role": "user", "content": "What is Aven?" }],
  "stream": false
}
```

## Populate Pinecone with Aven Website

- Script: `src/scripts/insert-data-to-pinecone.ts`
- What it does:
  - Scrapes a set of Aven URLs via Firecrawl (markdown, main content only)
  - Chunks content (1000 chars), embeds with `text-embedding-004`
  - Pads vectors to 3072 dims to match the index
  - Upserts chunks into Pinecone index `company-data`

Run the script:

```bash
tsx src/scripts/insert-data-to-pinecone.ts
# or
node --loader tsx src/scripts/insert-data-to-pinecone.ts
```

Note: Ensure your Pinecone index `company-data` exists with the correct dimensions (3072) and set your API keys in `.env`.

## Project Structure

- `src/app/page.tsx` – Main page rendering the voice widget and UI
- `src/app/components/VapiWidget.tsx` – Vapi voice widget
- `src/app/api/chat/completions/route.ts` – Chat completion + RAG endpoint
- `src/scripts/insert-data-to-pinecone.ts` – Scrape and upsert to Pinecone
- `src/config/env.ts` – Zod-validated environment loader

## Troubleshooting

- Voice call ends immediately (ejection): verify Vapi assistant config, mic permissions, and network (ngrok)
- Empty `Vapi error: {}`: check browser console network tab and Vapi dashboard logs
- Pinecone queries empty: confirm index/namespace and that the script successfully inserted data

## License

MIT
# ai-chat
