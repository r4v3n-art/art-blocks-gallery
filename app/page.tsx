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
      </div>
    </div>
  )
}
