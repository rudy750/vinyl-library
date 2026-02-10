import { NextResponse } from 'next/server';
import { CopilotClient, defineTool } from '@github/copilot-sdk';
import { getAllVinyls, searchVinyls } from '@/lib/db';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// ==========================================
// COPILOT CLIENT SINGLETON
// ==========================================

let copilotClientInstance = null;

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

const getCollectionTool = defineTool('get_collection', {
  description: "Get the user's complete vinyl record collection from their library. Returns all albums with title, artist, year, genre, label, and condition.",
  parameters: { type: 'object', properties: {} },
  handler: async () => getAllVinyls(),
});

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

export async function POST(request) {
  const body = await request.json();
  const { message, imageBase64, imageMimeType } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  let tempImagePath = null;

  try {
    // Save uploaded image to temp file if provided
    if (imageBase64) {
      const ext = (imageMimeType || 'image/jpeg').split('/')[1] || 'jpg';
      tempImagePath = join(tmpdir(), `vinyl-advisor-${randomUUID()}.${ext}`);
      await writeFile(tempImagePath, Buffer.from(imageBase64, 'base64'));
    }

    const client = await getCopilotClient();
    const session = await client.createSession({
      model: 'gpt-4.1',
      streaming: true,
      tools: [getCollectionTool, searchCollectionTool],
      systemMessage: { content: ALBUM_ADVISOR_SYSTEM_PROMPT },
    });

    // Set up SSE streaming
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    session.on('assistant.message_delta', (event) => {
      writer.write(encoder.encode(`data: ${JSON.stringify({ delta: event.data.deltaContent })}\n\n`));
    });

    session.on('session.idle', async () => {
      writer.write(encoder.encode('data: [DONE]\n\n'));
      writer.close();
      await session.destroy();
      if (tempImagePath) {
        unlink(tempImagePath).catch(() => {});
      }
    });

    // Build send options
    const sendOptions = { prompt: message };
    if (tempImagePath) {
      sendOptions.attachments = [{ type: 'file', path: tempImagePath }];
    }

    session.send(sendOptions);

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Album advisor error:', error);
    // Reset client on error so next request retries
    copilotClientInstance = null;
    if (tempImagePath) {
      unlink(tempImagePath).catch(() => {});
    }
    return NextResponse.json({ error: 'Failed to get advice' }, { status: 500 });
  }
}
