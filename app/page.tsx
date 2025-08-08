"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-light text-gray-900 mb-4 tracking-tight">
            Art Blocks Gallery
          </h1>
          <p className="text-lg text-gray-600 font-light">
            The best way to display your generative art collection
          </p>
        </div>

        {/* Search Interface */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-none shadow-sm">
            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-full border-gray-300 rounded-none text-gray-900 font-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="token">Token ID</SelectItem>
                      <SelectItem value="artist">Artist</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="collector">Collector</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      searchType === 'token' ? 'Enter token ID' :
                      searchType === 'artist' ? 'Enter artist name' :
                      searchType === 'project' ? 'Enter project name' :
                      'Enter collector name or address'
                    }
                    className="w-full border-gray-300 rounded-none text-gray-900 font-light text-lg py-3"
                  />
                </div>

                <Button 
                  onClick={handleSearch} 
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-none font-light text-lg py-3"
                  disabled={!searchQuery.trim()}
                >
                  Search
                </Button>
              </div>
            </div>
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
