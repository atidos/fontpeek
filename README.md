# FontPeek

**Discover, preview, and download fonts from any webpage.**

FontPeek is a minimal, bold web tool that helps designers and developers find all fonts used on any website. Preview them instantly with custom text and download in your preferred format.

## Features

- 🔍 **URL Analysis** - Enter any URL to discover all fonts used on the page
- 👁️ **Live Preview** - See fonts with customizable sample text
- 🔄 **Format Conversion** - Download fonts in WOFF2, WOFF, TTF, or OTF formats
- ⬇️ **Instant Download** - No registration required

## Limitations

**Note:** Some websites may not work due to:
- **Bot Protection** - Sites using Cloudflare, Incapsula, or similar services block automated requests
- **JavaScript-Loaded Fonts** - Fonts loaded dynamically after page render may not be detected
- **CORS Restrictions** - Some sites may block cross-origin requests despite the proxy
- **Rate Limits** - Free CORS proxy has usage limits

For best results, try:
- Developer documentation sites
- Open-source project pages  
- Your own websites
- Sites without heavy bot protection

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **SEO**: react-helmet-async
- **Font Handling**: opentype.js, file-saver

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The development server runs on `http://localhost:5173` by default.

## Design System

FontPeek uses a minimal design language with:

- **Colors**: Black (#0a0a0a), White (#fafafa), Accent Orange (#ff3d00)
- **Typography**: Inter for UI, JetBrains Mono for code
- **Theme**: Straight lines, bold typography, light background

## Project Structure

```
src/
├── components/
│   ├── Header.tsx        # Navigation header
│   ├── Hero.tsx          # Landing section
│   ├── FontAnalyzer.tsx  # Main analysis tool
│   ├── FontCard.tsx      # Individual font display
│   ├── Features.tsx      # Feature grid
│   └── Footer.tsx        # Site footer
├── utils/
│   ├── fontExtractor.ts  # CSS/font parsing logic
│   └── fontConverter.ts  # Font download/conversion
├── types/
│   └── index.ts          # TypeScript interfaces
├── App.tsx               # Main app component
├── main.tsx              # Entry point
└── index.css             # Tailwind + custom styles
```

## Limitations

Due to browser security (CORS), direct URL analysis may not work for all websites. For full functionality, consider:

1. Using a backend proxy service
2. Building a browser extension
3. Installing fonts locally first

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with ❤️ for typography lovers.
