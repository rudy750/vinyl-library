# Vinyl Collection AI Advisor

This directory contains the AI-powered collection advisor feature for the Vinyl Library application.

## Overview

The Vinyl Collection Advisor is an intelligent chat interface that helps users explore and manage their vinyl record collection. It provides personalized recommendations, answers questions about albums, and helps users discover new music based on their existing collection.

## Architecture

### Components

#### RecordChatBox (`/src/components/RecordChatBox.js`)
- Main chat interface component
- Manages conversation state and history
- Handles user input and displays responses
- Features vinyl-themed loading animation

#### API Endpoint (`/src/app/api/record-advisor/route.js`)
- Processes user queries
- Builds contextual system prompts with collection data
- Implements intelligent response generation
- Checks ownership before providing information

## Features

### Smart Ownership Verification
The advisor always checks if albums are in the user's collection before discussing them, providing:
- Album details (title, artist, year)
- Condition information (Mint, Near Mint, Very Good, etc.)
- Special notes and pressing details
- Rarity indicators

### Collection Analytics
Users can ask about:
- Total number of records
- Genre distribution
- Condition statistics
- Collection quality metrics

### Personalized Recommendations
Based on the user's existing collection:
- Genre-specific suggestions
- Artist recommendations
- Era-based recommendations
- Condition-aware suggestions

## Usage

### Opening the Chat
Click the circular gradient button with the vinyl record icon in the header to open the chat dialog.

### Example Queries
- "Do I own Abbey Road?"
- "How many records do I have?"
- "What's in mint condition?"
- "What should I get next?"
- "Tell me about my Classic Rock collection"

## Implementation Details

### System Prompt Generation
The `createContextualPrompt` function builds a dynamic system prompt that includes:
- Complete list of owned albums with metadata
- Condition markers ([pristine], [well-loved])
- Year and genre information
- Behavioral guidelines for the AI

### Response Generation
The `generateIntelligentReply` function implements pattern matching for:
- Ownership queries (album/artist name detection)
- Statistics (collection size, genre counts)
- Condition analysis (mint/quality queries)
- Recommendations (based on genre preferences)

### Future Enhancements
The current implementation uses a mock response generator. In production, this should be replaced with:
- Integration with OpenAI, Anthropic, or similar AI service
- Full conversation history tracking
- More sophisticated recommendation algorithms
- Natural language understanding improvements

## Code Organization

```
src/
├── components/
│   └── RecordChatBox.js       # Chat UI component
└── app/
    └── api/
        └── record-advisor/
            └── route.js        # API endpoint
```

## Testing

The advisor has been tested with various query types:
- ✅ Ownership verification
- ✅ Collection statistics
- ✅ Condition queries
- ✅ Recommendation requests
- ✅ Genre analysis

## Styling

The component uses vinyl-themed styling:
- Gradient purple button with record icon
- Spinning disk loading animation
- Clean chat bubble design
- Responsive layout
