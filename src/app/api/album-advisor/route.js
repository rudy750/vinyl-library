/**
 * Album Advisor API Route — Powered by the GitHub Copilot SDK
 *
 * This route integrates the @github/copilot-sdk to create an AI-powered vinyl
 * record advisor. It demonstrates the three core SDK concepts:
 *   1. CopilotClient  — manages the connection to the Copilot CLI backend
 *   2. defineTool()   — exposes app data (the SQLite database) as callable tools
 *   3. CopilotSession — runs a streaming conversation with tool-use and vision
 *
 * Architecture overview:
 *   Browser (AlbumAdvisor.js)
 *       ↓ POST /api/album-advisor  { message, imageBase64?, imageMimeType? }
 *   This route handler
 *       ↓ Copilot SDK (JSON-RPC over stdio to copilot CLI)
 *   GitHub Copilot LLM  ←→  Tools (get_collection, search_collection)
 *       ↓ SSE stream of assistant.message_delta events
 *   Browser (real-time token rendering)
 *
 * @see https://www.npmjs.com/package/@github/copilot-sdk — Official SDK docs
 * @see /docs/copilot-sdk.md — Extended project-specific documentation
 */

import { NextResponse } from 'next/server';

/**
 * CopilotClient — The main entry point of the SDK. It spawns (or connects to)
 * the Copilot CLI process and communicates with it over JSON-RPC.
 *
 * defineTool — A helper that creates a Tool object the SDK can register with
 * the LLM. When the model decides it needs data, it invokes the tool and the
 * SDK automatically calls the handler defined here, returning the result back
 * to the model. This is the "function calling" / "tool use" pattern.
 *
 * @see https://www.npmjs.com/package/@github/copilot-sdk#tools
 */
import { CopilotClient, defineTool } from '@github/copilot-sdk';

import { getAllVinyls, searchVinyls } from '@/lib/db';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// ==========================================
// COPILOT CLIENT SINGLETON
// ==========================================

/**
 * Module-level singleton for the CopilotClient instance.
 *
 * Why a singleton?
 * - CopilotClient.start() spawns a child process (the Copilot CLI) and opens
 *   a JSON-RPC channel over stdio. This is an expensive operation.
 * - In a Next.js API route the module is kept alive between requests (within
 *   the same server process), so reusing the client avoids repeated startup
 *   overhead and rate-limit pressure.
 * - If an error occurs the instance is set back to null so the next request
 *   creates a fresh connection (see the catch block in POST).
 */
let copilotClientInstance = null;

/**
 * Returns the shared CopilotClient, creating and starting it on first call.
 *
 * `new CopilotClient()` accepts options like cliPath, port, logLevel, and
 * githubToken, but here we use defaults which:
 *   - Locate the `copilot` CLI from $PATH
 *   - Use stdio transport (most reliable)
 *   - Authenticate via the logged-in GitHub user
 *
 * @returns {Promise<CopilotClient>} The ready-to-use client instance
 * @see https://www.npmjs.com/package/@github/copilot-sdk#constructor
 */
async function getCopilotClient() {
  if (!copilotClientInstance) {
    copilotClientInstance = new CopilotClient();
    await copilotClientInstance.start();
  }
  return copilotClientInstance;
}

// ==========================================
// COPILOT TOOLS
// ==========================================
// Tools let the LLM call back into your application to retrieve or mutate data.
// Each tool is defined with:
//   - A unique name (string identifier the model references)
//   - A description (tells the model *when* to use the tool)
//   - A JSON Schema for parameters (the model fills these in)
//   - A handler function (your code that runs when the tool is invoked)
//
// The SDK automatically:
//   1. Advertises these tools to the model in the system prompt
//   2. Detects when the model emits a tool_call in its response
//   3. Executes the matching handler and injects the result back into the
//      conversation for the model to incorporate
//
// This is the key mechanism that grounds the AI's responses in real user data
// rather than hallucinated information.
// ==========================================

/**
 * Tool: get_collection
 *
 * Retrieves the user's entire vinyl record library from SQLite. The model uses
 * this to check ownership, analyze taste patterns, and personalize advice.
 *
 * No parameters needed — it returns the full collection. The handler simply
 * delegates to the db.js helper `getAllVinyls()`.
 */
const getCollectionTool = defineTool('get_collection', {
  description: "Get the user's complete vinyl record collection from their library. Returns all albums with title, artist, year, genre, label, and condition.",
  parameters: { type: 'object', properties: {} },
  handler: async () => getAllVinyls(),
});

/**
 * Tool: search_collection
 *
 * Performs a filtered search across the vinyl collection. Useful when the model
 * wants to check for a specific album or artist without loading everything.
 *
 * Parameters:
 *   - query (string, required) — free-text search matched against title,
 *     artist, genre, and label columns via SQL LIKE.
 */
const searchCollectionTool = defineTool('search_collection', {
  description: 'Search the user\'s vinyl collection by title, artist, genre, or label.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search term' },
    },
    required: ['query'],
  },
  handler: async ({ query }) => searchVinyls(query),
});

// ==========================================
// COPILOT SYSTEM PROMPT
// ==========================================

/**
 * The system prompt shapes the model's personality and output format.
 *
 * When passed via `systemMessage: { content: ... }` (the default "append"
 * mode), the SDK prepends its own environment context, tool instructions, and
 * security guardrails, then appends this content. This ensures the model knows
 * about the available tools AND follows our domain-specific persona.
 *
 * If you need full control you can use `mode: "replace"`, but that removes all
 * built-in guardrails — not recommended for production.
 *
 * @see https://www.npmjs.com/package/@github/copilot-sdk#system-message-customization
 */
const ALBUM_ADVISOR_SYSTEM_PROMPT = `You are a vinyl record expert and advisor embedded in the Vinyl Library app. You help users discover albums and assess how they fit their collection.

For EVERY album inquiry (text or photo), you MUST:
1. **Always use get_collection tool first** to check if they own the album and understand their collection
2. Provide a response in this exact format:

📀 **[Album Title]** by [Artist]
🎵 Genre: [genre] | Year: [year] | Label: [label]

💎 **Rarity & Value**
[Assess rarity: Common/Uncommon/Rare/Very Rare/Extremely Rare]
Estimated value: $[range] (specify for original pressing and common reissues)
[Explain what makes certain pressings valuable - matrix numbers, country of origin, first pressings, condition factors]

🔑 **Key Details**
- [Notable facts about recording, production, or historical significance]
- [Important pressing variations or editions to look for]
- [Condition notes if applicable]

📚 **In Your Collection**
[State clearly if they own it. If yes, show the details from their library. If no, say they don't own it yet.]

💭 **Would You Like This?**
[Analyze their collection genres, artists, and eras. Give a personalized recommendation: "Strong match" / "Good match" / "Interesting departure" / "Different from your usual taste" with specific reasoning based on albums they own]

Be enthusiastic, knowledgeable, and concise. Use emojis to enhance readability.`;

// ==========================================
// API ROUTE HANDLER
// ==========================================

/**
 * POST /api/album-advisor
 *
 * Accepts a user message (and optional base64-encoded image) and streams back
 * an AI-generated album advisory response using Server-Sent Events (SSE).
 *
 * Request body:
 *   - message      (string, required) — The user's question or album inquiry
 *   - imageBase64  (string, optional) — Base64-encoded image of a vinyl record
 *   - imageMimeType(string, optional) — MIME type of the image (default: image/jpeg)
 *
 * Response: SSE stream with `data: {"delta":"..."}` events, terminated by `data: [DONE]`
 *
 * SDK features demonstrated:
 *   1. Session creation with model selection, streaming, tools, and system prompt
 *   2. Real-time streaming via `assistant.message_delta` events
 *   3. Session lifecycle management via `session.idle` event
 *   4. Vision / image support via file attachments
 *   5. Automatic tool execution (the SDK handles tool calls transparently)
 */
export async function POST(request) {
  const body = await request.json();
  const { message, imageBase64, imageMimeType } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  let tempImagePath = null;

  try {
    // ── Image handling ──────────────────────────────────────────────────
    // The Copilot SDK's `attachments` API accepts file paths (not raw bytes).
    // When the client sends a base64 image, we decode it to a temp file so
    // the SDK can pass it to the model's vision capabilities. The temp file
    // is cleaned up after the session completes.
    if (imageBase64) {
      const ext = (imageMimeType || 'image/jpeg').split('/')[1] || 'jpg';
      tempImagePath = join(tmpdir(), `vinyl-advisor-${randomUUID()}.${ext}`);
      await writeFile(tempImagePath, Buffer.from(imageBase64, 'base64'));
    }

    // ── Create a Copilot session ────────────────────────────────────────
    // A CopilotSession represents a single conversation. Key config options:
    //
    //   model       — Which LLM to use (e.g. "gpt-4.1", "gpt-5", "claude-sonnet-4.5").
    //   streaming   — When true, the session emits `assistant.message_delta`
    //                 events with incremental text chunks instead of waiting
    //                 for the full response.
    //   tools       — Array of Tool objects created with defineTool(). The model
    //                 can invoke any of these during the conversation.
    //   systemMessage — Customizes the system prompt. In the default "append"
    //                   mode, your content is added after SDK-managed sections.
    //
    // @see https://www.npmjs.com/package/@github/copilot-sdk#createsessionconfig-sessionconfig-promisecopilotsession
    const client = await getCopilotClient();
    const session = await client.createSession({
      model: 'gpt-4.1',
      streaming: true,
      tools: [getCollectionTool, searchCollectionTool],
      systemMessage: { content: ALBUM_ADVISOR_SYSTEM_PROMPT },
    });

    // ── SSE (Server-Sent Events) streaming bridge ───────────────────────
    // The SDK emits events on the session object. We bridge these into an
    // HTTP SSE stream so the browser can render tokens in real time.
    //
    // TransformStream creates a readable/writable pair. We write SSE-formatted
    // chunks to the writable side and return the readable side as the response.
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // ── Event: assistant.message_delta ───────────────────────────────────
    // Fired each time a new chunk of the assistant's response is generated.
    // `event.data.deltaContent` contains the incremental text fragment.
    // We wrap it in SSE format: `data: {"delta":"..."}\n\n`
    session.on('assistant.message_delta', (event) => {
      writer.write(encoder.encode(`data: ${JSON.stringify({ delta: event.data.deltaContent })}\n\n`));
    });

    // ── Event: session.idle ─────────────────────────────────────────────
    // Fired when the session has finished processing — all tool calls have
    // been resolved and the final assistant message is complete.
    // This is our signal to close the SSE stream and clean up resources.
    session.on('session.idle', async () => {
      writer.write(encoder.encode('data: [DONE]\n\n'));
      writer.close();
      // destroy() frees session resources (but keeps the client alive for reuse)
      await session.destroy();
      if (tempImagePath) {
        unlink(tempImagePath).catch(() => {});
      }
    });

    // ── Send the user message ───────────────────────────────────────────
    // session.send() queues the message and returns immediately (the response
    // arrives asynchronously via events). Options:
    //   prompt      — The user's text message
    //   attachments — Array of { type: 'file', path: string } for images or
    //                 other files the model should see (vision support)
    //
    // Note: We intentionally do NOT await send() — the response streams back
    // through the event handlers above. Using sendAndWait() would block until
    // the full response is ready, defeating the purpose of streaming.
    const sendOptions = { prompt: message };
    if (tempImagePath) {
      sendOptions.attachments = [{ type: 'file', path: tempImagePath }];
    }

    session.send(sendOptions);

    // Return the readable side of the TransformStream as an SSE response
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Album advisor error:', error);
    // Reset the singleton so the next request creates a fresh client/connection.
    // Common failure causes: CLI not found, auth expired, network issues.
    copilotClientInstance = null;
    if (tempImagePath) {
      unlink(tempImagePath).catch(() => {});
    }
    return NextResponse.json({ error: 'Failed to get advice' }, { status: 500 });
  }
}
