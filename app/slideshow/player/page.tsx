"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { tokensByIdWithLiveView, parseSelection, resolveSelectionToTokenEntries, type TokenEntry } from "@/lib/ab"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipForward, SkipBack, X, Info, ChevronLeft, Shuffle } from 'lucide-react'
import { truncateEthAddress } from "@/lib/utils"

// Helper to detect if user is on Mac
const isMac = typeof window !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0

type NFTMeta = {
  tokenId: string
  projectName?: string
  artist?: string
  contractAddress?: string
  generatorUrl: string
  imageUrl?: string
  owner?: string
  invocation?: number
}

function SlideshowPlayer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [showBorderOverride, setShowBorderOverride] = useState<boolean | null>(null)
  
  // Settings from URL params
  const duration = parseInt(searchParams.get('duration') || '5')
  const autoPlay = searchParams.get('autoPlay') === 'true'
  const showInfo = searchParams.get('showInfo') === 'true'
  const initialRandomOrder = searchParams.get('randomOrder') === 'true'
  const showBorderFromUrl = searchParams.get('showBorder') === 'true'
  
  // Use override if set, otherwise use URL param
  const showBorder = showBorderOverride !== null ? showBorderOverride : showBorderFromUrl
  
  // Shuffle state (can be toggled during playback)
  const [isShuffled, setIsShuffled] = useState(initialRandomOrder)
  const tokenIdsParam = searchParams.get('tokens')
  const [tokenEntries, setTokenEntries] = useState<TokenEntry[]>([])

  // New query param modes
  const selectionParam = searchParams.get('selection') || ''

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (tokenIdsParam) {
        // Legacy mode: fetch metadata for token IDs
        const ids = tokenIdsParam.split(',').filter(Boolean)
        const entries = await tokensByIdWithLiveView(ids, 100000)
        if (cancelled) return
        setTokenEntries(entries)
        setInitializing(false)
        return
      }
      if (selectionParam) {
        const items = parseSelection(selectionParam)
        const entries = await resolveSelectionToTokenEntries(items, 100000)
        if (cancelled) return
        setTokenEntries(entries)
        setInitializing(false)
        return
      }
      setTokenEntries([])
      setInitializing(false)
    }
    load()
    return () => { cancelled = true }
  }, [tokenIdsParam, selectionParam])
  
  // Shuffle tokens if random order is enabled
  const shuffledEntries = useMemo(() => {
    if (!tokenEntries || tokenEntries.length === 0) return [] as TokenEntry[]
    const base = [...tokenEntries]
    return isShuffled ? base.sort(() => Math.random() - 0.5) : base
  }, [tokenEntries, isShuffled])

  const currentEntry = shuffledEntries[currentIndex]
  const isSingleItem = shuffledEntries.length === 1

  // Timer for auto-advance (only if more than 1 item)
  useEffect(() => {
    if (!isPlaying || !autoPlay || isSingleItem) return

    setTimeRemaining(duration)
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % shuffledEntries.length)
          return duration
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [currentIndex, isPlaying, autoPlay, duration, isSingleItem, shuffledEntries.length])

  // Hide controls after inactivity (when sidebar is collapsed or hidden)
  useEffect(() => {
    // Show controls always when sidebar is expanded, or when single item
    if ((showInfo && !sidebarCollapsed) || isSingleItem) {
      setShowControls(true)
      return
    }

    let timeout: NodeJS.Timeout
    
    const resetTimeout = () => {
      setShowControls(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => setShowControls(false), 3000)
    }

    const handleMouseMove = () => resetTimeout()
    
    resetTimeout()
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isSingleItem, showInfo, sidebarCollapsed])

  const nextSlide = useCallback(() => {
    if (isSingleItem) return
    setCurrentIndex((prev) => (prev + 1) % shuffledEntries.length)
  }, [shuffledEntries.length, isSingleItem])

  const prevSlide = useCallback(() => {
    if (isSingleItem) return
    setCurrentIndex((prev) => (prev - 1 + shuffledEntries.length) % shuffledEntries.length)
  }, [shuffledEntries.length, isSingleItem])

  const togglePlayPause = useCallback(() => {
    if (isSingleItem) return
    setIsPlaying(!isPlaying)
  }, [isPlaying, isSingleItem])

  const exitSlideshow = useCallback(() => {
    router.back()
  }, [router])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed)
  }, [sidebarCollapsed])

  const toggleShuffle = useCallback(() => {
    setIsShuffled(!isShuffled)
    // Reset to first item when toggling shuffle
    setCurrentIndex(0)
  }, [isShuffled])

  const toggleBorder = useCallback(() => {
    setShowBorderOverride(prev => prev === null ? !showBorderFromUrl : !prev)
  }, [showBorderFromUrl])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          if (!isSingleItem) nextSlide()
          break
        case 'ArrowLeft':
          if (!isSingleItem) prevSlide()
          break
        case ' ':
          e.preventDefault()
          if (!isSingleItem) togglePlayPause()
          break
        case 'Escape':
          exitSlideshow()
          break
        case 'i':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            toggleSidebar()
          }
          break
        case 's':
        case 'S':
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && !isSingleItem) {
            e.preventDefault()
            toggleShuffle()
          }
          break
        case 'b':
        case 'B':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            toggleBorder()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [nextSlide, prevSlide, togglePlayPause, exitSlideshow, toggleSidebar, toggleShuffle, toggleBorder, isSingleItem])

  // Convert current entry to NFTMeta format
  const currentNFT = useMemo<NFTMeta | null>(() => {
    if (!currentEntry) return null
    return {
      tokenId: currentEntry.tokenId,
      projectName: currentEntry.projectName,
      artist: currentEntry.artistName,
      contractAddress: currentEntry.contractAddress,
      generatorUrl: currentEntry.generatorUrl,
      imageUrl: currentEntry.imageUrl,
      owner: currentEntry.owner,
      invocation: currentEntry.invocation,
    }
  }, [currentEntry])

  // Auto-start playing once loaded
  useEffect(() => {
    if (currentNFT && !isPlaying && autoPlay) {
      setIsPlaying(true)
    }
  }, [currentNFT, autoPlay, isPlaying])

  // When initializing, show a full-screen spinner before starting
  if (initializing) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-gray-900 text-center">
          <p className="text-xl mb-4 font-light">Loading slideshow…</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (shuffledEntries.length === 0) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-gray-900 text-center">
          <p className="text-xl mb-4 font-light">No tokens to display</p>
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 font-light">← Back</Button>
        </div>
      </div>
    )
  }

  if (!currentNFT) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-gray-900 text-center">
          <p className="text-xl mb-4 font-light">Loading token…</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    )
  }


  return (
    <div className="fixed inset-0 bg-white overflow-hidden flex">
      {/* Information Sidebar - Completely hidden when collapsed */}
      {showInfo && !sidebarCollapsed && (
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Sidebar Header with Toggle */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={exitSlideshow}
              className="text-gray-600 hover:text-gray-900 font-light"
            >
              ← Exit Slideshow
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-gray-600 hover:text-gray-900"
              title="Hide sidebar (⌘I)"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Token Information */}
          <div className="p-6 flex-1">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-light text-gray-900 mb-2">
                      {currentNFT.projectName}
                    </h2>
                    <p className="text-gray-600 font-light text-lg mb-4">
                      {currentNFT.artist}
                    </p>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500 font-mono">
                        #{currentNFT.invocation ?? currentNFT.tokenId}
                      </div>
                      {currentNFT.owner && (
                        <div className="text-sm text-gray-500">
                          <span className="font-light">Collected by </span>
                          <span className="font-mono">{truncateEthAddress(currentNFT.owner)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slide Counter - Only show if more than 1 item */}
                  {!isSingleItem && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600 font-light">
                        Slide {currentIndex + 1} of {shuffledEntries.length}
                      </div>
                    </div>
                  )}

                  {/* Timer - Only show if more than 1 item and autoplay is on */}
                  {!isSingleItem && autoPlay && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600 font-light mb-2">
                        {isPlaying ? `Next in ${timeRemaining}s` : 'Paused'}
                      </div>
                      <div className="w-full bg-gray-200 h-1">
                        <div 
                          className="h-full bg-gray-900 transition-all duration-1000 ease-linear"
                          style={{ 
                            width: `${((duration - timeRemaining) / duration) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Keyboard Shortcuts */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-light text-gray-900 mb-3">Controls</h3>
                    <div className="space-y-2 text-xs">
                      {!isSingleItem && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Next</span>
                            <kbd className="px-2 py-1 bg-gray-200 text-gray-700 font-mono">→</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Previous</span>
                            <kbd className="px-2 py-1 bg-gray-200 text-gray-700 font-mono">←</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Play/Pause</span>
                            <kbd className="px-2 py-1 bg-gray-200 text-gray-700 font-mono">Space</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Toggle Shuffle</span>
                            <kbd className="px-2 py-1 bg-gray-200 text-gray-700 font-mono">{isMac ? '⌘⇧S' : 'Ctrl+Shift+S'}</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 font-light">Toggle Border</span>
                            <kbd className="px-2 py-1 bg-gray-200 text-gray-700 font-mono">{isMac ? '⌘B' : 'Ctrl+B'}</kbd>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-light">Toggle Info</span>
                        <kbd className="px-2 py-1 bg-gray-200 text-gray-700 font-mono">{isMac ? '⌘I' : 'Ctrl+I'}</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-light">Exit</span>
                        <kbd className="px-2 py-1 bg-gray-200 text-gray-700 font-mono">Esc</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls in Sidebar - Only show if more than 1 item */}
              {!isSingleItem && (
                <div className="p-6 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevSlide}
                      className="text-gray-900 hover:bg-gray-200"
                    >
                      <SkipBack className="w-5 h-5" />
                    </Button>
                  
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlayPause}
                      className="text-gray-900 hover:bg-gray-200"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                  
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextSlide}
                      className="text-gray-900 hover:bg-gray-200"
                    >
                      <SkipForward className="w-5 h-5" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleShuffle}
                      className={`${isShuffled ? 'text-gray-900 bg-gray-200' : 'text-gray-900'} hover:bg-gray-200 ml-2`}
                      title={isShuffled ? "Shuffle is on" : "Shuffle is off"}
                    >
                      <Shuffle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}
        </div>
      )}

      {/* Main Art Display Area */}
      <div 
        className={`flex-1 relative ${showBorder ? 'bg-gradient-to-br from-stone-50 to-stone-100' : 'bg-gray-100'}`}
        style={showBorder ? {
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        } : undefined}
      >
        {/* Art Blocks Render Area with Optional Border */}
        <div className={`absolute inset-0 flex items-center justify-center ${showBorder ? 'p-10' : ''}`}>
          <div className="w-full h-full max-w-none max-h-none">
            {/* Artwork recessed into matte */}
            <iframe
              key={`${currentNFT.tokenId}-${showBorder}`} // Force re-render when token OR border changes
              src={currentNFT.generatorUrl}
              className="w-full h-full border-0"
              style={showBorder ? {
                boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.15), inset -1px -1px 3px rgba(255,255,255,0.7)'
              } : undefined}
              title={`${currentNFT.projectName} #${currentNFT.tokenId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="lazy"
            />
          </div>
        </div>

        {/* Overlay Controls (when sidebar is hidden or collapsed) */}
        {(!showInfo || sidebarCollapsed) && (
          <>
            {/* Progress Bar - Only show with overlay and autoplay */}
            {autoPlay && isPlaying && (
              <div className={`absolute top-0 left-0 w-full h-0.5 bg-gray-200 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div 
                  className="h-full bg-gray-900 transition-all duration-1000 ease-linear"
                  style={{ 
                    width: `${((duration - timeRemaining) / duration) * 100}%` 
                  }}
                />
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={exitSlideshow}
              className={`absolute top-8 right-8 text-gray-900 hover:bg-gray-100 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-20`}
            >
              <X className="w-5 h-5" />
            </Button>

            <div className={`absolute top-8 left-8 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-20`}>
              <div className="bg-white/95 backdrop-blur-sm border border-gray-200 px-4 py-3 max-w-sm">
                {showInfo && sidebarCollapsed ? (
                  <div className="space-y-2">
                    <div className="text-gray-900 font-light text-lg">
                      {currentNFT.projectName}
                    </div>
                    <div className="text-gray-600 font-light text-sm">
                      {currentNFT.artist}
                    </div>
                    <div className="text-gray-500 font-mono text-xs">
                      #{currentNFT.invocation ?? currentNFT.tokenId}
                    </div>
                    {currentNFT.owner && (
                      <div className="text-gray-500 text-xs">
                        <span className="font-light">Collected by </span>
                        <span className="font-mono">{truncateEthAddress(currentNFT.owner)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-900 font-light text-sm">
                    {currentIndex + 1} / {shuffledEntries.length}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-20`}>
              <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-6">
                <div className="flex items-center justify-center gap-4">
                  {!isSingleItem && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={prevSlide}
                        className="text-gray-900 hover:bg-gray-100"
                      >
                        <SkipBack className="w-5 h-5" />
                      </Button>
                    
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlayPause}
                        className="text-gray-900 hover:bg-gray-100"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                    
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextSlide}
                        className="text-gray-900 hover:bg-gray-100"
                      >
                        <SkipForward className="w-5 h-5" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleShuffle}
                        className={`${isShuffled ? 'bg-gray-200' : ''} text-gray-900 hover:bg-gray-100 ml-2`}
                        title={isShuffled ? "Shuffle is on" : "Shuffle is off"}
                      >
                        <Shuffle className="w-5 h-5" />
                      </Button>
                    </>
                  )}

                  {showInfo && sidebarCollapsed && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleSidebar}
                      className="text-gray-900 hover:bg-gray-100 ml-4"
                      title="Show sidebar (⌘I)"
                    >
                      <Info className="w-5 h-5" />
                    </Button>
                  )}

                  {/* Exit button when no other controls shown */}
                  {isSingleItem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={exitSlideshow}
                      className="text-gray-900 hover:bg-gray-100"
                      title="Exit slideshow"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                
                {!isSingleItem && (
                  <div className="text-center mt-3 space-y-1">
                    <div className="text-gray-600 text-sm font-light">
                      Slide {currentIndex + 1} of {shuffledEntries.length}
                    </div>
                    {autoPlay && (
                      <div className="text-gray-600 text-sm font-light">
                        {isPlaying ? `Next in ${timeRemaining}s` : 'Paused'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

export default function SlideshowPlayerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SlideshowPlayer />
    </Suspense>
  )
}
