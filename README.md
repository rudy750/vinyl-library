# Vinyl Library

A full-stack web application to catalog and manage your vinyl record collection. Built with Next.js, React, Tailwind CSS, and SQLite — with an AI-powered **Album Advisor** driven by the [GitHub Copilot SDK](https://www.npmjs.com/package/@github/copilot-sdk).

## Features

- **Add Records**: Catalog your vinyl collection with details like title, artist, year, genre, condition, and more
- **Search**: Quickly find records by title, artist, genre, or label
- **Edit & Delete**: Update record information or remove items from your collection
- **Album Advisor (AI)**: Chat with an AI vinyl expert — ask about any album by name or upload a photo. Powered by the Copilot SDK with real-time streaming and access to your collection data
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Persistent Storage**: SQLite database stores your collection locally

## Copilot SDK Integration

The **Album Advisor** feature uses the [`@github/copilot-sdk`](https://www.npmjs.com/package/@github/copilot-sdk) to create an AI-powered chat experience directly within the app. Key capabilities:

- **Tool Use**: Two custom tools (`get_collection`, `search_collection`) let the AI query the user's real vinyl library from SQLite, grounding every response in actual collection data
- **Streaming Responses**: Real-time token-by-token rendering via Server-Sent Events, bridged from the SDK's `assistant.message_delta` events
- **Vision Support**: Users can upload photos of vinyl records — the SDK passes them as file attachments to the model's vision capabilities
- **Model Flexibility**: Easily switch between models (`gpt-4.1`, `gpt-5`, `claude-sonnet-4.5`, etc.) with a single config change

> **[Read the full Copilot SDK documentation →](docs/copilot-sdk.md)**

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Frontend**: React 19, Tailwind CSS
- **Database**: SQLite (via better-sqlite3)
- **AI**: GitHub Copilot SDK (`@github/copilot-sdk`)
- **Language**: JavaScript

## Getting Started

### Prerequisites

- Node.js 18+ installed

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

The database file (`vinyl-library.db`) will be created automatically on first run.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vinyls` | Get all vinyl records |
| POST | `/api/vinyls` | Add a new vinyl record |
| GET | `/api/vinyls/[id]` | Get a specific vinyl record |
| PUT | `/api/vinyls/[id]` | Update a vinyl record |
| DELETE | `/api/vinyls/[id]` | Delete a vinyl record |
| GET | `/api/vinyls/search?q=query` | Search vinyl records |
| POST | `/api/album-advisor` | AI album advisor (Copilot SDK — SSE streaming) |
| GET | `/api/tracklist?artist=...&title=...` | Fetch album tracklist from MusicBrainz |
| GET | `/api/cover-art?artist=...&title=...` | Fetch album cover art |
| POST | `/api/cover-art/resolve-all` | Batch-resolve missing cover art |

## Vinyl Record Schema

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Auto-generated primary key |
| title | String | Album title (required) |
| artist | String | Artist name (required) |
| year | Integer | Release year |
| genre | String | Musical genre |
| label | String | Record label |
| condition | String | Physical condition (Mint, Near Mint, Very Good, Good, Fair, Poor) |
| notes | String | Additional notes |
| cover_url | String | URL to album cover image |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Last update timestamp |

## Project Structure

```
vinyl-library/
├── docs/
│   └── copilot-sdk.md            # Extended Copilot SDK documentation
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── album-advisor/
│   │   │   │   └── route.js      # AI advisor (Copilot SDK integration)
│   │   │   ├── cover-art/
│   │   │   │   ├── route.js      # Single cover art lookup
│   │   │   │   └── resolve-all/
│   │   │   │       └── route.js  # Batch cover art resolution
│   │   │   ├── tracklist/
│   │   │   │   └── route.js      # MusicBrainz tracklist lookup
│   │   │   └── vinyls/
│   │   │       ├── route.js      # GET all, POST new
│   │   │       ├── [id]/route.js # GET, PUT, DELETE by ID
│   │   │       └── search/route.js # Search endpoint
│   │   ├── layout.js
│   │   ├── page.js               # Main application page
│   │   └── globals.css
│   ├── components/
│   │   ├── AlbumAdvisor.js       # AI chat UI (consumes SSE stream)
│   │   ├── Modal.js              # Reusable modal component
│   │   ├── TrackList.js          # Album tracklist display
│   │   ├── VinylCard.js          # Vinyl record display card
│   │   └── VinylForm.js          # Add/edit vinyl form
│   └── lib/
│       └── db.js                 # Database configuration & helpers
├── vinyl-library.db              # SQLite database (auto-generated)
└── package.json
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## License

MIT
