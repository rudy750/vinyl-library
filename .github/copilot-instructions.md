# Copilot Instructions — Vinyl Library

## Build & Run

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (Next.js core-web-vitals config)
```

No test framework is configured.

## Architecture

Next.js 16 App Router application (JavaScript, no TypeScript) with a single-page client-side UI backed by REST API routes and a local SQLite database.

- **Single page app**: `src/app/page.js` is a `'use client'` component that handles all UI state (listing, search, add/edit/delete) via `fetch()` calls to the API routes. There is no server-side rendering of data.
- **API layer**: Route Handlers under `src/app/api/` return `NextResponse.json()`. All DB access goes through helper functions exported from `src/lib/db.js`.
- **Database**: SQLite via `better-sqlite3` (synchronous API). The DB file (`vinyl-library.db`) is auto-created at the project root on first run and seeded with sample records if empty. WAL mode is enabled. The `condition` column uses a CHECK constraint limiting values to: Mint, Near Mint, Very Good, Good, Fair, Poor.
- **Cover art resolution**: Two API routes (`/api/cover-art` and `/api/cover-art/resolve-all`) fetch album artwork from MusicBrainz/Cover Art Archive with an iTunes Search API fallback. The resolve-all endpoint throttles requests at ~1 req/sec to respect MusicBrainz rate limits.
- **React Compiler** is enabled (`reactCompiler: true` in `next.config.mjs`).

## Key Conventions

- **Path alias**: `@/*` maps to `./src/*` (configured in `jsconfig.json`).
- **Components are client components**: All components under `src/components/` use `'use client'` and receive callbacks as props. The main page orchestrates all data fetching and state.
- **DB helpers pattern**: Database operations are exported as named functions from `src/lib/db.js` (e.g., `getAllVinyls`, `createVinyl`, `updateVinyl`). API routes import and call these directly — no ORM or query builder.
- **API error handling**: Route handlers wrap logic in try/catch and return `{ error: string }` with appropriate HTTP status codes. Validation requires `title` and `artist` for create/update.
- **Styling**: Tailwind CSS v4 via PostCSS. No component library — all UI is built with utility classes directly in JSX.
- **Images**: `next.config.mjs` allows remote images from `coverartarchive.org`, `*.archive.org`, and `*.mzstatic.com` (iTunes).
