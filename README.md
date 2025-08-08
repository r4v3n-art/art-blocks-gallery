# Art Blocks Gallery

A modern, immersive gallery and slideshow application for displaying Art Blocks generative art collections. Built with Next.js 15 and designed for collectors, artists, and enthusiasts who want to showcase generative art in a beautiful, full-screen experience.

## Features

### 🎨 **Immersive Slideshow Experience**
- Full-screen display of live Art Blocks generators
- Auto-advance with configurable timing (5 seconds to 7 days)
- Keyboard navigation and controls
- Optional decorative borders for gallery-style presentation
- Preloading for smooth transitions

### 🔍 **Comprehensive Search**
- Search by **Token ID**, **Artist**, **Collection**, or **Collector**
- Real-time results with infinite scrolling
- Shopping cart-style selection system for building custom slideshows
- ENS name support for collectors (e.g., search for "r4v3n.eth")

### 🏷️ **ENS Integration**
- Automatic ENS name resolution for all Ethereum addresses
- 24-hour caching for optimal performance
- Support for ENS names in collector searches
- Clean display of collector information

### 🔗 **Art Blocks Integration**
- Direct links to Art Blocks collection pages
- Artist profile integration
- Collector profile links
- Uses official Art Blocks GraphQL API and metadata

### ⌨️ **Keyboard Controls**
- `←/→` - Navigate slides
- `Space` - Play/pause slideshow
- `F` - Toggle fullscreen
- `Esc` - Exit slideshow
- `Cmd/Ctrl+I` - Toggle info sidebar
- `Cmd/Ctrl+Shift+S` - Toggle shuffle mode
- `Cmd/Ctrl+B` - Toggle decorative border

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/r4v3n-art/art-blocks-gallery.git
cd art-blocks-gallery

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Usage

### Creating a Slideshow

1. **Search** for content using the homepage search interface
2. **Select** individual tokens, entire collections, artists, or collectors
3. **Build** your selection using the shopping cart system
4. **Launch** the slideshow with your custom settings

### Slideshow Options

- **Duration**: Set how long each slide displays
- **Auto-play**: Enable automatic advancement
- **Random Order**: Shuffle the slideshow sequence
- **Show Info**: Display token metadata in sidebar
- **Show Border**: Add decorative gallery-style borders

## API Integration

This application integrates with:
- **Art Blocks GraphQL API**: For metadata and search functionality
- **Art Blocks Generator URLs**: For live generative art display
- **ENS Data API**: For Ethereum name resolution

No API keys required - uses public endpoints.

## Technology Stack

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **TypeScript**: Full type safety
- **Build Tool**: Turbopack for fast development
- **Deployment**: Optimized for Vercel

## Architecture

- **Clean Data Layer**: Centralized API management in `lib/ab.ts`
- **Performance Optimized**: Request caching, debounced searches, iframe preloading
- **Responsive Design**: Works across desktop and mobile devices
- **Accessibility**: Keyboard navigation and semantic HTML

## Contributing

This project welcomes contributions! Areas for enhancement:

- Additional Art Blocks ecosystem integrations
- Performance optimizations
- Mobile experience improvements
- New slideshow features

## License

MIT License - see LICENSE file for details.

## Credits

Created by [r4v3n](https://r4v3n.art/) for the Art Blocks community.

Built with the official [Art Blocks API](https://docs.artblocks.io/public-api-docs/) and [ENS Data](https://ensdata.net/) service.