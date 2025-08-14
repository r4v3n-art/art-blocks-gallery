"use client"

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react"
import { tokensByIdWithLiveView, parseSelection, resolveSelectionToTokenEntries, resolveSelectionTokenIds, getProjectInvocations, getArtistProjectsWithInvocations, type TokenEntry } from "@/lib/ab"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LoadingScreen } from "@/components/gallery/LoadingScreen"
import { GallerySidebar } from "@/components/gallery/GallerySidebar"
import { GalleryOverlayControls } from "@/components/gallery/GalleryOverlayControls"
import { ArtworkDisplay } from "@/components/gallery/ArtworkDisplay"
import { useKeyboardControls } from "@/hooks/useKeyboardControls"

const THEME_KEY = 'abg-theme'

type NFTMeta = {
  tokenId: string
  projectName?: string
  artist?: string
  contractAddress?: string
  generatorUrl: string
  imageUrl?: string
  owner?: string
  invocation?: number
  projectId?: string
  projectWebsite?: string
  artistAddress?: string
  projectSlug?: string
}

function GalleryPlayer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [showBorderOverride, setShowBorderOverride] = useState<boolean | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [userExitedFullscreen, setUserExitedFullscreen] = useState(false)
  
  // Progressive loading states
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0, percentage: 0 })
  const [canStartGallery, setCanStartGallery] = useState(false)
  const [loadingStartTime] = useState(Date.now())
  const [isLoadingComplete, setIsLoadingComplete] = useState(false)
  const [showDetailedProgress, setShowDetailedProgress] = useState(false)
  const [galleryEntries, setGalleryEntries] = useState<TokenEntry[]>([]) // Stable gallery array
  const [shuffledEntries, setShuffledEntries] = useState<TokenEntry[]>([]) // Pre-shuffled stable array
  const [totalTokenCount, setTotalTokenCount] = useState(0) // Track total expected tokens for large collections
  const galleryInitializedRef = useRef(false) // Track if gallery was initialized using ref to avoid stale closures
  const currentTokenIdRef = useRef<string | null>(null) // Track current token ID to preserve position during updates
  const lastLoadedCountRef = useRef(0) // Track the last loaded count to detect new entries
  
  // Duration state with exponential scale (5 seconds to 7 days)
  const [durationSliderValue, setDurationSliderValue] = useState(() => {
    const urlDuration = parseInt(searchParams.get('duration') || '5')
    // Convert duration to slider value (0-100 scale)
    return Math.round(Math.log(urlDuration / 5) / Math.log(604800 / 5) * 100)
  })
  
  // Convert slider value (0-100) to duration in seconds (5s to 7 days)
  const duration = useMemo(() => {
    const min = 5 // 5 seconds
    const max = 604800 // 7 days in seconds
    const factor = durationSliderValue / 100
    return Math.round(min * Math.pow(max / min, factor))
  }, [durationSliderValue])
  
  
  // Settings from URL params
  const autoPlay = searchParams.get('autoPlay') === 'true'
  const showInfo = searchParams.get('showInfo') === 'true'
  const initialRandomOrder = searchParams.get('randomOrder') === 'true'
  const showBorderFromUrl = searchParams.get('showBorder') !== 'false' // Default to true
  const startFullscreen = searchParams.get('fullscreen') !== 'false' // Default to true
  
  // Use override if set, otherwise use URL param
  const showBorder = showBorderOverride !== null ? showBorderOverride : showBorderFromUrl
  
  // Shuffle state (can be toggled during playback)
  const [isShuffled, setIsShuffled] = useState(initialRandomOrder)
  const tokenIdsParam = searchParams.get('tokens')

  // Theme toggle via keyboard
  const onToggleTheme = useCallback(() => {
    try {
      const root = document.documentElement
      const willBeDark = !root.classList.contains('dark')
      if (willBeDark) {
        root.classList.add('dark')
        localStorage.setItem(THEME_KEY, 'dark')
      } else {
        root.classList.remove('dark')
        localStorage.setItem(THEME_KEY, 'light')
      }
    } catch {}
  }, [])

  // New query param modes
  const selectionParam = searchParams.get('selection') || ''

  // Create shuffled entries only when slideshow entries are first set
  const createShuffledEntries = useCallback((Entries: TokenEntry[], shouldShuffle: boolean) => {
    const base = [...Entries]
    const shuffled = shouldShuffle ? base.sort(() => Math.random() - 0.5) : base
    setShuffledEntries(shuffled)
  }, [])

  useEffect(() => {
    let cancelled = false
    
    // Reset initialization state for new searches
    galleryInitializedRef.current = false
    lastLoadedCountRef.current = 0
    setCanStartGallery(false)
    setInitializing(true)
    
    async function load() {
      if (tokenIdsParam) {
        // Legacy mode: fetch metadata for token IDs
        const ids = tokenIdsParam.split(',').filter(Boolean)
        const entries = await tokensByIdWithLiveView(ids, 100000)
        if (cancelled) return
        const base = [...entries]
        const shuffled = initialRandomOrder ? base.sort(() => Math.random() - 0.5) : base
        
        setGalleryEntries(entries) // Set stable gallery entries
        setShuffledEntries(shuffled) // Set shuffled version once
        galleryInitializedRef.current = true // Mark as initialized
        setInitializing(false)
        setCanStartGallery(true)
        setIsLoadingComplete(true)
        return
      }
      if (selectionParam) {
        const items = parseSelection(selectionParam)
        
        // Check if this is a large collection or artist that should use lazy loading
        const isLargeCollection = items.some(item => 
          (item.type === 'project' && (
            item.value === 'Chromie Squiggle' || 
            item.value.includes('Chromie') ||
            item.value === 'Fidenza' ||
            item.value === 'Ringers'
          )) ||
          item.type === 'artist' // Always use lazy loading for artist selections
        )
        
        if (isLargeCollection) {
          // For large collections, get invocation count instead of all token IDs
          const allTokenIds: string[] = []
          let totalTokens = 0
          
          // Process each selection item
          for (const item of items) {
            if (item.type === 'project') {
              const info = await getProjectInvocations(item.value)
              if (info && info.projectId && info.contractAddress) {
                // Generate virtual token IDs for this project
                const projectNum = parseInt(info.projectId)
                const startId = projectNum * 1000000
                for (let i = 0; i < info.invocations; i++) {
                  allTokenIds.push(`${info.contractAddress}-${startId + i}`)
                }
                totalTokens += info.invocations
              } else {
                // Fallback: fetch actual IDs for this project if we can't generate them
                const projectIds = await resolveSelectionTokenIds([item], 100000)
                allTokenIds.push(...projectIds)
                totalTokens += projectIds.length
              }
            } else if (item.type === 'artist') {
              // For artists, get all their projects and generate token IDs
              const artistProjects = await getArtistProjectsWithInvocations(item.value)
              console.log(`Artist ${item.value} has ${artistProjects.length} projects with ${artistProjects.reduce((sum, p) => sum + p.invocations, 0)} total tokens`)
              
              for (const project of artistProjects) {
                if (project.projectId && project.contractAddress) {
                  // Generate virtual token IDs for this project
                  const projectNum = parseInt(project.projectId)
                  const startId = projectNum * 1000000
                  for (let i = 0; i < project.invocations; i++) {
                    allTokenIds.push(`${project.contractAddress}-${startId + i}`)
                  }
                  totalTokens += project.invocations
                } else {
                  // Fallback: fetch actual IDs for this project
                  const projectIds = await resolveSelectionTokenIds([{ type: 'project', value: project.name }], 100000)
                  allTokenIds.push(...projectIds)
                  totalTokens += projectIds.length
                }
              }
            } else {
              // For collector and token selections, fetch actual IDs
              const otherIds = await resolveSelectionTokenIds([item], 100000)
              allTokenIds.push(...otherIds)
              totalTokens += otherIds.length
            }
          }
          
          if (cancelled) return
          
          console.log(`Large collection with ${totalTokens} tokens - using just-in-time loading`)
          
          // Set the total token count for accurate display
          setTotalTokenCount(totalTokens)
          
          // Shuffle if needed
          const shuffled = initialRandomOrder 
            ? [...allTokenIds].sort(() => Math.random() - 0.5)
            : [...allTokenIds]
          
          // Store the full list of token IDs (just IDs, not metadata)
          // We'll use this to load metadata on-demand as user navigates
          const virtualTokenIds = shuffled
          
          // Only load metadata for the first few tokens to start immediately
          const WINDOW_SIZE = 3 // Current, next, previous
          const initialIds = virtualTokenIds.slice(0, Math.min(WINDOW_SIZE, virtualTokenIds.length))
          const initialEntries = await tokensByIdWithLiveView(initialIds, initialIds.length)
          
          if (cancelled) return
          
          // Create a sparse array with loaded entries at their positions
          // Fill the rest with placeholder entries that just have the token ID
          const sparseEntries: TokenEntry[] = virtualTokenIds.map((id) => {
            const loaded = initialEntries.find(e => {
              const entryId = e.contractAddress ? `${e.contractAddress}-${e.tokenId}` : e.tokenId
              return entryId === id
            })
            
            if (loaded) return loaded
            
            // Create placeholder entry with just the ID
            // Extract tokenId from the composite ID if needed
            const parts = id.split('-')
            const tokenId = parts.length > 1 ? parts[1] : id
            const contractAddress = parts.length > 1 ? parts[0] : undefined
            
            return {
              tokenId,
              contractAddress,
              generatorUrl: `https://generator.artblocks.io/${id}`,
              // Other fields will be loaded on-demand
            } as TokenEntry
          })
          
          setGalleryEntries(sparseEntries)
          setShuffledEntries(sparseEntries)
          galleryInitializedRef.current = true
          setCanStartGallery(true)
          setInitializing(false)
          setIsLoadingComplete(true) // Mark as complete since we're not loading everything
          
          // Store the virtual IDs for on-demand loading
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(window as any).__virtualTokenIds = virtualTokenIds
          
          return
        }
        
        // Use existing progressive loading for smaller collections
        const QUICK_START_THRESHOLD = 500 // Start gallery after 500 tokens
        
        const entries = await resolveSelectionToTokenEntries(
          items, 
          100000,
          (progress) => {
            setLoadingProgress(progress)
            
            if (!galleryInitializedRef.current) {
              // Initialize gallery when we have enough tokens OR when loading is complete
              if (progress.loaded >= QUICK_START_THRESHOLD || progress.loaded >= progress.total) {
                const base = [...progress.entries]
                const shuffled = initialRandomOrder ? base.sort(() => Math.random() - 0.5) : base
                
                setGalleryEntries(progress.entries)
                setShuffledEntries(shuffled)
                galleryInitializedRef.current = true
                lastLoadedCountRef.current = progress.entries.length
                setCanStartGallery(true)
                setInitializing(false)
              }
            } else if (progress.entries.length > lastLoadedCountRef.current) {
              // Automatically expand gallery with new entries as they load
              const currentToken = currentTokenIdRef.current
              
              setGalleryEntries(progress.entries)
              lastLoadedCountRef.current = progress.entries.length
              
              // Create new shuffled array preserving current position
              const newShuffledEntries = initialRandomOrder 
                ? [...progress.entries].sort(() => Math.random() - 0.5)
                : [...progress.entries]
              
              // Find current token in new array to preserve position
              if (currentToken) {
                const foundIndex = newShuffledEntries.findIndex(entry => entry.tokenId === currentToken)
                if (foundIndex !== -1) {
                  setShuffledEntries(newShuffledEntries)
                  setCurrentIndex(foundIndex)
                } else {
                  setShuffledEntries(newShuffledEntries)
                }
              } else {
                setShuffledEntries(newShuffledEntries)
              }
            }
            
            // Mark as complete when done
            if (progress.loaded >= progress.total) {
              setIsLoadingComplete(true)
            }
          },
          500 // Initial batch size
        )
        
        if (cancelled) return
        
        // Ensure we're ready even if threshold wasn't met (only if not already initialized)
        if (!galleryInitializedRef.current) {
          const base = [...entries]
          const shuffled = initialRandomOrder ? base.sort(() => Math.random() - 0.5) : base
          
          setGalleryEntries(entries) // Set final gallery entries
          setShuffledEntries(shuffled) // Create shuffled version once
          galleryInitializedRef.current = true // Mark as initialized
          setCanStartGallery(true)
          setInitializing(false)
        }
        
        setIsLoadingComplete(true)
        return
      }
      setGalleryEntries([])
      setShuffledEntries([])
      setInitializing(false)
      setCanStartGallery(true)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIdsParam, selectionParam])

  // Show detailed progress after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDetailedProgress(true)
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  const currentEntry = shuffledEntries[currentIndex]
  const nextEntry = shuffledEntries.length > 1 ? shuffledEntries[(currentIndex + 1) % shuffledEntries.length] : null
  const isSingleItem = shuffledEntries.length === 1
  
  // Keep track of current token ID for progressive loading
  useEffect(() => {
    if (currentEntry?.tokenId) {
      currentTokenIdRef.current = currentEntry.tokenId
    }
  }, [currentEntry])
  
  // Load metadata on-demand for large collections
  useEffect(() => {
    // Only do on-demand loading if we have virtual token IDs stored
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const virtualTokenIds = (window as any).__virtualTokenIds as string[] | undefined
    if (!virtualTokenIds || virtualTokenIds.length === 0) return
    
    // Determine which indices need loading
    const indicesToLoad: number[] = []
    const WINDOW_SIZE = 2 // Load current + next 2 and previous 2
    
    for (let offset = -WINDOW_SIZE; offset <= WINDOW_SIZE; offset++) {
      const idx = (currentIndex + offset + shuffledEntries.length) % shuffledEntries.length
      indicesToLoad.push(idx)
    }
    
    // Check which entries need their metadata loaded
    const idsToLoad: string[] = []
    const indexMap = new Map<string, number>()
    
    indicesToLoad.forEach(idx => {
      const entry = shuffledEntries[idx]
      if (entry && !entry.projectName) { // If projectName is missing, we haven't loaded metadata
        const id = entry.contractAddress ? `${entry.contractAddress}-${entry.tokenId}` : entry.tokenId
        idsToLoad.push(id)
        indexMap.set(id, idx)
      }
    })
    
    if (idsToLoad.length === 0) return
    
    // Load metadata for these tokens
    let cancelled = false
    ;(async () => {
      console.log(`Loading metadata for ${idsToLoad.length} tokens around index ${currentIndex}`)
      const loadedEntries = await tokensByIdWithLiveView(idsToLoad, idsToLoad.length)
      
      if (cancelled) return
      
      // Update the entries with loaded metadata
      setShuffledEntries(prev => {
        const updated = [...prev]
        loadedEntries.forEach(loaded => {
          const id = loaded.contractAddress ? `${loaded.contractAddress}-${loaded.tokenId}` : loaded.tokenId
          const idx = indexMap.get(id)
          if (idx !== undefined) {
            updated[idx] = loaded
          }
        })
        return updated
      })
      
      setGalleryEntries(prev => {
        const updated = [...prev]
        loadedEntries.forEach(loaded => {
          const id = loaded.contractAddress ? `${loaded.contractAddress}-${loaded.tokenId}` : loaded.tokenId
          const idx = indexMap.get(id)
          if (idx !== undefined) {
            updated[idx] = loaded
          }
        })
        return updated
      })
    })()
    
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, shuffledEntries.length]) // Re-run when current index changes

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

  const exitGallery = useCallback(() => {
    router.back()
  }, [router])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed)
  }, [sidebarCollapsed])

  const toggleShuffle = useCallback(() => {
    const newShuffled = !isShuffled
    setIsShuffled(newShuffled)
    
    // Re-create shuffled entries with new shuffle state
    createShuffledEntries(galleryEntries, newShuffled)
    
    // Reset to first item when toggling shuffle
    setCurrentIndex(0)
  }, [isShuffled, galleryEntries, createShuffledEntries])

  const toggleBorder = useCallback(() => {
    setShowBorderOverride(prev => prev === null ? !showBorderFromUrl : !prev)
  }, [showBorderFromUrl])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setUserExitedFullscreen(false) // Reset the flag when user manually enters fullscreen
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // Fullscreen API may not be supported or permission denied
    }
  }, [])

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen
      const nowFullscreen = !!document.fullscreenElement
      setIsFullscreen(nowFullscreen)
      
      // If we were in fullscreen and now we're not, the user manually exited
      if (wasFullscreen && !nowFullscreen) {
        setUserExitedFullscreen(true)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [isFullscreen])

  // Keyboard controls
  useKeyboardControls({
    onNext: isSingleItem ? undefined : nextSlide,
    onPrevious: isSingleItem ? undefined : prevSlide,
    onTogglePlayPause: isSingleItem ? undefined : togglePlayPause,
    onExit: exitGallery,
    onToggleSidebar: toggleSidebar,
    onToggleShuffle: isSingleItem ? undefined : toggleShuffle,
    onToggleBorder: toggleBorder,
    onToggleFullscreen: toggleFullscreen,
    onToggleTheme
  })

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
      projectId: currentEntry.projectId,
      projectWebsite: currentEntry.projectWebsite,
      artistAddress: currentEntry.artistAddress,
      projectSlug: currentEntry.projectSlug,
    }
  }, [currentEntry])

  // Convert next entry to NFTMeta format for preloading
  const nextNFT = useMemo<NFTMeta | null>(() => {
    if (!nextEntry) return null
    return {
      tokenId: nextEntry.tokenId,
      projectName: nextEntry.projectName,
      artist: nextEntry.artistName,
      contractAddress: nextEntry.contractAddress,
      generatorUrl: nextEntry.generatorUrl,
      imageUrl: nextEntry.imageUrl,
      owner: nextEntry.owner,
      invocation: nextEntry.invocation,
      projectId: nextEntry.projectId,
      projectWebsite: nextEntry.projectWebsite,
      artistAddress: nextEntry.artistAddress,
      projectSlug: nextEntry.projectSlug,
    }
  }, [nextEntry])

  // Auto-start playing once loaded
  useEffect(() => {
    if (currentNFT && !isPlaying && autoPlay) {
      setIsPlaying(true)
    }
  }, [currentNFT, autoPlay, isPlaying])
  
  // Auto-enter fullscreen on start if requested
  useEffect(() => {
    // Only auto-enter fullscreen if user hasn't manually exited
    if (currentNFT && startFullscreen && !isFullscreen && !document.fullscreenElement && !userExitedFullscreen) {
      // Small delay to ensure the page is fully loaded
      const timer = setTimeout(async () => {
        try {
          await document.documentElement.requestFullscreen()
        } catch (error) {
          console.log('Could not enter fullscreen automatically:', error)
        }
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [currentNFT, startFullscreen, isFullscreen, userExitedFullscreen])

  // Reset timer when duration changes
  useEffect(() => {
    if (isPlaying && autoPlay && !isSingleItem) {
      setTimeRemaining(duration)
    }
  }, [duration, isPlaying, autoPlay, isSingleItem])

  // Show loading screen
  if (initializing) {
    const isChromieSquiggle = selectionParam.includes('Chromie Squiggle')
    
    return (
      <LoadingScreen
        initializing={initializing}
        showDetailedProgress={showDetailedProgress}
        loadingProgress={loadingProgress}
        loadingStartTime={loadingStartTime}
        canStartGallery={canStartGallery}
        isChromieSquiggle={isChromieSquiggle}
        onStartNow={() => {
          setCanStartGallery(true)
          setInitializing(false)
        }}
      />
    )
  }

  // Show empty or loading states
  if (shuffledEntries.length === 0) {
    if (isLoadingComplete) {
      return (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl mb-4 font-light">No tokens to display</p>
            <Button variant="ghost" onClick={() => router.back()} className="font-light">← Back</Button>
          </div>
        </div>
      )
    }
    
    return (
      <LoadingScreen
        initializing={true}
        showDetailedProgress={showDetailedProgress}
        loadingProgress={loadingProgress}
        loadingStartTime={loadingStartTime}
        canStartGallery={false}
        isChromieSquiggle={false}
      />
    )
  }

  if (!currentNFT) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4 font-light">Loading token…</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
        </div>
      </div>
    )
  }


  return (
    <div className="fixed inset-0 overflow-hidden flex">
      {showInfo && !sidebarCollapsed && (
        <GallerySidebar
          currentNFT={currentNFT}
          currentIndex={currentIndex}
          shuffledEntries={shuffledEntries}
          totalTokenCount={totalTokenCount}
          isLoadingComplete={isLoadingComplete}
          loadingProgress={loadingProgress}
          isSingleItem={isSingleItem}
          autoPlay={autoPlay}
          isPlaying={isPlaying}
          isShuffled={isShuffled}
          timeRemaining={timeRemaining}
          duration={duration}
          durationSliderValue={durationSliderValue}
          onExit={exitGallery}
          onToggleSidebar={toggleSidebar}
          onPrevious={prevSlide}
          onNext={nextSlide}
          onTogglePlayPause={togglePlayPause}
          onToggleShuffle={toggleShuffle}
          onDurationChange={setDurationSliderValue}
        />
      )}

      <div 
        className={`flex-1 relative ${showBorder ? 'bg-gradient-to-br from-stone-50 to-stone-100' : 'bg-gray-100'}`}
        style={showBorder ? {
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        } : undefined}
      >
        <ArtworkDisplay
          currentNFT={currentNFT}
          nextNFT={nextNFT}
          showBorder={showBorder}
          isFullscreen={isFullscreen}
        />

        <GalleryOverlayControls
          showControls={showControls}
          currentNFT={currentNFT}
          currentIndex={currentIndex}
          shuffledEntries={shuffledEntries}
          isPlaying={isPlaying}
          isShuffled={isShuffled}
          isSingleItem={isSingleItem}
          autoPlay={autoPlay}
          duration={duration}
          timeRemaining={timeRemaining}
          sidebarCollapsed={sidebarCollapsed}
          showInfo={showInfo}
          isFullscreen={isFullscreen}
          onExit={exitGallery}
          onPrevious={prevSlide}
          onNext={nextSlide}
          onTogglePlayPause={togglePlayPause}
          onToggleShuffle={toggleShuffle}
          onToggleSidebar={toggleSidebar}
          onToggleFullscreen={toggleFullscreen}
        />

      </div>
    </div>
  )
}

export default function GalleryPlayerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GalleryPlayer />
    </Suspense>
  )
}
