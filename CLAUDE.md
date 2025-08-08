# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts Next.js with Turbopack for faster builds
- **Build**: `npm run build` - Creates production build
- **Production server**: `npm start` - Serves production build
- **Lint**: `npm run lint` - Runs ESLint checks

## Architecture Overview

This is a Next.js 15 application that creates an immersive Art Blocks NFT gallery and slideshow experience. The architecture consists of three main components:

### Core Data Layer (`lib/ab.ts`)
- **GraphQL Integration**: All data fetching uses Art Blocks' GraphQL endpoint at `https://data.artblocks.io/v1/graphql`
- **Search Functions**: Provides comprehensive search capabilities for artists, projects, collectors, and tokens
- **URL Composition**: Helper functions for Art Blocks API endpoints (token, generator, media URLs)
- **Selection System**: Handles complex multi-type selections (artist:name, project:name, collector:address, token:id) for slideshow queuing

### Application Routes
1. **Home (`app/page.tsx`)**: Clean search interface with type selection (Token ID, Artist, Project, Collector)
2. **Search Results (`app/search/page.tsx`)**: 
   - Displays search results based on type
   - Implements infinite scrolling for large result sets
   - Features a shopping cart-style selection system for building custom slideshows
   - Handles metadata fetching from Art Blocks token API
3. **Slideshow Player (`app/slideshow/player/page.tsx`)**:
   - Full-screen immersive experience using Art Blocks generator URLs in iframes
   - Supports auto-advance with configurable timing
   - Collapsible sidebar with token information and controls
   - Keyboard navigation (arrows, space, escape, cmd+i)

### UI Framework
- **shadcn/ui**: Uses the "new-york" style variant with Radix UI primitives
- **Tailwind CSS**: Version 4 with neutral base colors
- **Components**: Pre-built UI components in `components/ui/` (Button, Input, Select, etc.)

### Key Features
- **Art Blocks API Integration**: Direct integration with official Art Blocks GraphQL API and token endpoints
- **Live Generator Display**: Uses Art Blocks' generator URLs to display actual generative art in real-time
- **Selection-based Slideshows**: Users can build custom slideshows by selecting artists, projects, collectors, or individual tokens
- **Responsive Design**: Works across desktop and mobile with careful attention to full-screen experiences

### Data Flow
1. User searches via homepage or search page
2. Results fetched from Art Blocks GraphQL API
3. Users build selections (stored in localStorage as cart)
4. Slideshow resolves selections to token IDs via `resolveSelectionTokenIds()`
5. Player fetches live generator URLs and displays art in iframes

### URL Parameters (Slideshow)
- `selection`: Serialized selection items (type:value pairs)
- `duration`: Slide duration in seconds
- `autoPlay`: Enable auto-advance
- `showInfo`: Show/hide information sidebar
- `randomOrder`: Randomize slide order
- `showBorder`: Add decorative border around art

## TypeScript Configuration
- Uses Next.js 15 with React 19
- Path mapping: `@/*` points to project root
- Strict mode enabled with incremental compilation

## Styling Conventions
- Minimal, clean aesthetic inspired by gallery spaces
- Consistent use of `font-light` for typography
- `rounded-none` for sharp, gallery-like edges
- Neutral color palette (grays and whites)