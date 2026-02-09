# Vinyl Library

A full-stack web application to catalog and manage your vinyl record collection. Built with Next.js, React, Tailwind CSS, and SQLite.

## Features

- **Add Records**: Catalog your vinyl collection with details like title, artist, year, genre, condition, and more
- **Search**: Quickly find records by title, artist, genre, or label
- **Edit & Delete**: Update record information or remove items from your collection
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Persistent Storage**: SQLite database stores your collection locally

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Frontend**: React 19, Tailwind CSS
- **Database**: SQLite (via better-sqlite3)
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
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── vinyls/
│   │   │       ├── route.js          # GET all, POST new
│   │   │       ├── [id]/route.js     # GET, PUT, DELETE by ID
│   │   │       └── search/route.js   # Search endpoint
│   │   ├── layout.js
│   │   ├── page.js                   # Main application page
│   │   └── globals.css
│   ├── components/
│   │   ├── Modal.js                  # Reusable modal component
│   │   ├── VinylCard.js              # Vinyl record display card
│   │   └── VinylForm.js              # Add/edit vinyl form
│   └── lib/
│       └── db.js                     # Database configuration & helpers
├── vinyl-library.db                  # SQLite database (auto-generated)
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
