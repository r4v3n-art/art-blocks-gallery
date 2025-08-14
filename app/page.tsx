"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { serializeSelection } from "@/lib/ab"
import { Play } from "lucide-react"

export default function HomePage() {
  const [searchType, setSearchType] = useState("collector")
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    
    const params = new URLSearchParams({
      type: searchType,
      query: searchQuery.trim()
    })
    
    router.push(`/search?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const startCollectionSlideshow = (collectionName: string, duration = 60) => {
    const selection = [{ type: 'project' as const, value: collectionName }]
    const selectionParam = serializeSelection(selection)
    const qs = new URLSearchParams({
      selection: selectionParam,
      duration: duration.toString(),
      autoPlay: 'true',
      showInfo: 'true',
      randomOrder: 'true',
      showBorder: 'true',
      fullscreen: 'true',
    })
    router.push(`/gallery/player?${qs.toString()}`)
  }

  const featuredCollections = [
    {
      name: "Chromie Squiggle",
      artist: "Snowfro",
      description: "Simple and easily identifiable, each squiggle embodies the soul of the Art Blocks platform.",
      tokenCount: "10,000",
      imageUrl: "https://media.artblocks.io/0.png",
      projectUrl: "https://www.artblocks.io/collection/chromie-squiggle"
    },
    {
      name: "Endless Nameless",
      artist: "Rafaël Rozendaal",
      description: "Endless Nameless is an exploration of composition. We start with a square. The square is divided into sections. The sections are filled with color pairs. Sometimes all colors are used. Sometimes fewer colors are used.",
      tokenCount: "1,000",
      imageUrl: "https://media.artblocks.io/120000735.png",
      projectUrl: "https://www.artblocks.io/collection/endless-nameless"
    },
    {
      name: "Marfa: Middle of Somewhere",
      artist: "r4v3n x Brett Sylvia",
      description: "\"Marfa: Middle of Somewhere\" is a collaborative exploration by siblings Brett Sylvia and r4v3n, capturing the duality of Marfa's identity.",
      tokenCount: "73",
      imageUrl: "https://media-proxy.artblocks.io/0xd9b7ec74c06c558a59afde6a16e614950730f44d/0.png",
      projectUrl: "https://www.artblocks.io/collection/marfa-middle-of-somewhere-by-r4v3n-x-brett-sylvia"
    }
  ]

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-light mb-4 tracking-tight">
            Art Blocks Gallery
          </h1>
          <p className="text-lg font-light">
            The best way to display your generative art collection
          </p>
        </div>

        {/* Compact Search Interface */}
                  <div className="max-w-3xl mx-auto mb-16">
            <div className="flex gap-3">
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger className="w-40 rounded-none font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">Token URL</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="project">Collection</SelectItem>
                  <SelectItem value="collector">Collector</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  searchType === 'token' ? 'Paste Art Blocks token URL' :
                  searchType === 'artist' ? 'Enter artist name' :
                  searchType === 'project' ? 'Enter collection name' :
                  'Enter collector name or address'
                }
                className="flex-1 rounded-none font-light"
              />
              <Button 
                onClick={handleSearch} 
                className="rounded-none font-light px-8"
                disabled={!searchQuery.trim()}
              >
                Search
              </Button>
            </div>
          </div>

        {/* Featured Collections */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-gray-600 font-light text-lg">or jump into a featured collection</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredCollections.map((collection) => (
              <div key={collection.name} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={collection.imageUrl}
                    alt={`${collection.name} preview`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-light text-gray-900 mb-1">
                    {collection.name}
                  </h3>
                  <p className="text-sm text-gray-600 font-light mb-3">
                    by {collection.artist}
                  </p>
                  <p className="text-sm text-gray-600 font-light mb-4 line-clamp-2">
                    {collection.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500 font-light">
                      {collection.tokenCount} pieces
                    </span>
                    <a 
                      href={collection.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-600 hover:text-gray-900 underline transition-colors"
                    >
                      View on Art Blocks
                    </a>
                  </div>
                  <Button 
                    onClick={() => startCollectionSlideshow(collection.name)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-none font-light"
                  >
                    <Play className="w-4 h-4" />
                    Start Gallery
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-20 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <a 
              href="https://github.com/r4v3n-art/art-blocks-gallery" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm font-light rounded-none hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>
          <p className="text-sm text-gray-500 font-light">
            thrown together by{' '}
            <a 
              href="https://r4v3n.art/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 transition-colors underline"
            >
              r4v3n
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}