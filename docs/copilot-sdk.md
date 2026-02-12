# GitHub Copilot SDK Integration — Vinyl Library

> **Package**: [`@github/copilot-sdk`](https://www.npmjs.com/package/@github/copilot-sdk) v0.1.23  
> **Status**: Technical Preview (API may change)  
> **License**: MIT

---

## Table of Contents

1. [Overview](#overview)
2. [What Is the Copilot SDK?](#what-is-the-copilot-sdk)
3. [Architecture](#architecture)
4. [Implementation Deep Dive](#implementation-deep-dive)
   - [CopilotClient (Singleton)](#copilotclient-singleton)
   - [Tool Definitions](#tool-definitions)
   - [System Prompt Design](#system-prompt-design)
   - [Session Creation & Configuration](#session-creation--configuration)
   - [Streaming with Server-Sent Events](#streaming-with-server-sent-events)
   - [Image / Vision Support](#image--vision-support)
   - [Client-Side Consumption](#client-side-consumption)
5. [Data Flow](#data-flow)
6. [File Reference](#file-reference)
7. [Key SDK Concepts](#key-sdk-concepts)
8. [Advantages](#advantages)
9. [Limitations & Considerations](#limitations--considerations)
10. [Configuration Options](#configuration-options)
11. [Extending the Integration](#extending-the-integration)
12. [Troubleshooting](#troubleshooting)
13. [Official Resources](#official-resources)

---

## Overview

The Vinyl Library app uses the **GitHub Copilot SDK** to power its **Album Advisor** feature — an AI chat interface that lets users ask about any vinyl record (by name or photo) and receive expert-level advice grounded in their personal collection data.

The SDK bridges the gap between the app's local SQLite database and GitHub Copilot's large language models, allowing the AI to:

- **Read the user's vinyl collection** via custom tools
- **Analyze uploaded album photos** via vision / image attachments
- **Stream responses** in real time for a responsive chat experience
- **Personalize recommendations** based on the user's actual listening taste

---

## What Is the Copilot SDK?

The `@github/copilot-sdk` is a **Node.js / TypeScript SDK** for programmatic control of GitHub Copilot via JSON-RPC. It allows any application to:

- Create conversational AI sessions with model selection and streaming
- Register custom **tools** (function calling) so the model can retrieve or mutate application data
- Customize the system prompt to shape the AI's persona and output format
- Attach images and files for multimodal (vision) capabilities
- Hook into session lifecycle events for fine-grained control

The SDK communicates with the Copilot CLI process over stdio, managing the full lifecycle of connections, sessions, and tool execution automatically.

**Requirements:**
- Node.js >= 18.0.0
- GitHub Copilot CLI installed and in `$PATH` (or provide a custom `cliPath`)
- A GitHub account with Copilot access

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  AlbumAdvisor.js (React Component)                         │ │
│  │                                                             │ │
│  │  - Chat UI with message history                            │ │
│  │  - Image upload (base64 encoding)                          │ │
│  │  - SSE stream reader (ReadableStream API)                  │ │
│  │  - Real-time token rendering                               │ │
│  └─────────────────────┬───────────────────────────────────────┘ │
│                        │ POST /api/album-advisor                 │
│                        │ { message, imageBase64?, imageMimeType? }│
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTE                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  /api/album-advisor/route.js                               │ │
│  │                                                             │ │
│  │  CopilotClient (singleton)                                 │ │
│  │    └─ createSession({ model, streaming, tools, system })   │ │
│  │         ├─ on('assistant.message_delta') → SSE write       │ │
│  │         ├─ on('session.idle') → close stream               │ │
│  │         └─ send({ prompt, attachments? })                  │ │
│  └─────────────────────┬───────────────────────────────────────┘ │
│                        │ JSON-RPC over stdio                     │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    COPILOT CLI                                   │
│                                                                  │
│  - Manages authentication with GitHub                            │
│  - Routes requests to the selected LLM                           │
│  - Handles tool call orchestration                               │
│                                                                  │
│  ┌──────────────┐    ┌───────────────────────────────────┐      │
│  │  LLM (e.g.   │◄──►│  Tool Execution Engine            │      │
│  │  gpt-4.1)    │    │                                   │      │
│  └──────────────┘    │  get_collection → getAllVinyls()   │      │
│                      │  search_collection → searchVinyls()│      │
│                      └───────────────┬───────────────────┘      │
└──────────────────────────────────────┼───────────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  SQLite Database │
                              │  (vinyl-library  │
                              │      .db)        │
                              └─────────────────┘
```

---

## Implementation Deep Dive

### CopilotClient (Singleton)

**File:** `src/app/api/album-advisor/route.js`

```js
import { CopilotClient, defineTool } from '@github/copilot-sdk';

let copilotClientInstance = null;

async function getCopilotClient() {
  if (!copilotClientInstance) {
    copilotClientInstance = new CopilotClient();
    await copilotClientInstance.start();
  }
  return copilotClientInstance;
}
```

**Why a singleton?**

- `CopilotClient.start()` spawns a child process (the Copilot CLI) and opens a JSON-RPC channel. This is expensive.
- Next.js API routes are kept alive within the same server process between requests, so reusing the client avoids repeated startup overhead.
- If an error occurs, the instance is reset to `null` so the next request creates a fresh connection.

**Constructor options** (all optional):

| Option | Default | Description |
|--------|---------|-------------|
| `cliPath` | `"copilot"` from `$PATH` | Path to the Copilot CLI executable |
| `port` | `0` (random) | Server port for TCP transport |
| `useStdio` | `true` | Use stdio transport (most reliable) |
| `logLevel` | `"info"` | Logging verbosity |
| `githubToken` | — | Explicit GitHub token (otherwise uses logged-in user) |
| `autoStart` | `true` | Automatically start the server |
| `autoRestart` | `true` | Automatically restart on crash |

---

### Tool Definitions

Tools are the bridge between the LLM and your application data. They implement the **function calling** pattern: the model decides when to call a tool, the SDK executes your handler, and the result is fed back into the conversation.

```js
const getCollectionTool = defineTool('get_collection', {
  description: "Get the user's complete vinyl record collection...",
  parameters: { type: 'object', properties: {} },
  handler: async () => getAllVinyls(),
});

const searchCollectionTool = defineTool('search_collection', {
  description: 'Search the user\'s vinyl collection...',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search term' },
    },
    required: ['query'],
  },
  handler: async ({ query }) => searchVinyls(query),
});
```

**How `defineTool()` works:**

1. You provide a **name** (unique string the model references), a **description** (tells the model *when* to use it), a **JSON Schema** for the parameters, and a **handler** function.
2. The SDK advertises these tools to the model in the system prompt.
3. When the model emits a `tool_call`, the SDK matches the tool name, validates the parameters, runs your handler, and injects the return value back into the conversation.
4. Handlers can return any JSON-serializable value — the SDK automatically wraps it.

**Alternative: Zod schemas.** Instead of raw JSON Schema, you can use Zod for type-safe parameter definitions:

```js
import { z } from 'zod';

const myTool = defineTool('my_tool', {
  description: '...',
  parameters: z.object({
    query: z.string().describe('Search term'),
  }),
  handler: async ({ query }) => { /* ... */ },
});
```

---

### System Prompt Design

The system prompt controls the AI's persona, output format, and behavioral rules:

```js
const session = await client.createSession({
  systemMessage: { content: ALBUM_ADVISOR_SYSTEM_PROMPT },
});
```

**Key design decisions:**

- **Tool-first instruction:** The prompt mandates `get_collection` be called for every inquiry, ensuring responses are always grounded in real collection data rather than hallucinated.
- **Structured output format:** A consistent template (📀 Album, 💎 Rarity, 🔑 Details, 📚 Collection, 💭 Recommendation) makes responses predictable and scannable.
- **Personalization directive:** The model analyzes the user's owned genres, artists, and eras to provide tailored recommendations.

**System message modes:**

| Mode | Behavior |
|------|----------|
| `"append"` (default) | SDK prepends environment context, tool instructions, and guardrails. Your content is appended. |
| `"replace"` | Your content replaces everything. Removes all built-in guardrails — not recommended for production. |

---

### Session Creation & Configuration

```js
const session = await client.createSession({
  model: 'gpt-4.1',
  streaming: true,
  tools: [getCollectionTool, searchCollectionTool],
  systemMessage: { content: ALBUM_ADVISOR_SYSTEM_PROMPT },
});
```

Each `createSession()` call creates an **independent conversation**. The full configuration options include:

| Option | Used Here | Description |
|--------|-----------|-------------|
| `model` | `'gpt-4.1'` | LLM to use (`gpt-5`, `claude-sonnet-4.5`, etc.) |
| `streaming` | `true` | Enable `assistant.message_delta` events |
| `tools` | `[...]` | Array of tools the model can invoke |
| `systemMessage` | `{content}` | System prompt customization |
| `sessionId` | — | Custom session ID for persistence |
| `reasoningEffort` | — | `"low"` / `"medium"` / `"high"` / `"xhigh"` |
| `infiniteSessions` | — | Auto context compaction for long conversations |
| `provider` | — | Custom API provider (BYOK) |
| `hooks` | — | Lifecycle hooks (pre/post tool use, error handling) |

---

### Streaming with Server-Sent Events

The SDK's streaming events are bridged to HTTP SSE for the browser:

```js
// Server side (route.js)
const { readable, writable } = new TransformStream();
const writer = writable.getWriter();

session.on('assistant.message_delta', (event) => {
  writer.write(encoder.encode(
    `data: ${JSON.stringify({ delta: event.data.deltaContent })}\n\n`
  ));
});

session.on('session.idle', async () => {
  writer.write(encoder.encode('data: [DONE]\n\n'));
  writer.close();
  await session.destroy();
});

return new Response(readable, {
  headers: { 'Content-Type': 'text/event-stream' },
});
```

**SDK events used:**

| Event | When | Data |
|-------|------|------|
| `assistant.message_delta` | Each new token generated | `{ deltaContent: "..." }` |
| `session.idle` | All processing complete | — |
| `assistant.message` | Full response ready | `{ content: "..." }` |
| `tool.execution_start` | Before a tool handler runs | Tool name & args |
| `tool.execution_end` | After a tool handler completes | Tool result |

---

### Image / Vision Support

The Album Advisor supports photo-based album identification:

```js
// The SDK accepts file paths for attachments
if (imageBase64) {
  tempImagePath = join(tmpdir(), `vinyl-advisor-${randomUUID()}.${ext}`);
  await writeFile(tempImagePath, Buffer.from(imageBase64, 'base64'));
}

session.send({
  prompt: message,
  attachments: [{ type: 'file', path: tempImagePath }],
});
```

**How it works:**
1. The browser reads the image file as base64 via `FileReader`
2. The API route decodes it to a temporary file
3. The SDK passes the file path to the model's vision capabilities
4. The temp file is cleaned up after `session.idle` fires

Supported formats: JPG, PNG, GIF, and other common image types.

---

### Client-Side Consumption

**File:** `src/components/AlbumAdvisor.js`

The React component reads the SSE stream using the Streams API:

```js
const response = await fetch('/api/album-advisor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      const parsed = JSON.parse(data);
      if (parsed.delta) {
        // Append token to assistant message for real-time rendering
        setMessages(prev => { /* update last message */ });
      }
    }
  }
}
```

**Key patterns:**
- **Optimistic UI**: An empty assistant message is added immediately so the typing indicator shows
- **Incremental state updates**: Each `delta` token is appended to the last message via `setMessages`
- **Buffer management**: Partial SSE lines are buffered across `read()` calls to handle chunk boundaries

---

## Data Flow

```
User types "Tell me about Dark Side of the Moon"
  │
  ▼
AlbumAdvisor.js
  POST /api/album-advisor { message: "Tell me about Dark Side of the Moon" }
  │
  ▼
route.js
  getCopilotClient() → CopilotClient (singleton)
  client.createSession({ model: 'gpt-4.1', streaming: true, tools: [...] })
  session.send({ prompt: "Tell me about Dark Side of the Moon" })
  │
  ▼
Copilot CLI (JSON-RPC) → LLM
  │
  │ Model decides to call get_collection tool
  ▼
SDK executes handler: getAllVinyls()
  │
  ▼
SQLite DB → returns collection data → injected back into conversation
  │
  │ Model generates response incorporating collection data
  ▼
session events:
  assistant.message_delta → { delta: "📀 **Dark..." }
  assistant.message_delta → { delta: " Side of..." }
  ...
  session.idle
  │
  ▼
route.js writes SSE:
  data: {"delta":"📀 **Dark..."}
  data: {"delta":" Side of..."}
  ...
  data: [DONE]
  │
  ▼
AlbumAdvisor.js reads stream → renders tokens in real time
```

---

## File Reference

| File | Role | SDK Usage |
|------|------|-----------|
| `src/app/api/album-advisor/route.js` | API route handler | `CopilotClient`, `defineTool`, `createSession`, streaming events |
| `src/components/AlbumAdvisor.js` | Chat UI component | Consumes SSE stream (no direct SDK usage) |
| `src/app/page.js` | Main page | Renders `AlbumAdvisor` in a modal |
| `src/lib/db.js` | Database helpers | `getAllVinyls()` & `searchVinyls()` — called by tool handlers |
| `package.json` | Dependencies | `@github/copilot-sdk: ^0.1.23` |

---

## Key SDK Concepts

### 1. CopilotClient
The entry point. Spawns (or connects to) the Copilot CLI and manages the JSON-RPC transport. Should be treated as a long-lived singleton in server environments.

### 2. CopilotSession
Represents a single conversation. Each session has its own message history, model selection, and tool configuration. Sessions can be destroyed when done or reused for multi-turn conversations.

### 3. defineTool()
Registers application functions as callable tools for the LLM. The SDK handles the full tool-call lifecycle: advertising to the model → parsing the call → executing your handler → injecting the result.

### 4. Event-Driven Architecture
The SDK uses an event emitter pattern. Sessions emit typed events (`assistant.message`, `assistant.message_delta`, `session.idle`, `tool.execution_start`, etc.) that you subscribe to with `session.on()`.

### 5. Streaming
When `streaming: true`, the model's response is delivered incrementally via `assistant.message_delta` events. Each event contains a `deltaContent` string — accumulate these for the full response.

---

## Advantages

### Why Use the Copilot SDK Here?

| Advantage | Explanation |
|-----------|-------------|
| **Zero API key management** | Authenticates via the user's existing GitHub Copilot subscription — no OpenAI/Anthropic keys needed |
| **Tool use / function calling** | The model can query the app's real data (SQLite), eliminating hallucinated collection info |
| **Streaming out of the box** | Event-driven streaming requires minimal boilerplate compared to raw OpenAI API SSE parsing |
| **Multimodal (vision)** | Image attachments via file paths — no need to manually construct vision API payloads |
| **Model flexibility** | Switch between `gpt-4.1`, `gpt-5`, `claude-sonnet-4.5`, etc. with a single config change |
| **Built-in guardrails** | SDK injects security guardrails and environment context automatically |
| **Custom providers (BYOK)** | Can connect to Azure OpenAI, Ollama, or any OpenAI-compatible API |
| **Session management** | Automatic context window management, infinite sessions with compaction |
| **Type-safe tools** | Optional Zod schemas for compile-time validated tool parameters |

### Compared to Direct OpenAI API Usage

| Feature | Copilot SDK | Direct OpenAI API |
|---------|-------------|-------------------|
| Authentication | GitHub Copilot subscription | API key per provider |
| Tool call handling | Automatic (handler-based) | Manual parsing & re-injection |
| Streaming | Event emitter | Raw SSE parsing |
| Vision payloads | File path attachment | Base64 content blocks |
| Model switching | Config change | Different API endpoints |
| Rate limiting | Managed by Copilot | Self-managed |
| Security guardrails | Built-in | DIY |

---

## Limitations & Considerations

| Consideration | Detail |
|---------------|--------|
| **Technical Preview** | The SDK is in preview — breaking changes may occur across versions |
| **CLI Dependency** | Requires the Copilot CLI binary in `$PATH` or at a custom path |
| **GitHub Copilot Subscription** | Users need an active Copilot plan for authentication |
| **Server-side only** | The SDK uses Node.js APIs (child processes, stdio) — cannot run in the browser |
| **Cold start** | First request spawns the CLI process — subsequent requests reuse the singleton |
| **Session isolation** | Each request creates a new session — there's no persistent conversation memory across requests (by design for this use case) |

---

## Configuration Options

### Changing the Model

In `src/app/api/album-advisor/route.js`, modify the `model` parameter:

```js
const session = await client.createSession({
  model: 'gpt-5',            // or 'claude-sonnet-4.5', etc.
  // ...
});
```

### Adding New Tools

Define a new tool with `defineTool()` and include it in the `tools` array:

```js
const getRecommendationsTool = defineTool('get_recommendations', {
  description: 'Get album recommendations based on a genre',
  parameters: {
    type: 'object',
    properties: {
      genre: { type: 'string', description: 'Genre to get recommendations for' },
    },
    required: ['genre'],
  },
  handler: async ({ genre }) => {
    // your logic here
    return recommendations;
  },
});

const session = await client.createSession({
  tools: [getCollectionTool, searchCollectionTool, getRecommendationsTool],
  // ...
});
```

### Using a Custom Provider (BYOK)

```js
const session = await client.createSession({
  model: 'gpt-4',
  provider: {
    type: 'openai',
    baseUrl: 'https://my-api.example.com/v1',
    apiKey: process.env.MY_API_KEY,
  },
});
```

### Enabling Reasoning Effort

```js
const session = await client.createSession({
  model: 'gpt-5',
  reasoningEffort: 'high',  // "low" | "medium" | "high" | "xhigh"
});
```

### Session Hooks

```js
const session = await client.createSession({
  hooks: {
    onPreToolUse: async (input) => {
      console.log(`Tool called: ${input.toolName}`);
      return { permissionDecision: 'allow' };
    },
    onPostToolUse: async (input) => {
      console.log(`Tool ${input.toolName} completed`);
    },
    onErrorOccurred: async (input) => {
      console.error(`Error: ${input.error}`);
      return { errorHandling: 'retry' };
    },
  },
});
```

---

## Extending the Integration

### Ideas for Future Enhancement

1. **Persistent conversations**: Use `sessionId` and `resumeSession()` to maintain conversation history across page reloads
2. **Collection mutations via tools**: Add tools that let the AI add or update records directly (e.g., "Add this album to my collection")
3. **Price lookup tool**: Integrate with Discogs or eBay APIs via a new tool
4. **User input requests**: Use `onUserInputRequest` to let the model ask clarifying questions with predefined choices
5. **Infinite sessions**: Enable automatic context compaction for very long conversations:
   ```js
   infiniteSessions: {
     enabled: true,
     backgroundCompactionThreshold: 0.80,
   }
   ```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `copilot: command not found` | Install the Copilot CLI: `npm install -g @github/copilot-cli`, or set `cliPath` in `CopilotClient` options |
| Authentication errors | Ensure you're logged into GitHub CLI (`gh auth login`) with Copilot access |
| Session errors / timeouts | The singleton is reset on error — retry the request. Check `console.error` output in the server logs |
| Missing image after upload | Verify temp directory permissions. The SDK needs read access to the file path provided in `attachments` |
| Slow first response | Expected — the first request spawns the CLI process. Subsequent requests reuse the singleton |
| Model not available | Verify the model name is valid. Use `gpt-4.1`, `gpt-5`, `claude-sonnet-4.5`, etc. |

---

## Official Resources

- **npm package**: [npmjs.com/package/@github/copilot-sdk](https://www.npmjs.com/package/@github/copilot-sdk)
- **GitHub repository**: [github.com/github/copilot-sdk](https://github.com/github/copilot-sdk)
- **SDK API reference**: [npmjs.com/package/@github/copilot-sdk#api-reference](https://www.npmjs.com/package/@github/copilot-sdk#api-reference)
- **GitHub Copilot docs**: [docs.github.com/en/copilot](https://docs.github.com/en/copilot)
